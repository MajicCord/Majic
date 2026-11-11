/*
 * Majic — profile badges API
 */

import { Logger } from "@utils/logger";

const logger = new Logger("Badges", "#f1fa8c");

export interface ProfileBadge {
    id: string;
    description: string;
    iconSrc: string;
    link?: string;
    position?: "start" | "end";
    shouldShow?(userId: string): boolean;
}

const badges = new Map<string, ProfileBadge>();

export const addProfileBadge = (badge: ProfileBadge) => void badges.set(badge.id, badge);
export const removeProfileBadge = (id: string) => badges.delete(id);

export function _getBadges(profile: { userId?: string; _userProfile?: { userId?: string } }) {
    const userId = profile?.userId ?? profile?._userProfile?.userId;
    if (!userId || !badges.size) return [];

    const start: unknown[] = [];
    const end: unknown[] = [];
    for (const badge of badges.values()) {
        try {
            if (badge.shouldShow && !badge.shouldShow(userId)) continue;
            const entry = { id: `majic-${badge.id}`, icon: badge.id, iconSrc: badge.iconSrc, description: badge.description, link: badge.link };
            (badge.position === "start" ? start : end).push(entry);
        } catch (err) {
            logger.error(`Badge ${badge.id} failed`, err);
        }
    }
    return [start, end] as const;
}
