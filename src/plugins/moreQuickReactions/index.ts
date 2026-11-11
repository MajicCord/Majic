/*
 * Majic — MoreQuickReactions plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    reactionCount: {
        type: OptionType.NUMBER,
        description: "Number of reactions (0-42)",
        default: 5,
        min: 0,
        max: 42
    }
});

export default definePlugin({
    name: "MoreQuickReactions",
    description: "Increases the number of reactions in the quick react hover menu",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Augmente le nombre de réactions dans le menu de réaction rapide au survol",
            options: {
                reactionCount: "Nombre de réactions (0 à 42)"
            }
        }
    },
    settings,

    get reactionCount() {
        return settings.store.reactionCount;
    },

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}),children",
            replacement: {
                match: /(?<=length>=3\?.{0,40})\.slice\(0,3\)/,
                replace: ".slice(0,$self.reactionCount)"
            }
        }
    ]
});
