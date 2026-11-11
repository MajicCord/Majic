/*
 * Majic — ChatButtonsAPI core plugin
 */

import { _injectChatBarButtons } from "@api/chatButtons";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ChatButtonsAPI",
    description: "Lets plugins add buttons to the chat bar",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des boutons à la barre de saisie"
        }
    },
    required: true,

    patches: [
        {
            find: '"sticker")',
            replacement: {
                match: /(?<=0===(\i)\.length\)\?null:\(0,\i\.jsxs?\)\("div",\{className:\i\.\i,children:)\1(?=\})/,
                replace: "$self.injectButtons($1,arguments[0])"
            }
        }
    ],

    injectButtons: _injectChatBarButtons
});
