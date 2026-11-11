/*
 * Majic — NoTypingAnimation plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoTypingAnimation",
    description: "Stops the animated dots of the \"is typing...\" indicator",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Arrête l'animation des points de l'indicateur « est en train d'écrire… »"
        }
    },

    patches: [
        {
            find: "dotCycle",
            replacement: {
                match: /\{focused:(\i)\}=(?=\(0,\i\.\i\)\(\))/g,
                replace: "{majicNeverFocused:$1=!1}="
            }
        }
    ]
});
