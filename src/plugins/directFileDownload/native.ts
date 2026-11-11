/*
 * Majic — DirectFileDownload native
 */

import type { IpcMainInvokeEvent } from "electron";

const ALLOWED_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

export async function saveAttachment(e: IpcMainInvokeEvent, url: string) {
    const { hostname, protocol } = new URL(url);

    if (!ALLOWED_HOSTS.has(hostname)) throw new Error(`Disallowed host: ${hostname}`);
    if (protocol !== "https:") throw new Error(`Disallowed protocol: ${protocol}`);

    e.sender.downloadURL(url);
}
