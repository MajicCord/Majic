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
import { createStrings } from "@i18n";
import { isMajicDeveloper } from "@utils/constants";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";

const s = createStrings({
    en: { developer: "Majic Developer", supporter: "Majic Supporter" },
    fr: { developer: "Développeur Majic", supporter: "Soutien de Majic" }
});

const ASSETS = "https://raw.githubusercontent.com/MajicCord/Majic/main/assets/badges";
const DEVELOPER_ICON = `${ASSETS}/developer.png`;
const SUPPORTER_ICON = `${ASSETS}/supporter.png`;

const logger = new Logger("Badges", "#f1fa8c");

let supporters = new Set<string>();

async function loadSupporters() {
    try {
        const res = await fetch(`${ASSETS}/supporters.json`, { cache: "no-cache" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ids: unknown = await res.json();
        supporters = new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []);
    } catch (err) {
        logger.error("Failed to load supporters", err);
    }
}

const DeveloperBadge: ProfileBadge = {
    id: "majic_developer_badge",
    get description() {
        return s("developer");
    },
    infoLabel: "Majic",
    rarity: BadgeRarity.MYTHIC,
    iconSrc: DEVELOPER_ICON,
    largeIconSrc: DEVELOPER_ICON,
    link: "https://github.com/MajicCord/Majic",
    position: BadgePosition.START,
    shouldShow: ({ userId }) => isMajicDeveloper(userId)
};

const SupporterBadge: ProfileBadge = {
    id: "majic_supporter_badge",
    get description() {
        return s("supporter");
    },
    infoLabel: "Majic",
    rarity: BadgeRarity.EPIC,
    iconSrc: SUPPORTER_ICON,
    largeIconSrc: SUPPORTER_ICON,
    position: BadgePosition.START,
    shouldShow: ({ userId }) => supporters.has(userId)
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
        loadSupporters();
    },

    stop() {
        removeProfileBadge(SupporterBadge);
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
