/*
 * Majic — Discord injector
 */

import { createPackage, extractFile } from "@electron/asar";
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PATCHER = join(ROOT, "dist", "patcher.js");

const BRANCHES = {
    stable: { dir: "Discord", name: "discord" },
    ptb: { dir: "DiscordPTB", name: "discordptb" },
    canary: { dir: "DiscordCanary", name: "discordcanary" },
    development: { dir: "DiscordDevelopment", name: "discorddevelopment" }
};

const args = process.argv.slice(2);
const uninject = args.includes("--uninject");
const branchKey = args.find(a => !a.startsWith("--")) ?? "stable";
const branch = BRANCHES[branchKey];

if (process.platform !== "win32") fail("Only Windows is supported for now.");
if (!branch) fail(`Unknown branch: ${branchKey} (stable, ptb, canary, development)`);

const base = join(process.env.LOCALAPPDATA ?? "", branch.dir);
if (!existsSync(base)) fail(`Discord ${branchKey} not found in ${base}`);

const appDirs = readdirSync(base)
    .filter(d => /^app-\d+\.\d+\.\d+$/.test(d))
    .sort((a, b) => compareVersions(a.slice(4), b.slice(4)));
if (!appDirs.length) fail(`No app-* folder in ${base}`);

const resources = join(base, appDirs.at(-1), "resources");
const appAsar = join(resources, "app.asar");
const originalAsar = join(resources, "_app.asar");

rmSync(join(resources, "app"), { recursive: true, force: true });

if (uninject) {
    if (!existsSync(originalAsar)) fail("Majic is not injected.");
    if (!isMajicStub(appAsar)) fail("app.asar was not created by Majic, refusing to touch it.");
    rmSync(appAsar);
    renameSync(originalAsar, appAsar);
    console.log(`Majic removed from ${resources}`);
} else {
    if (!existsSync(PATCHER)) fail("dist/patcher.js not found: run `pnpm build` first.");
    if (!existsSync(appAsar)) fail(`app.asar not found in ${resources}`);

    if (existsSync(originalAsar)) {
        if (!isMajicStub(appAsar)) fail("Another client mod is installed (_app.asar exists). Uninstall it first.");
    } else {
        renameSync(appAsar, originalAsar);
    }

    const stubDir = mkdtempSync(join(tmpdir(), "majic-"));
    writeFileSync(
        join(stubDir, "index.js"),
        `process.env.MAJIC_INJECTOR_DIR = __dirname;\nrequire(${JSON.stringify(PATCHER)});\n`
    );
    writeFileSync(join(stubDir, "package.json"), JSON.stringify({ name: branch.name, main: "index.js", majic: true }));
    await createPackage(stubDir, appAsar);
    rmSync(stubDir, { recursive: true, force: true });

    console.log(`Majic injected into ${resources}`);
}
console.log("Fully restart Discord (right-click the tray icon -> Quit) to apply.");

function isMajicStub(asarPath) {
    try {
        return JSON.parse(extractFile(asarPath, "package.json").toString()).majic === true;
    } catch {
        return false;
    }
}

function compareVersions(a, b) {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
    return 0;
}

function fail(msg) {
    console.error(`Error: ${msg}`);
    process.exit(1);
}
