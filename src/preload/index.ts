/*
 * Majic — preload
 */

import { IpcEvents } from "@shared/IpcEvents";
import { contextBridge, ipcRenderer, webFrame } from "electron";

const pluginHelpers: Record<string, Record<string, (...args: any[]) => Promise<any>>> = {};
const pluginIpcMap: Record<string, Record<string, string>> = ipcRenderer.sendSync(IpcEvents.GET_PLUGIN_IPC_METHOD_MAP) ?? {};

for (const [plugin, methods] of Object.entries(pluginIpcMap)) {
    const map: Record<string, (...args: any[]) => Promise<any>> = pluginHelpers[plugin] = {};
    for (const [methodName, channel] of Object.entries(methods)) {
        map[methodName] = (...args: any[]) => ipcRenderer.invoke(channel, ...args);
    }
}

const MajicNative = {
    pluginHelpers,
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke(IpcEvents.OPEN_EXTERNAL, url),
    getSettings: (): string => ipcRenderer.sendSync(IpcEvents.GET_SETTINGS),
    setSettings: (json: string): Promise<void> => ipcRenderer.invoke(IpcEvents.SET_SETTINGS, json),
    getQuickCss: (): Promise<string> => ipcRenderer.invoke(IpcEvents.GET_QUICK_CSS),
    setQuickCss: (css: string): Promise<void> => ipcRenderer.invoke(IpcEvents.SET_QUICK_CSS, css),
    writeModuleDump: (id: string, code: string): Promise<string> => ipcRenderer.invoke(IpcEvents.WRITE_MODULE_DUMP, id, code)
};

export type MajicNativeApi = typeof MajicNative;

contextBridge.exposeInMainWorld("MajicNative", MajicNative);

if (location.protocol !== "data:") {
    const rendererCode: string = ipcRenderer.sendSync(IpcEvents.GET_RENDERER_CODE);
    webFrame.executeJavaScript(`${rendererCode}\n//# sourceURL=Majic/renderer.js`);
}

const originalPreload = process.env.MAJIC_DISCORD_PRELOAD;
if (originalPreload) require(originalPreload);
