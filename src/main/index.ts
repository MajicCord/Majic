/*
 * Majic — Electron main process patcher
 */

import { IpcEvents } from "@shared/IpcEvents";
import { onceDefined } from "@shared/onceDefined";
import electron, { app, ipcMain, session, type BrowserWindowConstructorOptions } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const IS_VANILLA = process.argv.includes("--vanilla");
const DIST_DIR = __dirname;

const injectorDir = process.env.MAJIC_INJECTOR_DIR;
if (!injectorDir) throw new Error("[Majic] MAJIC_INJECTOR_DIR is not set");

const asarPath = join(injectorDir, "..", "app.asar");
if (!existsSync(asarPath)) throw new Error(`[Majic] app.asar not found: ${asarPath}`);

if (IS_VANILLA) {
    console.log("[Majic] Running in vanilla mode, Majic is not loaded");
} else {
    console.log("[Majic] Patcher loaded");
    initMajic();
}

const discordPkg = JSON.parse(readFileSync(join(asarPath, "package.json"), "utf-8"));
const discordMain = join(asarPath, discordPkg.main ?? "index.js");

(app as typeof app & { setAppPath(p: string): void }).setAppPath(asarPath);
if (require.main) require.main.filename = discordMain;
require(discordMain);

function initMajic() {
    const DATA_DIR = join(app.getPath("appData"), "Majic");
    const SETTINGS_FILE = join(DATA_DIR, "settings.json");
    const QUICK_CSS_FILE = join(DATA_DIR, "quickCss.css");

    mkdirSync(DATA_DIR, { recursive: true });

    const readText = (file: string, fallback: string) => {
        try {
            return readFileSync(file, "utf-8");
        } catch {
            return fallback;
        }
    };

    ipcMain.on(IpcEvents.GET_SETTINGS, e => {
        e.returnValue = readText(SETTINGS_FILE, "{}");
    });
    ipcMain.handle(IpcEvents.SET_SETTINGS, (_, json: string) => {
        writeFileSync(SETTINGS_FILE, json);
    });
    ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readText(QUICK_CSS_FILE, ""));
    ipcMain.on(IpcEvents.GET_RENDERER_CODE, e => {
        e.returnValue = readFileSync(join(DIST_DIR, "renderer.js"), "utf-8");
    });

    class BrowserWindow extends electron.BrowserWindow {
        constructor(options: BrowserWindowConstructorOptions = {}) {
            if (options.webPreferences?.preload && options.title) {
                const originalPreload = options.webPreferences.preload;
                options.webPreferences.preload = join(DIST_DIR, "preload.js");
                options.webPreferences.sandbox = false;
                process.env.MAJIC_DISCORD_PRELOAD = originalPreload;
            }
            super(options);
        }
    }

    Object.assign(BrowserWindow, electron.BrowserWindow);
    Object.defineProperty(BrowserWindow, "name", { value: "BrowserWindow", configurable: true });

    const electronPath = require.resolve("electron");
    const cached = require.cache[electronPath]!;
    delete (cached as { exports?: unknown }).exports;
    cached.exports = { ...electron, BrowserWindow };

    onceDefined(global, "appSettings", (settings: { set(key: string, value: unknown): void }) => {
        settings.set("DANGEROUS_ENABLE_DEVTOOLS_ONLY_ENABLE_IF_YOU_KNOW_WHAT_YOURE_DOING", true);
    });

    app.whenReady().then(() => {
        session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders }, cb) => {
            if (responseHeaders) {
                for (const header of Object.keys(responseHeaders)) {
                    if (header.toLowerCase().startsWith("content-security-policy")) {
                        delete responseHeaders[header];
                    }
                }
            }
            cb({ cancel: false, responseHeaders });
        });
    });
}
