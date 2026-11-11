/*
 * Majic — PermissionFreeWill plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    lockout: {
        type: OptionType.BOOLEAN,
        description: "Bypass the permission lockout prevention (\"Pretty sure you don't want to do this\")",
        default: true,
        restartNeeded: true
    },
    onboarding: {
        type: OptionType.BOOLEAN,
        description: "Bypass the onboarding requirements (\"Making this change will make your server incompatible [...]\")",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "PermissionFreeWill",
    description: "Disables the client-side restrictions on channel permission management",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Désactive les restrictions locales sur la gestion des permissions des salons",
            options: {
                lockout: "Ignorer la protection contre le verrouillage des permissions (« Tu es sûr de vouloir faire ça ? »)",
                onboarding: "Ignorer les exigences de l'accueil (« Ce changement rendra ton serveur incompatible [...] »)"
            }
        }
    },
    settings,

    patches: [
        {
            find: "#{intl::STAGE_CHANNEL_CANNOT_OVERWRITE_PERMISSION}",
            predicate: () => settings.store.lockout,
            replacement: {
                match: /case"DENY":.{0,50}if\((?=\i\.\i\.can)/,
                replace: "$&true||"
            }
        },
        {
            find: "#{intl::ONBOARDING_CHANNEL_THRESHOLD_WARNING}",
            predicate: () => settings.store.onboarding,
            replacement: [
                {
                    match: /async function(?: \i)?\(\i,\i\){(?=.{0,60}?removingView:)/,
                    replace: "$&return true;"
                },
                {
                    match: /async function(?: \i)?\(\i,\i,\i\){(?=.{0,80}?\.permissionOverwrites)/,
                    replace: "$&return true;"
                }
            ]
        }
    ]
});
