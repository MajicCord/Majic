/*
 * Majic — MessagePopoverAPI core plugin
 */

import { _renderPopoverButtons } from "@api/messagePopover";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MessagePopoverAPI",
    description: "Lets plugins add buttons to the bar shown when hovering a message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des boutons à la barre qui apparaît au survol d'un message"
        }
    },
    required: true,

    patches: [
        {
            find: "#{intl::MESSAGE_UTILITIES_A11Y_LABEL}),children",
            replacement: {
                match: /(?<=\{channel:(\i),message:(\i),canCopy:[^]+?)return\(0,(\i)\.jsxs\)\(\3\.Fragment,\{children:\[(?=[^]{0,120}?\(0,\3\.jsx\)\((\i\.\i),\{label:)/,
                replace: "$&$self.renderButtons({channel:$1,message:$2},$4),"
            }
        }
    ],

    renderButtons: _renderPopoverButtons
});
