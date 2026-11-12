/*
 * Majic — runs the reporter build on Discord's web client and prints a report
 */

import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = resolve(import.meta.dirname, "..");
const CANARY = process.env.USE_CANARY === "true";
const BRANCH = CANARY ? "Canary" : "Stable";
const TIMEOUT = Number(process.env.REPORT_TIMEOUT ?? 8 * 60_000);

const chromium = process.env.CHROMIUM_BIN;
if (!chromium) {
    console.error("Missing environment variable CHROMIUM_BIN");
    process.exit(1);
}

const stderr = (...args) => console.error(`${BRANCH.toUpperCase()} ---`, ...args);

const report = {
    badPatches: [],
    pendingPatches: [],
    failedSearches: [],
    discordErrors: [],
    loadedChunks: 0,
    duration: 0
};

const PATCH_PROBLEM = /Patch by (.+?) (had no effect|errored) \(module (.+?)\): (.+)/;
const IGNORED_ERRORS = [
    /^Failed to load resource/,
    /KeybindStore: Looking for callback action/,
    /Client revision number is null/,
    /Downloading the full bad domains file/,
    /\[GatewaySocket\].{0,110}Cannot access '/,
    /Attempting to set fast connect zstd when unsupported/
];

const codeBlock = text => "```\n" + String(text).replace(/```/g, "`​`​`") + "\n```";

function printReport() {
    const lines = [`# Majic Report (${BRANCH})`, ""];

    lines.push(`Loaded ${report.loadedChunks} chunks in ${Math.round(report.duration / 1000)}s.`, "");

    lines.push(`## Bad Patches (${report.badPatches.length + report.pendingPatches.length})`);
    for (const patch of report.pendingPatches) lines.push(`- ${patch.plugin} (found no module)`, `  ${codeBlock(patch.find)}`);
    for (const patch of report.badPatches) {
        lines.push(`- ${patch.plugin} (${patch.type}, module \`${patch.id}\`)`, `  ${codeBlock(patch.match)}`);
        if (patch.error) lines.push(`  Error: ${codeBlock(patch.error)}`);
    }
    lines.push("");

    lines.push(`## Bad Webpack Finds (${report.failedSearches.length})`);
    for (const search of report.failedSearches) lines.push(`- ${codeBlock(`${search.method}(${search.args}) ${search.error ?? ""}`)}`);
    lines.push("");

    lines.push(`## Discord Errors (${report.discordErrors.length})`);
    for (const error of report.discordErrors) lines.push(`- ${codeBlock(error)}`);

    console.log(lines.join("\n"));
}

async function postWebhook() {
    const url = process.env.WEBHOOK_URL;
    if (!url) return;

    const listEmbed = (title, entries) => entries.length && {
        title,
        color: 0xff2d55,
        description: entries.join("\n").slice(0, 4000)
    };

    const embeds = [
        { title: `Discord ${BRANCH}`, description: `${report.loadedChunks} chunks, ${Math.round(report.duration / 1000)}s`, color: CANARY ? 0xfbb642 : 0x5865f2 },
        listEmbed("Bad Patches", [
            ...report.pendingPatches.map(p => `**${p.plugin}** found no module: \`${p.find}\``),
            ...report.badPatches.map(p => `**${p.plugin}** ${p.type} (module \`${p.id}\`): \`${p.match}\``)
        ]),
        listEmbed("Bad Webpack Finds", report.failedSearches.map(s => `\`${s.method}(${s.args})\` ${s.error ?? ""}`)),
        listEmbed("Discord Errors", report.discordErrors.map(e => `\`${e.slice(0, 300)}\``))
    ].filter(Boolean);

    if (embeds.length === 1) embeds.push({ title: "No issues found", description: "Every patch and lookup found its target.", color: 0x23a55a });

    const body = JSON.stringify({ username: `Majic Reporter (${BRANCH})`, embeds });
    const headers = { "Content-Type": "application/json" };
    if (process.env.WEBHOOK_SECRET) headers["X-Signature"] = "sha256=" + createHmac("sha256", process.env.WEBHOOK_SECRET).update(body).digest("hex");

    const res = await fetch(url, { method: "POST", headers, body }).catch(err => ({ ok: false, status: String(err) }));
    stderr(res.ok ? "Posted to webhook" : `Webhook failed: ${res.status}`);
}

const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromium,
    args: ["--no-sandbox"]
});

const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36");
await page.setBypassCSP(true);

let finish;
const finished = new Promise(resolveFinished => finish = resolveFinished);

async function readArgs(message) {
    return Promise.all(message.args().map(arg => arg.evaluate(value => value instanceof Error ? value.message : value).catch(() => undefined)));
}

page.on("console", async message => {
    const args = await readArgs(message);
    const [first] = args;

    if (first === "[MAJIC_REPORT]") {
        const result = JSON.parse(args[1]);
        report.pendingPatches = result.pendingPatches;
        report.failedSearches = result.failedSearches;
        report.loadedChunks = result.loadedChunks;
        report.duration = result.duration;
        return finish();
    }

    if (first === "[MAJIC_REPORT_ERROR]") {
        stderr("Reporter failed:", args[1]);
        report.discordErrors.push(`Reporter failed: ${args[1]}`);
        return finish();
    }

    if (typeof first === "string" && first.startsWith("%c Majic %c ")) {
        const text = args.slice(3).map(arg => typeof arg === "string" ? arg : JSON.stringify(arg)).join(" ");
        const problem = PATCH_PROBLEM.exec(text);
        if (problem) {
            const [, plugin, type, id, match] = problem;
            report.badPatches.push({ plugin, type, id, match });
            stderr(text);
        }
        return;
    }

    if (message.type() !== "error") return;
    const text = message.text();
    if (text && !IGNORED_ERRORS.some(pattern => pattern.test(text))) report.discordErrors.push(text);
});

page.on("pageerror", error => {
    const text = error?.message ?? String(error);
    if (!IGNORED_ERRORS.some(pattern => pattern.test(text))) report.discordErrors.push(text);
});

const reporterCode = readFileSync(join(ROOT, "dist", "reporter.js"), "utf-8");
await page.evaluateOnNewDocument(`if (location.host.endsWith("discord.com")) {\n${reporterCode}\n}`);

stderr("Opening Discord...");
await page.goto(CANARY ? "https://canary.discord.com/login" : "https://discord.com/login", { waitUntil: "domcontentloaded" });

const timeout = setTimeout(() => {
    stderr(`Timed out after ${TIMEOUT / 1000}s`);
    report.discordErrors.push("Reporter timed out");
    finish();
}, TIMEOUT);

await finished;
clearTimeout(timeout);

printReport();
await postWebhook();
await browser.close();

if (report.badPatches.length || report.pendingPatches.length || report.failedSearches.length) process.exitCode = 1;
