/*
 * Majic — ImageLink plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ImageLink",
    description: "Never hides image links in messages, even when they are the only content",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ne masque jamais les liens d'images dans les messages, même quand c'est leur seul contenu"
        }
    },

    patches: [
        {
            find: "linkCount:0,onlyLinks:!1",
            replacement: {
                match: /\i\.has\(\i\.type\)&&\(0,\i\.\i\)\(\i\)/,
                replace: "false"
            }
        }
    ]
});
