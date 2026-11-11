/*
 * Majic — ConsoleShortcuts native
 */

import { app, type IpcMainInvokeEvent } from "electron";

export function initDevtoolsOpenEagerLoad(e: IpcMainInvokeEvent) {
    const handleDevtoolsOpened = () => e.sender.executeJavaScript("Majic.Plugins.plugins.ConsoleShortcuts.eagerLoad(true)");

    if (e.sender.isDevToolsOpened()) handleDevtoolsOpened();
    else e.sender.once("devtools-opened", () => handleDevtoolsOpened());
}

export function relaunch() {
    app.relaunch();
    app.exit(0);
}
