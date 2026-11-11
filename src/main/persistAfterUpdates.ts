/*
 * Majic — reinjection after Discord host updates
 * Adapted from Vencord, GPL-3.0-or-later
 */

import { app } from "electron";
import { EventEmitter } from "node:events";
import { basename, dirname, join } from "node:path";
import { copyFileSync, existsSync, readdirSync, renameSync } from "original-fs";

const APP_DIR = /^app-\d+\.\d+\.\d+$/;

function isNewer(candidate: string, current: string) {
    const a = candidate.slice(4).split(".").map(Number);
    const b = current.slice(4).split(".").map(Number);
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
}

export function patchLatest(execPath = process.execPath) {
    if (process.env.MAJIC_DISABLE_AUTO_REINJECT) return;

    try {
        const currentDir = dirname(execPath);
        const current = basename(currentDir);
        const root = dirname(currentDir);

        const latest = readdirSync(root)
            .filter(dir => APP_DIR.test(dir))
            .reduce((best, dir) => (isNewer(dir, best) ? dir : best), current);
        if (latest === current) return;

        const stub = join(currentDir, "resources", "app.asar");
        const resources = join(root, latest, "resources");
        const appAsar = join(resources, "app.asar");
        const originalAsar = join(resources, "_app.asar");
        if (!existsSync(stub) || !existsSync(appAsar) || existsSync(originalAsar)) return;

        console.log(`[Majic] Discord updated (${current} -> ${latest}), reinjecting`);
        renameSync(appAsar, originalAsar);
        copyFileSync(stub, appAsar);
    } catch (err) {
        console.error("[Majic] Failed to reinject after the Discord update", err);
    }
}

export function persistAfterUpdates() {
    if (process.platform !== "win32" && process.platform !== "linux") return;

    EventEmitter.prototype.emit = new Proxy(EventEmitter.prototype.emit, {
        apply(target, thisArg, args) {
            if (args[0] === "host-updated") patchLatest();
            return Reflect.apply(target, thisArg, args);
        }
    });

    app.on("before-quit", () => patchLatest());
}
