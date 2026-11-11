/*
 * Majic — plugin manager
 */

import allPlugins from "~plugins";
import { getPluginSettings, initPluginSettings, saveSettings } from "@api/settings";
import { Logger } from "@utils/logger";
import { canonicalizeMatch, canonicalizeReplacement } from "@utils/patches";
import type { Plugin, StartAt } from "@utils/types";
import { filters, waitFor } from "./webpack";
import { patches } from "./webpack/patchWebpack";

const logger = new Logger("Plugins", "#50fa7b");

export const plugins: Record<string, Plugin> = {};

for (const def of allPlugins) {
    plugins[def.name] = Object.assign(def, { started: false });
    initPluginSettings(def.name, def.enabledByDefault ?? false, def.settings);
}
saveSettings();

export function isPluginEnabled(name: string) {
    const p = plugins[name];
    if (!p) return false;
    return p.required || getPluginSettings(name, p.enabledByDefault ?? false).enabled;
}

export function registerPatches() {
    for (const p of Object.values(plugins)) {
        if (!isPluginEnabled(p.name) || !p.patches) continue;
        for (const patch of p.patches) {
            if (patch.predicate && !patch.predicate()) continue;

            const replacements = (Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement])
                .filter(r => !r.predicate || r.predicate());
            if (!replacements.length) continue;

            patches.push({
                ...patch,
                plugin: p.name,
                find: canonicalizeMatch(patch.find),
                replacement: replacements.map(r => canonicalizeReplacement(r, p.name))
            });
        }
    }
}

let fluxDispatcher: any;
const fluxHandlers = new Map<string, [event: string, handler: (e: any) => void][]>();

function subscribeFlux(p: Plugin) {
    if (!p.flux || !fluxDispatcher || fluxHandlers.has(p.name)) return;

    const handlers = Object.entries(p.flux).map(([event, handler]) => {
        const wrapped = (e: any) => {
            try {
                handler.call(p, e);
            } catch (err) {
                logger.error(`${p.name}: error in flux handler ${event}`, err);
            }
        };
        fluxDispatcher.subscribe(event, wrapped);
        return [event, wrapped] as [string, (e: any) => void];
    });
    fluxHandlers.set(p.name, handlers);
}

function unsubscribeFlux(p: Plugin) {
    for (const [event, handler] of fluxHandlers.get(p.name) ?? []) fluxDispatcher?.unsubscribe(event, handler);
    fluxHandlers.delete(p.name);
}

waitFor(filters.byProps("dispatch", "subscribe"), dispatcher => {
    fluxDispatcher = dispatcher;
    for (const p of Object.values(plugins)) if (p.started) subscribeFlux(p);
});

const styleElements = new Map<string, HTMLStyleElement>();

function addStyle(p: Plugin) {
    if (!p.css) return;
    const style = document.createElement("style");
    style.id = `majic-plugin-${p.name}`;
    style.textContent = p.css;
    styleElements.set(p.name, style);

    if (document.head) document.head.append(style);
    else document.addEventListener("DOMContentLoaded", () => styleElements.get(p.name) === style && document.head.append(style), { once: true });
}

function removeStyle(p: Plugin) {
    styleElements.get(p.name)?.remove();
    styleElements.delete(p.name);
}

export function startPlugin(p: Plugin) {
    if (p.started) return true;
    try {
        p.start?.();
        addStyle(p);
        p.started = true;
        subscribeFlux(p);
        logger.info(`Started: ${p.name}`);
        return true;
    } catch (err) {
        logger.error(`Failed to start ${p.name}`, err);
        return false;
    }
}

export function stopPlugin(p: Plugin) {
    if (!p.started) return true;
    try {
        p.stop?.();
        removeStyle(p);
        unsubscribeFlux(p);
        p.started = false;
        logger.info(`Stopped: ${p.name}`);
        return true;
    } catch (err) {
        logger.error(`Failed to stop ${p.name}`, err);
        return false;
    }
}

export function startAllPlugins(stage: StartAt) {
    for (const p of Object.values(plugins)) {
        if ((p.startAt ?? "DOMContentLoaded") === stage && isPluginEnabled(p.name)) startPlugin(p);
    }
}

export function setPluginEnabled(name: string, enabled: boolean) {
    const p = plugins[name];
    if (!p || p.required) return false;
    getPluginSettings(name, p.enabledByDefault ?? false).enabled = enabled;
    saveSettings();
    if (p.patches?.length) {
        logger.warn(`${name} patches Discord's code: reload Discord (Ctrl+R) to apply.`);
        return true;
    }
    return enabled ? startPlugin(p) : stopPlugin(p);
}
