/*
 * Majic — Majic badge lists and ownership
 */

import { settings } from "@api/settings";
import { BADGE_ASSETS, DEVELOPER_BADGE_ICON, isMajicDeveloper, SUPPORTER_BADGE_ICON } from "@utils/constants";
import { Logger } from "@utils/logger";
import { Stores } from "@webpack/common";

const logger = new Logger("Badges", "#f1fa8c");

export interface CustomBadge {
    tooltip: string;
    icon: string;
}

export interface OwnedBadge {
    key: string;
    icon: string;
    name?: string;
    kind: "developer" | "supporter" | "custom";
}

const ICON_FILE = /^[\w.-]+\.(?:png|gif|webp)$/;

let supporters = new Set<string>();
let customBadges: Record<string, CustomBadge[]> = {};

async function fetchJson(file: string): Promise<unknown> {
    const res = await fetch(`${BADGE_ASSETS}/${file}`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

async function loadSupporters() {
    try {
        const ids = await fetchJson("supporters.json");
        supporters = new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
    } catch (err) {
        logger.error("Failed to load supporters", err);
    }
}

const isCustomBadge = (badge: any): badge is CustomBadge =>
    typeof badge?.tooltip === "string" && typeof badge?.icon === "string" && ICON_FILE.test(badge.icon);

async function loadCustomBadges() {
    try {
        const data = await fetchJson("custom.json");
        if (!data || typeof data !== "object") return;
        customBadges = Object.fromEntries(
            Object.entries(data)
                .filter(([userId, badges]) => /^\d+$/.test(userId) && Array.isArray(badges))
                .map(([userId, badges]) => [userId, (badges as unknown[]).filter(isCustomBadge)])
        );
    } catch (err) {
        logger.error("Failed to load custom badges", err);
    }
}

export const loadBadgeLists = () => Promise.all([loadSupporters(), loadCustomBadges()]);

export const isSupporter = (userId: string) => supporters.has(userId);

export const getCustomBadges = (userId: string) => customBadges[userId] ?? [];

export const customBadgeKey = (badge: CustomBadge) => `custom:${badge.icon}`;

export const customBadgeIcon = (badge: CustomBadge) => `${BADGE_ASSETS}/custom/${badge.icon}`;

export const getCurrentUserId = (): string | undefined => Stores.UserStore?.getCurrentUser?.()?.id;

export const isBadgeHidden = (userId: string, key: string) =>
    userId === getCurrentUserId() && settings.hiddenBadges.includes(key);

export function getOwnedBadges(userId = getCurrentUserId()): OwnedBadge[] {
    if (!userId) return [];
    const owned: OwnedBadge[] = [];
    if (isMajicDeveloper(userId)) owned.push({ key: "developer", kind: "developer", icon: DEVELOPER_BADGE_ICON });
    if (isSupporter(userId)) owned.push({ key: "supporter", kind: "supporter", icon: SUPPORTER_BADGE_ICON });
    for (const badge of getCustomBadges(userId))
        owned.push({ key: customBadgeKey(badge), kind: "custom", icon: customBadgeIcon(badge), name: badge.tooltip });
    return owned;
}
