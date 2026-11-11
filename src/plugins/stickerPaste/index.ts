/*
 * Majic — StickerPaste plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "StickerPaste",
    description: "Picking a sticker in the sticker picker inserts it into the chat box instead of sending it right away",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Choisir un sticker l'insère dans la zone de saisie au lieu de l'envoyer directement"
        }
    },

    patches: [
        {
            find: '.STICKER_PICKER:return""',
            replacement: {
                match: /(?<=\){)if\(\i\.\i\.getUploadCount/,
                replace: "return true;$&"
            }
        }
    ]
});
