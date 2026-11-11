/*
 * Majic — BetterUploadButton plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "BetterUploadButton",
    description: "Upload with a single click, open the menu with a right click",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Envoie un fichier en un seul clic, ouvre le menu avec un clic droit"
        }
    },

    patches: [
        {
            find: ".CHAT_INPUT_BUTTON_NOTIFICATION,",
            replacement: {
                match: /onClick:(\i\?void 0:\i)(?=,onDoubleClick:(\i\?void 0:\i),)/,
                replace: "$&,...$self.getOverrides(arguments[0],$1,$2)"
            }
        }
    ],

    getOverrides(props: any, onClick: unknown, onDoubleClick: unknown) {
        if (!props?.className?.includes("attachButton")) return {};
        return {
            onClick: onDoubleClick,
            onContextMenu: onClick
        };
    }
});
