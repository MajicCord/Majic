/*
 * Majic — VoiceMessages native
 */

import { app, type IpcMainInvokeEvent } from "electron";
import { readFile, rm } from "node:fs/promises";
import { basename, normalize } from "node:path";

export async function readRecording(_: IpcMainInvokeEvent, filePath: string) {
    filePath = normalize(filePath);
    const filename = basename(filePath);
    const discordBaseDirWithTrailingSlash = normalize(app.getPath("userData") + "/");
    if (!/^\d*recording\.ogg$/.test(filename) || !filePath.startsWith(discordBaseDirWithTrailingSlash)) return null;

    try {
        const buf = await readFile(filePath);
        rm(filePath).catch(() => { });
        return new Uint8Array(buf.buffer);
    } catch {
        return null;
    }
}
