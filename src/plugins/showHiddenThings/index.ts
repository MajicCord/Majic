/*
 * Majic — ShowHiddenThings plugin
 */

import { definePluginSettings } from "@api/settings";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";

const logger = new Logger("ShowHiddenThings", "#ff79c6");

const opt = (description: string) => ({
    type: OptionType.BOOLEAN,
    description,
    default: true,
    restartNeeded: true
});

const settings = definePluginSettings({
    showTimeouts: opt("Show member timeout icons in chat"),
    showInvitesPaused: opt("Show the invites paused tooltip in the server list"),
    showModView: opt("Show the member mod view context menu item in all servers")
});

export default definePlugin({
    name: "ShowHiddenThings",
    description: "Displays various hidden and moderator-only things regardless of permissions",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche diverses choses cachées ou réservées aux modérateurs, quelles que soient tes permissions",
            options: {
                showTimeouts: "Afficher les icônes d'exclusion temporaire des membres dans le chat",
                showInvitesPaused: "Afficher l'infobulle « invitations en pause » dans la liste des serveurs",
                showModView: "Afficher l'élément « vue modérateur » dans le menu des membres de tous les serveurs"
            }
        }
    },
    settings,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            predicate: () => settings.store.showTimeouts,
            replacement: {
                match: /&&\i\.\i\.canManageUser\(\i\.\i\.MODERATE_MEMBERS,\i\.author,\i\)/,
                replace: ""
            }
        },
        {
            find: "INVITES_DISABLED)||",
            predicate: () => settings.store.showInvitesPaused,
            replacement: {
                match: /\i\.\i\.can\(\i\.\i.MANAGE_GUILD,\i\)/,
                replace: "true"
            }
        },
        {
            find: /,checkElevated:!1}\),\i\.\i\)}(?<=getCurrentUser\(\);return.+?)/,
            predicate: () => settings.store.showModView,
            replacement: {
                match: /return \i\.\i\(\i\.\i\(\{user:\i,context:\i,checkElevated:!1\}\),\i\.\i\)/,
                replace: "return true"
            }
        },
        {
            find: "#{intl::GUILD_MEMBER_MOD_VIEW_HIGHEST_ROLE}),children:",
            predicate: () => settings.store.showModView,
            replacement: {
                match: /(#{intl::GUILD_MEMBER_MOD_VIEW_HIGHEST_ROLE}.{0,80})role:\i(?<=\[\i\.roles,\i\.highestRoleId,(\i)\].+?)/,
                replace: (_: string, rest: string, roles: string) => `${rest}role:$self.getHighestRole(arguments[0],${roles})`
            }
        },
        {
            find: 'action:"PRESS_MOD_VIEW",icon:',
            predicate: () => settings.store.showModView,
            replacement: {
                match: /\i(?=\?null)/,
                replace: "false"
            }
        }
    ],

    getHighestRole({ member }: { member: { highestRoleId: string } }, roles: Array<{ id: string }>) {
        try {
            return roles.find(role => role.id === member.highestRoleId);
        } catch (err) {
            logger.error("Failed to find highest role", err);
            return undefined;
        }
    }
});
