/*
 * Majic — themes folder, protocol and file watchers
 */

import { IpcEvents } from "@shared/IpcEvents";
import { app, ipcMain, net, protocol, shell, systemPreferences } from "electron";
import { type FSWatcher, watch } from "node:fs";
import { open, readdir, readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

import { DATA_DIR, QUICK_CSS_FILE, THEMES_DIR } from "./settings";

export interface ThemeHeader {
    fileName: string;
    name: string;
    author: string;
    description: string;
    version?: string;
    license?: string;
    source?: string;
    website?: string;
    invite?: string;
}

export function ensureSafePath(basePath: string, path: string) {
    const normalizedBase = normalize(basePath + "/");
    const normalizedPath = normalize(join(basePath, path));
    return normalizedPath === normalize(basePath) || normalizedPath.startsWith(normalizedBase) ? normalizedPath : null;
}

const stripBOM = (content: string) => content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;

function makeHeader(fileName: string, fields: Partial<ThemeHeader> = {}): ThemeHeader {
    return {
        ...fields,
        fileName,
        name: fields.name || fileName.replace(/\.css$/i, ""),
        author: fields.author || "Unknown Author",
        description: fields.description || "A Discord Theme."
    };
}

export function parseThemeHeader(css: string, fileName: string): ThemeHeader {
    const block = css.split("/**", 2)[1]?.split("*/", 1)[0];
    if (!block) return makeHeader(fileName);

    const fields: Record<string, string> = {};
    let field = "";
    let value = "";

    for (const rawLine of block.split(/\r?\n/)) {
        const line = rawLine.replace(/^\s*\*?\s?/, "");
        if (!line) continue;

        const tag = /^@(\S+)\s*(.*)$/.exec(line);
        if (tag) {
            if (field) fields[field] = value.trim();
            [, field, value] = tag;
        } else {
            value += " " + line.replace(/^\\@/, "@");
        }
    }
    if (field) fields[field] = value.trim();

    return makeHeader(fileName, fields);
}

function getThemeData(fileName: string) {
    const safePath = ensureSafePath(THEMES_DIR, fileName.replace(/\?v=\d+$/, ""));
    if (!safePath) return Promise.reject(new Error(`Unsafe path ${fileName}`));
    return readFile(safePath, "utf-8");
}

async function listThemes(): Promise<ThemeHeader[]> {
    const files = await readdir(THEMES_DIR).catch(() => [] as string[]);
    const themes: ThemeHeader[] = [];

    for (const fileName of files) {
        if (!fileName.endsWith(".css")) continue;
        const data = await getThemeData(fileName).then(stripBOM).catch(() => null);
        if (data != null) themes.push(parseThemeHeader(data, fileName));
    }

    return themes;
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

const readQuickCss = () => readFile(QUICK_CSS_FILE, "utf-8").catch(() => "");

let watchers: FSWatcher[] = [];

export function initThemes() {
    app.whenReady().then(() => {
        protocol.handle("majic", ({ url: unsafeUrl }) => {
            let url = decodeURI(unsafeUrl).slice("majic://".length).replace(/\?v=\d+$/, "");
            if (url.endsWith("/")) url = url.slice(0, -1);

            if (!url.startsWith("/themes/")) return new Response(null, { status: 404 });

            const safePath = ensureSafePath(THEMES_DIR, url.slice("/themes/".length));
            if (!safePath) return new Response(null, { status: 404 });

            return net.fetch(pathToFileURL(safePath).toString());
        });
    });

    ipcMain.handle(IpcEvents.GET_THEMES_LIST, () => listThemes());
    ipcMain.handle(IpcEvents.GET_THEME_DATA, (_, fileName: string) => getThemeData(fileName));
    ipcMain.handle(IpcEvents.GET_THEME_SYSTEM_VALUES, () => {
        let accentColor = systemPreferences.getAccentColor?.() ?? "";
        if (accentColor && accentColor[0] !== "#") accentColor = `#${accentColor}`;
        return { "os-accent-color": accentColor };
    });
    ipcMain.handle(IpcEvents.OPEN_THEMES_FOLDER, () => shell.openPath(THEMES_DIR));
    ipcMain.handle(IpcEvents.OPEN_SETTINGS_FOLDER, () => shell.openPath(DATA_DIR));
    ipcMain.handle(IpcEvents.OPEN_QUICK_CSS, async () => {
        await open(QUICK_CSS_FILE, "a+").then(fd => fd.close());
        return shell.openPath(QUICK_CSS_FILE);
    });

    ipcMain.handle(IpcEvents.INIT_FILE_WATCHERS, ({ sender }) => {
        watchers.forEach(watcher => watcher.close());
        watchers = [];

        open(QUICK_CSS_FILE, "a+").then(fd => {
            fd.close();
            watchers.push(watch(QUICK_CSS_FILE, { persistent: false }, debounce(async () => {
                sender.postMessage(IpcEvents.QUICK_CSS_UPDATE, await readQuickCss());
            }, 50)));
        }).catch(() => { });

        watchers.push(watch(THEMES_DIR, { persistent: false }, debounce(() => {
            sender.postMessage(IpcEvents.THEME_UPDATE, undefined);
        })));

        sender.once("destroyed", () => {
            watchers.forEach(watcher => watcher.close());
            watchers = [];
        });
    });
}
