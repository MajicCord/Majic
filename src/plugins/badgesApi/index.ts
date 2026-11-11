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
    _resetDirectoryBadges
} from "@api/badges";
import { definePlugin } from "@utils/types";

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

    stop: _resetDirectoryBadges,

    getBadges(profile: { userId: string; guildId: string }) {
        return profile ? _getBadges(profile) : [];
    },
    getDirectoryBadge: _getDirectoryBadge,
    getDirectoryBadges: _getDirectoryBadges,
    getDirectoryBadgeId: _getDirectoryBadgeId,
    renderBadgeComponent: _renderBadgeComponent,
    getBadgeMouseEventHandlers: _getBadgeMouseEventHandlers
});
