/*
 * Majic — reinjection after Discord host updates
 */

import { app } from "electron";
import { EventEmitter } from "node:events";
import { basename, dirname, join } from "node:path";
import { copyFileSync, existsSync, readdirSync, renameSync } from "original-fs";

const versionOf = (dir: string) => /^app-(\d+)\.(\d+)\.(\d+)$/.exec(dir)?.slice(1).map(Number);

function compareVersions(a: number[], b: number[]) {
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

function newestAppDir(root: string) {
    return readdirSync(root)
        .map(dir => ({ dir, version: versionOf(dir) }))
        .filter((entry): entry is { dir: string; version: number[] } => entry.version != null)
        .sort((a, b) => compareVersions(b.version, a.version))[0]?.dir;
}

export function patchLatest(execPath = process.execPath) {
    if (process.env.MAJIC_DISABLE_AUTO_REINJECT) return;

    try {
        const currentDir = dirname(execPath);
        const newest = newestAppDir(dirname(currentDir));
        if (!newest || newest === basename(currentDir)) return;

        const ourStub = join(currentDir, "resources", "app.asar");
        const target = join(dirname(currentDir), newest, "resources");
        const targetAsar = join(target, "app.asar");
        const targetOriginal = join(target, "_app.asar");

        if (!existsSync(ourStub) || !existsSync(targetAsar) || existsSync(targetOriginal)) return;

        renameSync(targetAsar, targetOriginal);
        copyFileSync(ourStub, targetAsar);
        console.log(`[Majic] Discord updated to ${newest}, Majic was reinjected`);
    } catch (err) {
        console.error("[Majic] Could not reinject after the Discord update", err);
    }
}

export function persistAfterUpdates() {
    if (process.platform !== "win32" && process.platform !== "linux") return;

    const emit = EventEmitter.prototype.emit;
    EventEmitter.prototype.emit = function (this: EventEmitter, event: string | symbol, ...args: unknown[]) {
        if (event === "host-updated") patchLatest();
        return emit.call(this, event, ...args);
    };

    app.on("before-quit", () => patchLatest());
}
