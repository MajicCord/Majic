/*
 * Majic — NoMaskedUrlPaste plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoMaskedUrlPaste",
    description: "Pasting a link while text is selected no longer turns it into a masked link",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Coller un lien pendant qu'un texte est sélectionné ne crée plus de lien masqué"
        }
    },

    patches: [
        {
            find: ".selection,preventEmojiSurrogates:",
            replacement: {
                match: /if\(null!=\i.selection&&\i.\i.isExpanded\(\i.selection\)\)/,
                replace: "if(false)"
            }
        }
    ]
});
