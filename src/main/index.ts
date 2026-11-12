/*
 * Majic — Electron main process patcher
 */

import { IpcEvents } from "@shared/IpcEvents";
import { onceDefined } from "@shared/onceDefined";
import { initPluginNatives } from "./ipcPlugins";
import { DATA_DIR, QUICK_CSS_FILE, RendererSettings } from "./settings";
import { initThemes } from "./themes";
import { initUpdater } from "./updater";
import { persistAfterUpdates } from "./persistAfterUpdates";
import electron, { app, ipcMain, Menu, session, shell, type BrowserWindowConstructorOptions } from "electron";
import { release } from "node:os";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const IS_VANILLA = process.argv.includes("--vanilla");
const DIST_DIR = __dirname;

const injectorDir = process.env.MAJIC_INJECTOR_DIR;
if (!injectorDir) throw new Error("[Majic] MAJIC_INJECTOR_DIR is not set");

const asarPath = join(injectorDir, "..", "_app.asar");
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
    persistAfterUpdates();
    initPluginNatives();
    initThemes();
    initUpdater();

    mkdirSync(DATA_DIR, { recursive: true });

    const readText = (file: string, fallback: string) => {
        try {
            return readFileSync(file, "utf-8");
        } catch {
            return fallback;
        }
    };

    ipcMain.on(IpcEvents.GET_SETTINGS, e => {
        e.returnValue = RendererSettings.raw;
    });
    ipcMain.handle(IpcEvents.SET_SETTINGS, (_, json: string) => {
        RendererSettings.setRaw(json);
    });
    ipcMain.handle(IpcEvents.OPEN_EXTERNAL, (_, url: string) => {
        let protocol: string;
        try {
            ({ protocol } = new URL(url));
        } catch {
            throw new Error("Malformed URL");
        }
        if (!["https:", "http:", "steam:", "spotify:", "com.epicgames.launcher:", "tidal:", "itunes:"].includes(protocol)) throw new Error("Disallowed protocol");
        shell.openExternal(url).catch(err => console.error("[Majic] Failed to open external link", url, err));
    });
    ipcMain.handle(IpcEvents.GET_QUICK_CSS, () => readText(QUICK_CSS_FILE, ""));
    ipcMain.handle(IpcEvents.SET_QUICK_CSS, (_, css: string) => writeFileSync(QUICK_CSS_FILE, css));
    ipcMain.handle(IpcEvents.WRITE_MODULE_DUMP, (_, id: string, code: string) => {
        const dumpDir = join(DATA_DIR, "dumps");
        mkdirSync(dumpDir, { recursive: true });
        const file = join(dumpDir, `${String(id).replace(/[^\w-]/g, "_")}.js`);
        writeFileSync(file, code);
        return file;
    });
    ipcMain.on(IpcEvents.GET_RENDERER_CODE, e => {
        e.returnValue = readFileSync(join(DIST_DIR, "renderer.js"), "utf-8");
    });

    ipcMain.on(IpcEvents.SUPPORTS_WINDOWS_MATERIAL, e => {
        e.returnValue = process.platform === "win32" && Number(release().split(".")[2]) >= 22621;
    });
    ipcMain.handle(IpcEvents.RELAUNCH, () => {
        app.relaunch();
        app.exit();
    });

    const windowSettings = RendererSettings.store;

    if (process.platform === "win32" && windowSettings.winCtrlQ) {
        const originalBuild = Menu.buildFromTemplate;
        Menu.buildFromTemplate = function (template) {
            if (template[0]?.label === "&File") {
                const { submenu } = template[0];
                if (Array.isArray(submenu)) {
                    submenu.push({
                        label: "Quit (Hidden)",
                        visible: false,
                        acceleratorWorksWhenHidden: true,
                        accelerator: "Control+Q",
                        click: () => app.quit()
                    });
                }
            }
            return originalBuild.call(this, template);
        };
    }

    class BrowserWindow extends electron.BrowserWindow {
        constructor(options: BrowserWindowConstructorOptions = {}) {
            if (!options.webPreferences?.preload || !options.title) {
                super(options);
                return;
            }

            const { nativeTitleBar, disableMinSize, transparent, macosVibrancyStyle, windowsMaterial } = windowSettings;

            const originalPreload = options.webPreferences.preload;
            options.webPreferences.preload = join(DIST_DIR, "preload.js");
            options.webPreferences.sandbox = false;

            if (nativeTitleBar) delete options.frame;

            if (disableMinSize) {
                options.minWidth = 0;
                options.minHeight = 0;
            }

            if (transparent) {
                options.transparent = true;
                options.backgroundColor = "#00000000";
            }

            if (process.platform === "darwin" && macosVibrancyStyle) {
                options.vibrancy = macosVibrancyStyle;
                options.backgroundColor = "#00000000";
            }

            if (process.platform === "win32" && windowsMaterial && windowsMaterial !== "none") {
                options.backgroundMaterial = windowsMaterial;
                options.backgroundColor = "#00000000";
            }

            process.env.MAJIC_DISCORD_PRELOAD = originalPreload;

            super(options);

            if (disableMinSize) this.setMinimumSize = () => { };
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
