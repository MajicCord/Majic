/*
 * Majic — GifPaste plugin
 */

import { insertTextIntoChatInputBox } from "@utils/discord";
import { definePlugin } from "@utils/types";
import { ExpressionPickerStore } from "@webpack/common";

export default definePlugin({
    name: "GifPaste",
    description: "Picking a GIF in the GIF picker inserts its link into the chat box instead of sending it right away",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Choisir un GIF dans le sélecteur insère son lien dans la zone de saisie au lieu de l'envoyer directement"
        }
    },

    patches: [
        {
            find: "handleSelectGIF=",
            replacement: {
                match: /handleSelectGIF=\((\i),\i\)=>\{/,
                replace: "$&if (!this?.props?.className) return $self.handleSelect($1);"
            }
        }
    ],

    handleSelect(gif?: { url: string }) {
        if (!gif) return;
        insertTextIntoChatInputBox(gif.url + " ");
        ExpressionPickerStore.closeExpressionPicker();
    }
});
