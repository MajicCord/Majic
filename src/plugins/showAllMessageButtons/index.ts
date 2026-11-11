/*
 * Majic — ShowAllMessageButtons plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always shows all message buttons, without having to hold Shift",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche toujours tous les boutons des messages, sans avoir à maintenir Maj"
        }
    },

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}),children",
            replacement: {
                match: /isExpanded:\i&&(.+?),/,
                replace: "isExpanded:$1,"
            }
        }
    ]
});
