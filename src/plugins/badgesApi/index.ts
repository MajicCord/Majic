/*
 * Majic — BadgesAPI core plugin
 */

import {
    _getBadgeMouseEventHandlers,
    _getBadges,
    _getDirectoryBadge,
    _getDirectoryBadgeId,
    _getDirectoryBadges,
    _renderBadgeComponent,
    _resetDirectoryBadges,
    addProfileBadge,
    BadgePosition,
    BadgeRarity,
    ProfileBadge,
    removeProfileBadge
} from "@api/badges";
import { settings } from "@api/settings";
import { t } from "@i18n";
import { BADGE_ASSETS, DEVELOPER_BADGE_ICON, isMajicDeveloper, SUPPORTER_BADGE_ICON } from "@utils/constants";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";

const logger = new Logger("Badges", "#f1fa8c");

interface CustomBadge {
    tooltip: string;
    icon: string;
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

const DeveloperBadge: ProfileBadge = {
    id: "majic_developer_badge",
    get description() {
        return t("badges.developer");
    },
    infoLabel: "Majic",
    rarity: BadgeRarity.MYTHIC,
    iconSrc: DEVELOPER_BADGE_ICON,
    largeIconSrc: DEVELOPER_BADGE_ICON,
    link: "https://github.com/MajicCord/Majic",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => settings.badges.developer && isMajicDeveloper(userId)
};

const SupporterBadge: ProfileBadge = {
    id: "majic_supporter_badge",
    get description() {
        return t("badges.supporter");
    },
    infoLabel: "Majic",
    rarity: BadgeRarity.EPIC,
    iconSrc: SUPPORTER_BADGE_ICON,
    largeIconSrc: SUPPORTER_BADGE_ICON,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => settings.badges.supporter && supporters.has(userId)
};

const CustomBadges: ProfileBadge = {
    id: "majic_custom_badges",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => settings.badges.custom && !!customBadges[userId]?.length,
    getBadges: ({ userId }) => (customBadges[userId] ?? []).map((badge, index) => {
        const icon = `${BADGE_ASSETS}/custom/${badge.icon}`;
        return {
            id: `majic_custom_badge_${index}`,
            description: badge.tooltip,
            name: badge.tooltip,
            infoLabel: "Majic",
            rarity: BadgeRarity.MYTHIC,
            iconSrc: icon,
            largeIconSrc: icon,
            position: BadgePosition.START
        };
    })
};

export default definePlugin({
    name: "BadgesAPI",
    description: "Lets plugins add badges to user profiles",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des badges aux profils"
        }
    },
    required: true,

    css: '[class*="profile"] [class*="tags"] [class*="container"] { gap: 1px; }',

    patches: [
        {
            find: "#{intl::PROFILE_USER_BADGES}",
            replacement: [
                {
                    match: /alt:" ","aria-hidden":!0,src:.{0,50}(\i).iconSrc/,
                    replace: "...$1.props,$&"
                },
                {
                    match: /(?<=forceOpen:.{0,40}?ariaHidden:!0,)children:(?=.{0,50}?(\i)\.id)/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}):"
                },
                {
                    match: /(?<=fallbackIconSrc:.{0,50}?)children:(?=.{0,50}?(\i)\.id)/,
                    replace: "children:$1.component?$self.renderBadgeComponent({...$1}):"
                },
                {
                    match: /href:(\i)\.link/,
                    replace: "...$self.getBadgeMouseEventHandlers($1),$&"
                },
                {
                    match: /legacyBadgeId:(\i),userId:(\i),.{0,100}?=\i,\i=\(0,\i\.\i\)\(\1\)/,
                    replace: "$&??$self.getDirectoryBadgeId($1,$2)"
                }
            ]
        },
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{.{0,100}?return\[/,
                replace: "$&...$self.getBadges(this),"
            }
        },
        {
            find: '"BadgeDirectoryStore"',
            replacement: {
                match: /getBadgeById\((\i),(\i)\)\{/,
                replace: "$&const majicBadge=$self.getDirectoryBadge($1);if(majicBadge)return majicBadge;"
            }
        },
        {
            find: "badge_directory_closed",
            replacement: {
                match: /(\i\.\i\.getBadges\((\i)\))(?=:\[\],\[\2\]\))/,
                replace: "[...$1,...$self.getDirectoryBadges($2)]"
            }
        }
    ],

    userProfileBadge: DeveloperBadge,

    start() {
        addProfileBadge(SupporterBadge);
        addProfileBadge(CustomBadges);
        loadSupporters();
        loadCustomBadges();
    },

    stop() {
        removeProfileBadge(SupporterBadge);
        removeProfileBadge(CustomBadges);
        _resetDirectoryBadges();
    },

    getBadges(profile: { userId: string; guildId: string }) {
        return profile ? _getBadges(profile) : [];
    },
    getDirectoryBadge: _getDirectoryBadge,
    getDirectoryBadges: _getDirectoryBadges,
    getDirectoryBadgeId: _getDirectoryBadgeId,
    renderBadgeComponent: _renderBadgeComponent,
    getBadgeMouseEventHandlers: _getBadgeMouseEventHandlers
});
