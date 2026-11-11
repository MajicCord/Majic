/*
 * Majic — OpenInApp native
 */

import type { IpcMainInvokeEvent } from "electron";
import { request } from "node:https";

const validRedirectUrls = /^https:\/\/(spotify\.link|s\.team)\/.+$/;

function getRedirect(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const req = request(new URL(url), { method: "HEAD" }, res => {
            resolve(res.headers.location ? getRedirect(res.headers.location) : url);
        });
        req.on("error", reject);
        req.end();
    });
}

export async function resolveRedirect(_: IpcMainInvokeEvent, url: string) {
    if (!validRedirectUrls.test(url)) return url;
    return getRedirect(url);
}
