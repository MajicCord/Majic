/*
 * Majic — Discord injector
 */

import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PATCHER = join(ROOT, "dist", "patcher.js");

const BRANCHES = {
    stable: { dir: "Discord", name: "discord" },
    ptb: { dir: "DiscordPTB", name: "discordptb" },
    canary: { dir: "DiscordCanary", name: "discordcanary" }
};

const args = process.argv.slice(2);
const uninject = args.includes("--uninject");
const branchKey = args.find(a => !a.startsWith("--")) ?? "stable";
const branch = BRANCHES[branchKey];

if (process.platform !== "win32") fail("Only Windows is supported for now.");
if (!branch) fail(`Unknown branch: ${branchKey} (stable, ptb, canary)`);

const base = join(process.env.LOCALAPPDATA ?? "", branch.dir);
if (!existsSync(base)) fail(`Discord ${branchKey} not found in ${base}`);

const appDirs = readdirSync(base)
    .filter(d => /^app-\d+\.\d+\.\d+$/.test(d))
    .sort((a, b) => compareVersions(a.slice(4), b.slice(4)));
if (!appDirs.length) fail(`No app-* folder in ${base}`);

const resources = join(base, appDirs.at(-1), "resources");
const appDir = join(resources, "app");

if (uninject) {
    if (!existsSync(appDir)) fail("Majic is not injected.");
    rmSync(appDir, { recursive: true, force: true });
    console.log(`Majic removed from ${resources}`);
} else {
    if (!existsSync(PATCHER)) fail("dist/patcher.js not found: run `pnpm build` first.");
    if (!existsSync(join(resources, "app.asar"))) fail(`app.asar not found in ${resources}`);

    mkdirSync(appDir, { recursive: true });
    writeFileSync(
        join(appDir, "index.js"),
        `process.env.MAJIC_INJECTOR_DIR = __dirname;\nrequire(${JSON.stringify(PATCHER)});\n`
    );
    writeFileSync(join(appDir, "package.json"), JSON.stringify({ name: branch.name, main: "index.js" }, null, 4));
    console.log(`Majic injected into ${resources}`);
}
console.log("Fully restart Discord (right-click the tray icon -> Quit) to apply.");

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
