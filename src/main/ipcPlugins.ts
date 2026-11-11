/*
 * Majic — plugin natives IPC
 */

import { IpcEvents } from "@shared/IpcEvents";
import { ipcMain } from "electron";
import PluginNatives from "~pluginNatives";

type NativeMethod = (...args: any[]) => unknown;

const channelsByPlugin = new Map<string, Record<string, string>>();

const channelName = (plugin: string, method: string) => `MajicPluginNative_${plugin}_${method}`;

function registerPlugin(plugin: string, exports: Record<string, unknown>) {
    const channels: Record<string, string> = {};

    for (const [method, value] of Object.entries(exports)) {
        if (typeof value !== "function") continue;
        const channel = channelName(plugin, method);
        ipcMain.handle(channel, value as NativeMethod);
        channels[method] = channel;
    }

    if (Object.keys(channels).length) channelsByPlugin.set(plugin, channels);
}

export function initPluginNatives() {
    for (const [plugin, exports] of Object.entries(PluginNatives)) registerPlugin(plugin, exports);

    ipcMain.on(IpcEvents.GET_PLUGIN_IPC_METHOD_MAP, event => {
        event.returnValue = Object.fromEntries(channelsByPlugin);
    });
}
