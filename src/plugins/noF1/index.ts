/*
 * Majic — NoF1 plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoF1",
    description: "Stops F1 from opening Discord's help center",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Empêche F1 d'ouvrir le centre d'aide de Discord"
        }
    },

    patches: [
        {
            find: ',"f1"],comboKeysBindGlobal:',
            replacement: {
                match: ',"f1"],comboKeysBindGlobal:',
                replace: "],comboKeysBindGlobal:"
            }
        }
    ]
});
