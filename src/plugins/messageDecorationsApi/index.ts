/*
 * Majic — MessageDecorationsAPI core plugin
 */

import { _renderDecorations, _withAccessories } from "@api/messageDecorations";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MessageDecorationsAPI",
    description: "Lets plugins add elements under messages and decorations next to author names",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des éléments sous les messages et des décorations à côté des auteurs"
        }
    },
    required: true,

    css: [
        ".majic-message-decorations-wrapper { display: inline-flex; align-items: center; justify-content: center; gap: 0.25em; }",
        ".majic-message-decorations-wrapper:not(:empty) { margin-left: 0.25em; position: relative; vertical-align: top; top: 0.1rem; height: calc(1rem + 4px); max-height: calc(1rem + 4px); }"
    ].join(" "),

    patches: [
        {
            find: "#{intl::REMOVE_ATTACHMENT_BODY}",
            replacement: {
                match: /(?<=children:)(\[[^\]]{0,100}?this\.renderSuppressConfirmModal\(\)[^\]]{0,100}?\])/,
                replace: "$self.withAccessories($1,this?.props)"
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
