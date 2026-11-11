/*
 * Majic — RevealAllSpoilers plugin
 */

import { IS_MAC } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { findCssClassesLazy } from "@webpack";

const SpoilerClasses = findCssClassesLazy("spoilerContent", "hidden");
const MessagesClasses = findCssClassesLazy("messagesWrapper", "navigationDescription");

export default definePlugin({
    name: "RevealAllSpoilers",
    description: "Reveals all spoilers in a message with Ctrl+click on a spoiler, or in the whole chat with Ctrl+Shift+click",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Révèle tous les spoilers d'un message avec Ctrl+clic sur un spoiler, ou de tout le salon avec Ctrl+Maj+clic"
        }
    },

    patches: [
        {
            find: ".removeObscurity,",
            replacement: {
                match: /(?<=removeObscurity(?:",|=)(\i)=>{)/,
                replace: (_: string, event: string) => `$self.reveal(${event});`
            }
        }
    ],

    reveal(event: MouseEvent) {
        const { ctrlKey, metaKey, shiftKey, target } = event;
        if (!(IS_MAC ? metaKey : ctrlKey)) return;

        const { spoilerContent, hidden } = SpoilerClasses;
        const { messagesWrapper } = MessagesClasses;

        const parent = shiftKey
            ? document.querySelector(`div.${messagesWrapper}`)
            : (target as HTMLSpanElement).parentElement;

        for (const spoiler of parent?.querySelectorAll(`span.${spoilerContent}.${hidden}`) ?? []) {
            (spoiler as HTMLSpanElement).click();
        }
    }
});
