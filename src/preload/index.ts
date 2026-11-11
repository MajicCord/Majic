/*
 * Majic — preload
 */

import { IpcEvents } from "@shared/IpcEvents";
import { contextBridge, ipcRenderer, webFrame } from "electron";

const MajicNative = {
    getSettings: (): string => ipcRenderer.sendSync(IpcEvents.GET_SETTINGS),
    setSettings: (json: string): Promise<void> => ipcRenderer.invoke(IpcEvents.SET_SETTINGS, json),
    getQuickCss: (): Promise<string> => ipcRenderer.invoke(IpcEvents.GET_QUICK_CSS)
};

export type MajicNativeApi = typeof MajicNative;

contextBridge.exposeInMainWorld("MajicNative", MajicNative);

if (location.protocol !== "data:") {
    const rendererCode: string = ipcRenderer.sendSync(IpcEvents.GET_RENDERER_CODE);
    webFrame.executeJavaScript(`${rendererCode}\n//# sourceURL=Majic/renderer.js`);
}

const originalPreload = process.env.MAJIC_DISCORD_PRELOAD;
if (originalPreload) require(originalPreload);
