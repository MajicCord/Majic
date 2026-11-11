/*
 * Majic — MessageDecorationsAPI core plugin
 */

import { _renderDecorations, _withAccessories } from "@api/messageDecorations";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MessageDecorationsAPI",
    description: "Lets plugins add elements under messages and decorations next to author names",
    authors: [{ name: "SnailyStudios" }],
    required: true,

    patches: [
        {
            find: "#{intl::REMOVE_ATTACHMENT_BODY}",
            replacement: {
                match: /(?<=children:)(\[[^\]]{0,100}?this\.renderSuppressConfirmModal\(\)[^\]]{0,100}?\])/,
                replace: "$self.withAccessories($1,this?.props)"
            }
        },
        {
            find: "}renderStickersAccessories(",
            replacement: {
                match: /(?<=this\.props,\i,\[)"message",/,
                replace: ""
            }
        },
        {
            find: "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            replacement: {
                match: /(?<=#{intl::GUILD_COMMUNICATION_DISABLED_BOTTOM_SHEET_TITLE}[^]+?renderPopout:[^]+?)(?=\])/,
                replace: ",$self.renderDecorations(arguments[0])"
            }
        }
    ],

    withAccessories: _withAccessories,
    renderDecorations: _renderDecorations
});
