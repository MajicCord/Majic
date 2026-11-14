/*
 * Majic — profile badges API
 */

import { t } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { React } from "@webpack/common";
import type { ComponentType, HTMLProps, MouseEvent } from "react";

const logger = new Logger("Badges", "#f1fa8c");

export const enum BadgePosition {
    START,
    END
}

export enum BadgeRarity {
    COMMON = 1,
    RARE = 2,
    EPIC = 3,
    MYTHIC = 5
}

export interface BadgeUserArgs {
    userId: string;
    guildId: string;
}

export interface ProfileBadge {
    id: string;
    description?: string;
    component?: ComponentType<ProfileBadge & BadgeUserArgs>;
    iconSrc?: string;
    link?: string;
    onClick?(event: MouseEvent, badge: ProfileBadge & BadgeUserArgs): void;
    onContextMenu?(event: MouseEvent, badge: ProfileBadge & BadgeUserArgs): void;
    shouldShow?(user: BadgeUserArgs): boolean;
    props?: HTMLProps<HTMLImageElement>;
    position?: BadgePosition;
    key?: string;
    name?: string;
    detail?: string;
    infoLabel?: string;
    largeIconSrc?: string;
    obtainedAt?: string;
    rarity?: BadgeRarity;
    getBadges?(user: BadgeUserArgs): ProfileBadge[];
}

interface DirectoryBadge {
    badge_id: string;
    name: string;
    description: string;
    info_label: string;
    rarity: BadgeRarity;
    simple_icon_url: string;
    complex_icon_static_url: string;
    obtained_at?: string;
    is_earnable: false;
    owned: true;
    hidden: false;
    tiers: [];
}

const badges = new Set<ProfileBadge>();
let directoryBadges: Record<string, DirectoryBadge> = {};

const safeComponent = (component?: ComponentType<any>) => component && withErrorBoundary("Profile badge", component);

export function addProfileBadge(badge: ProfileBadge) {
    badge.component &&= safeComponent(badge.component);
    badges.add(badge);
}

export const removeProfileBadge = (badge: ProfileBadge) => badges.delete(badge);

export function _getBadges(user: BadgeUserArgs) {
    const result: Array<ProfileBadge & BadgeUserArgs> = [];
    if (!user) return result;

    for (const badge of badges) {
        try {
            if (badge.shouldShow && !badge.shouldShow(user)) continue;

            const entries = badge.getBadges
                ? badge.getBadges(user).map(b => ({ ...user, ...b, component: safeComponent(b.component) }))
                : [{ ...user, ...badge }];

            if (badge.position === BadgePosition.START) result.unshift(...entries);
            else result.push(...entries);
        } catch (err) {
            logger.error(`Badge ${badge.id} failed`, err);
        }
    }
    return result;
}

function toDirectoryBadge(badge: ProfileBadge, userId: string): DirectoryBadge {
    const id = `majic-${userId}-${badge.id}`;
    return directoryBadges[id] ??= {
        badge_id: id,
        name: badge.name ?? badge.description ?? "",
        description: [badge.detail, t("badges.disclaimer")].filter(Boolean).join("\n\n"),
        info_label: badge.infoLabel ?? "Majic",
        rarity: badge.rarity ?? BadgeRarity.COMMON,
        simple_icon_url: badge.iconSrc!,
        complex_icon_static_url: badge.largeIconSrc ?? badge.iconSrc!,
        obtained_at: badge.obtainedAt,
        is_earnable: false,
        owned: true,
        hidden: false,
        tiers: []
    };
}

export const _getDirectoryBadge = (id: string) => directoryBadges[id];

export const _getDirectoryBadges = (userId: string) =>
    _getBadges({ userId, guildId: "" }).filter(b => b.iconSrc).map(b => toDirectoryBadge(b, userId));

export function _getDirectoryBadgeId(badgeId: string, userId?: string) {
    if (!userId) return undefined;
    const badge = _getBadges({ userId, guildId: "" }).find(b => b.id === badgeId && b.iconSrc);
    return badge ? toDirectoryBadge(badge, userId).badge_id : undefined;
}

export const _renderBadgeComponent = withErrorBoundary("Profile badge", (badge: ProfileBadge & BadgeUserArgs) => {
    const Component = badge.component!;
    return <Component {...badge} />;
});

export function _getBadgeMouseEventHandlers(badge: ProfileBadge & BadgeUserArgs) {
    const handlers: Record<string, (event: MouseEvent) => void> = {};
    if (!badge) return handlers;
    if (badge.onClick) handlers.onClick = event => badge.onClick!(event, badge);
    if (badge.onContextMenu) handlers.onContextMenu = event => badge.onContextMenu!(event, badge);
    return handlers;
}

export const _resetDirectoryBadges = () => void (directoryBadges = {});
