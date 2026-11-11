/*
 * Majic — AlwaysTrust plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { filters, replaceExport } from "@webpack";
import { Stores } from "@webpack/common";

const settings = definePluginSettings({
    trustLinks: {
        type: OptionType.BOOLEAN,
        description: "Open links without the \"Leaving Discord\" warning",
        default: true
    },
    trustFiles: {
        type: OptionType.BOOLEAN,
        description: "Download files without the \"Potentially dangerous download\" warning",
        default: true
    }
});

const DANGEROUS_FILE_CHECK = filters.byCode(".toURLSafe(", ".pop()?.toLowerCase()");

let restoreFileCheck: (() => void) | null = null;
let restoreLinkCheck: (() => void) | null = null;

export default definePlugin({
    name: "AlwaysTrust",
    description: "Removes the \"Leaving Discord\" and \"Potentially dangerous download\" warnings",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Supprime les avertissements « Tu quittes Discord » et « Téléchargement potentiellement dangereux »",
            options: {
                trustLinks: "Ouvrir les liens sans l'avertissement « Tu quittes Discord »",
                trustFiles: "Télécharger les fichiers sans l'avertissement « Téléchargement potentiellement dangereux »"
            }
        }
    },
    settings,

    start() {
        const store = Stores.MaskedLinkStore;
        if (store) {
            const original = store.isTrustedDomain;
            store.isTrustedDomain = function (this: unknown, url: string) {
                return settings.store.trustLinks || original.call(this, url);
            };
            restoreLinkCheck = () => store.isTrustedDomain = original;
        }

        restoreFileCheck = replaceExport(DANGEROUS_FILE_CHECK, original => function (this: unknown, url: string) {
            return settings.store.trustFiles ? null : original.call(this, url);
        });
    },

    stop() {
        restoreLinkCheck?.();
        restoreFileCheck?.();
        restoreLinkCheck = restoreFileCheck = null;
    }
});
