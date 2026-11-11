/*
 * Majic — plugin natives IPC
 * Adapted from Vencord, GPL-3.0-or-later
 */

import { IpcEvents } from "@shared/IpcEvents";
import { ipcMain } from "electron";
import PluginNatives from "~pluginNatives";

const PluginIpcMappings: Record<string, Record<string, string>> = {};
export type PluginIpcMappings = typeof PluginIpcMappings;

export function initPluginNatives() {
    for (const [plugin, methods] of Object.entries(PluginNatives)) {
        const entries = Object.entries(methods).filter(([, method]) => typeof method === "function");
        if (!entries.length) continue;

        const mappings: Record<string, string> = PluginIpcMappings[plugin] = {};
        for (const [methodName, method] of entries) {
            const key = `MajicPluginNative_${plugin}_${methodName}`;
            ipcMain.handle(key, method as (...args: any[]) => unknown);
            mappings[methodName] = key;
        }
    }

    ipcMain.on(IpcEvents.GET_PLUGIN_IPC_METHOD_MAP, e => {
        e.returnValue = PluginIpcMappings;
    });
}
