/*
 * Majic — MessageUpdaterAPI core plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MessageUpdaterAPI",
    description: "Lets plugins update and re-render messages",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins de mettre à jour et de réafficher des messages"
        }
    },

    patches: [
        {
            find: "}renderStickersAccessories(",
            replacement: {
                match: /(?<=this.props,\i,\[)"message",/,
                replace: ""
            }
        }
    ]
});
