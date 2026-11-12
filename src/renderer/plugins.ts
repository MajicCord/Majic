/*
 * Majic — plugin manager
 */

import allPlugins from "~plugins";
import { addChatBarButton, removeChatBarButton } from "@api/chatButtons";
import { registerCommand, unregisterCommand } from "@api/commands";
import { addProfileBadge, removeProfileBadge } from "@api/badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/memberListDecorators";
import { addMessageAccessory, addMessageDecoration, removeMessageAccessory, removeMessageDecoration } from "@api/messageDecorations";
import { addMessagePopoverButton, removeMessagePopoverButton } from "@api/messagePopover";
import { addContextMenuPatch, removeContextMenuPatch } from "@api/contextMenu";
import {
    addMessageClickListener,
    addMessagePreEditListener,
    addMessagePreSendListener,
    removeMessageClickListener,
    removeMessagePreEditListener,
    removeMessagePreSendListener
} from "@api/messageEvents";
import { getPluginSettings, initPluginSettings, saveSettings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
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

const enabledAsDependency = new Set<string>();

function isEnabledByUser(p: Plugin) {
    return IS_REPORTER || p.required || getPluginSettings(p.name, p.enabledByDefault ?? false).enabled;
}

export function isPluginEnabled(name: string) {
    const p = plugins[name];
    if (!p) return false;
    return isEnabledByUser(p) || enabledAsDependency.has(name);
}

function enableDependencies(p: Plugin, chain: string[] = []) {
    for (const name of p.dependencies ?? []) {
        const dep = plugins[name];
        if (!dep) {
            logger.warn(`${p.name} depends on ${name}, which does not exist`);
            continue;
        }
        if (chain.includes(name)) {
            logger.warn(`Circular dependency: ${[...chain, p.name, name].join(" -> ")}`);
            continue;
        }
        if (isPluginEnabled(name)) continue;

        enabledAsDependency.add(name);
        enableDependencies(dep, [...chain, p.name]);
    }
}

for (const p of Object.values(plugins)) if (isEnabledByUser(p)) enableDependencies(p);

export function pluginRequiresRestart(p: Plugin) {
    return Boolean(p.requiresRestart || p.patches?.length);
}

export function registerPatches() {
    for (const p of Object.values(plugins)) {
        if (!isPluginEnabled(p.name) || !p.patches) continue;
        for (const patch of p.patches) {
            if (!IS_REPORTER && patch.predicate && !patch.predicate()) continue;

            const replacements = (Array.isArray(patch.replacement) ? patch.replacement : [patch.replacement])
                .filter(r => IS_REPORTER || !r.predicate || r.predicate());
            if (!replacements.length) continue;

            patches.push({
                ...patch,
                group: IS_REPORTER ? false : patch.group,
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

function addStyle(p: Plugin) {
    if (p.css) enableStyle(`plugin-${p.name}`, p.css);
}

function removeStyle(p: Plugin) {
    disableStyle(`plugin-${p.name}`);
}

interface PluginFeature {
    attach(p: Plugin): void;
    detach(p: Plugin): void;
}

const boundMethods = new WeakMap<Plugin, Map<string, (...args: any[]) => any>>();

function bound(p: Plugin, key: string) {
    if (!boundMethods.has(p)) boundMethods.set(p, new Map());
    const cache = boundMethods.get(p)!;
    if (!cache.has(key)) cache.set(key, (p[key] as (...args: any[]) => any).bind(p));
    return cache.get(key)!;
}

function listenerFeature(key: "onBeforeMessageSend" | "onBeforeMessageEdit" | "onMessageClick", add: (fn: any) => unknown, remove: (fn: any) => unknown): PluginFeature {
    return {
        attach: p => typeof p[key] === "function" && void add(bound(p, key)),
        detach: p => typeof p[key] === "function" && void remove(bound(p, key))
    };
}

const pluginFeatures: PluginFeature[] = [
    {
        attach: p => Object.entries(p.contextMenus ?? {}).forEach(([navId, patch]) => addContextMenuPatch(navId, patch)),
        detach: p => Object.entries(p.contextMenus ?? {}).forEach(([navId, patch]) => removeContextMenuPatch(navId, patch))
    },
    listenerFeature("onBeforeMessageSend", addMessagePreSendListener, removeMessagePreSendListener),
    listenerFeature("onBeforeMessageEdit", addMessagePreEditListener, removeMessagePreEditListener),
    listenerFeature("onMessageClick", addMessageClickListener, removeMessageClickListener),
    {
        attach: p => p.commands?.forEach(command => registerCommand(command, p.name)),
        detach: p => p.commands?.forEach(command => unregisterCommand(command.name))
    },
    {
        attach: p => Object.entries(p.chatBarButtons ?? {}).forEach(([id, render]) => addChatBarButton(`${p.name}-${id}`, render)),
        detach: p => Object.keys(p.chatBarButtons ?? {}).forEach(id => removeChatBarButton(`${p.name}-${id}`))
    },
    {
        attach: p => Object.entries(p.messagePopoverButtons ?? {}).forEach(([id, factory]) => addMessagePopoverButton(`${p.name}-${id}`, factory)),
        detach: p => Object.keys(p.messagePopoverButtons ?? {}).forEach(id => removeMessagePopoverButton(`${p.name}-${id}`))
    },
    {
        attach: p => Object.entries(p.messageAccessories ?? {}).forEach(([id, render]) => addMessageAccessory(`${p.name}-${id}`, render)),
        detach: p => Object.keys(p.messageAccessories ?? {}).forEach(id => removeMessageAccessory(`${p.name}-${id}`))
    },
    {
        attach: p => Object.entries(p.messageDecorations ?? {}).forEach(([id, render]) => addMessageDecoration(`${p.name}-${id}`, render)),
        detach: p => Object.keys(p.messageDecorations ?? {}).forEach(id => removeMessageDecoration(`${p.name}-${id}`))
    },
    {
        attach: p => Object.entries(p.memberListDecorators ?? {}).forEach(([id, render]) => addMemberListDecorator(`${p.name}-${id}`, render)),
        detach: p => Object.keys(p.memberListDecorators ?? {}).forEach(id => removeMemberListDecorator(`${p.name}-${id}`))
    },
    {
        attach: p => p.userProfileBadge && addProfileBadge(p.userProfileBadge),
        detach: p => p.userProfileBadge && void removeProfileBadge(p.userProfileBadge)
    }
];

export function startPlugin(p: Plugin) {
    if (p.started) return true;
    for (const name of p.dependencies ?? []) {
        const dep = plugins[name];
        if (dep && !startPlugin(dep)) {
            logger.error(`Failed to start ${p.name}: dependency ${name} failed to start`);
            return false;
        }
    }
    try {
        p.start?.();
        addStyle(p);
        p.started = true;
        subscribeFlux(p);
        for (const feature of pluginFeatures) feature.attach(p);
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
        for (const feature of pluginFeatures) feature.detach(p);
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
        if ((p.startAt ?? "WebpackReady") === stage && isPluginEnabled(p.name)) startPlugin(p);
    }
}

export function setPluginEnabled(name: string, enabled: boolean) {
    const p = plugins[name];
    if (!p || p.required) return false;
    getPluginSettings(name, p.enabledByDefault ?? false).enabled = enabled;
    saveSettings();
    if (enabled) enableDependencies(p);

    if (pluginRequiresRestart(p)) {
        logger.warn(`${name} requires a reload: reload Discord (Ctrl+R) to apply.`);
        return true;
    }
    return enabled ? startPlugin(p) : stopPlugin(p);
}
