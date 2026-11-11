/*
 * Majic — BetterSessions utils
 */

import { DataStore } from "@api/dataStore";
import { Stores } from "@webpack/common";

import { BrowserIcon, DiscordIcon, MobileIcon, UnknownIcon } from "./components/icons";
import type { SessionInfo } from "./types";

const getDataKey = () => `BetterSessions_savedSessions_${Stores.UserStore.getCurrentUser().id}`;

export const cl = (name: string) => `majic-better-sessions-${name}`;
export const savedSessionsCache: Map<string, { name: string; isNew: boolean }> = new Map();

export function getDefaultName(clientInfo: SessionInfo["session"]["client_info"]) {
    return `${clientInfo.os} · ${clientInfo.platform}`;
}

export function saveSessionsToDataStore() {
    return DataStore.set(getDataKey(), savedSessionsCache);
}

export async function fetchNamesFromDataStore() {
    const savedSessions = await DataStore.get<Map<string, { name: string; isNew: boolean }>>(getDataKey()) || new Map();
    savedSessions.forEach((data, idHash) => savedSessionsCache.set(idHash, data));
}

export function getOsColor(os: string) {
    switch (os) {
        case "Windows Mobile":
        case "Windows":
            return "#55a6ef";
        case "Linux":
            return "#cdcd31";
        case "Android":
            return "#7bc958";
        case "Mac OS X":
        case "iOS":
            return "";
        case "Horizon OS":
            return "#0081fb";
        default:
            return "#f3799a";
    }
}

export function getPlatformIcon(platform: string) {
    switch (platform) {
        case "Discord Android":
        case "Discord iOS":
        case "Discord Client":
        case "Discord VR":
            return DiscordIcon;
        case "Android Chrome":
        case "Chrome iOS":
        case "Chrome":
        case "Edge":
        case "Firefox":
        case "Internet Explorer":
        case "Opera Mini":
        case "Opera":
        case "Mobile Safari":
        case "Safari":
            return BrowserIcon;
        case "BlackBerry":
        case "Facebook Mobile":
        case "Android Mobile":
            return MobileIcon;
        default:
            return UnknownIcon;
    }
}
