/*
 * Majic — main process settings
 */

import { app } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const DATA_DIR = join(app.getPath("appData"), "Majic");
export const SETTINGS_FILE = join(DATA_DIR, "settings.json");
export const QUICK_CSS_FILE = join(DATA_DIR, "quickCss.css");
export const THEMES_DIR = join(DATA_DIR, "themes");

mkdirSync(THEMES_DIR, { recursive: true });

type Listener = (newValue: any, oldValue: any) => void;

function readJson(): Record<string, any> {
    try {
        return JSON.parse(readFileSync(SETTINGS_FILE, "utf-8"));
    } catch {
        return {};
    }
}

const getPath = (object: any, path: string) => path.split(".").reduce((value, key) => value?.[key], object);

class SettingsStore {
    private data = readJson();
    private readonly listeners = new Map<string, Set<Listener>>();

    get store(): Record<string, any> {
        return this.data;
    }

    get raw() {
        return JSON.stringify(this.data, null, 4);
    }

    setRaw(json: string) {
        const previous = this.data;
        this.data = JSON.parse(json);
        writeFileSync(SETTINGS_FILE, json);

        for (const [path, listeners] of this.listeners) {
            const oldValue = getPath(previous, path);
            const newValue = getPath(this.data, path);
            if (JSON.stringify(oldValue) === JSON.stringify(newValue)) continue;
            for (const listener of listeners) {
                try {
                    listener(newValue, oldValue);
                } catch (err) {
                    console.error(`[Majic] Settings listener for ${path} failed`, err);
                }
            }
        }
    }

    addChangeListener(path: string, listener: Listener) {
        let listeners = this.listeners.get(path);
        if (!listeners) this.listeners.set(path, listeners = new Set());
        listeners.add(listener);
    }

    removeChangeListener(path: string, listener: Listener) {
        this.listeners.get(path)?.delete(listener);
    }
}

export const RendererSettings = new SettingsStore();
