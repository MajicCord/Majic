/*
 * Majic — BetterRoleDot plugin
 */

import { definePluginSettings } from "@api/settings";
import { copyWithToast } from "@utils/discord";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    bothStyles: {
        type: OptionType.BOOLEAN,
        description: "Show both role dot and coloured names",
        restartNeeded: true,
        default: false
    },
    copyRoleColorInProfilePopout: {
        type: OptionType.BOOLEAN,
        description: "Allow clicking the role dot in profile popouts to copy the role color",
        restartNeeded: true,
        default: false
    }
});

export default definePlugin({
    name: "BetterRoleDot",
    description: "Copies the role color when clicking the role dot (accessibility setting), and lets you use both role dots and coloured names",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Copie la couleur du rôle en cliquant sur la pastille de rôle (option d'accessibilité), et permet d'avoir à la fois les pastilles et les pseudos colorés",
            options: {
                bothStyles: "Afficher à la fois la pastille de rôle et les pseudos colorés",
                copyRoleColorInProfilePopout: "Permettre de cliquer sur la pastille de rôle dans les profils pour copier sa couleur"
            }
        }
    },
    settings,

    patches: [
        {
            find: "M0 4C0 1.79086 1.79086 0 4 0H16C18.2091 0 20 1.79086 20 4V16C20 18.2091 18.2091 20 16 20H4C1.79086 20 0 18.2091 0 16V4Z",
            replacement: {
                match: /,viewBox:"0 0 20 20"/,
                replace: "$&,onClick:()=>$self.copyToClipBoard(arguments[0].color),style:{cursor:'pointer'}"
            }
        },
        {
            find: '"dot"===',
            all: true,
            noWarn: true,
            predicate: () => settings.store.bothStyles,
            replacement: {
                match: /"(?:username|dot)"===\i(?!\.\i)/g,
                replace: "true"
            }
        },
        {
            find: "#{intl::ADD_ROLE_A11Y_LABEL}",
            all: true,
            noWarn: true,
            predicate: () => settings.store.copyRoleColorInProfilePopout && !settings.store.bothStyles,
            replacement: {
                match: /"dot"===\i/,
                replace: "true"
            }
        },
        {
            find: ".roleVerifiedIcon",
            all: true,
            noWarn: true,
            predicate: () => settings.store.copyRoleColorInProfilePopout && !settings.store.bothStyles,
            replacement: {
                match: /"dot"===\i/,
                replace: "true"
            }
        }
    ],

    copyToClipBoard(color: string) {
        void copyWithToast(color);
    }
});
