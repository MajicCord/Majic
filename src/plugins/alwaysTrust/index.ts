/*
 * Majic — AlwaysTrust plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    domain: {
        type: OptionType.BOOLEAN,
        description: "Open links without the \"Leaving Discord\" warning",
        default: true,
        restartNeeded: true
    },
    file: {
        type: OptionType.BOOLEAN,
        description: "Download files without the \"Potentially dangerous download\" warning",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "AlwaysTrust",
    description: "Removes the \"Leaving Discord\" and \"Potentially dangerous download\" warnings",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Supprime les avertissements « Tu quittes Discord » et « Téléchargement potentiellement dangereux »",
            options: {
                domain: "Ouvrir les liens sans l'avertissement « Tu quittes Discord »",
                file: "Télécharger les fichiers sans l'avertissement « Téléchargement potentiellement dangereux »"
            }
        }
    },
    settings,

    patches: [
        {
            find: '="MaskedLinkStore",',
            predicate: () => settings.store.domain,
            replacement: {
                match: /(?<=isTrustedDomain\(\i\){)return \i\(\i\)/,
                replace: "return true"
            }
        },
        {
            find: "bitbucket.org",
            predicate: () => settings.store.file,
            replacement: {
                match: /function \i\(\i\){(?=.{0,30}pathname:\i)/,
                replace: "$&return null;"
            }
        }
    ]
});
