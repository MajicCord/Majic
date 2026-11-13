/*
 * Majic — MemberListDecoratorsAPI core plugin
 */

import { _renderMemberListDecorators } from "@api/memberListDecorators";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MemberListDecoratorsAPI",
    description: "Lets plugins add decorations next to names in the member list and DM list",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des décorations à côté des noms dans la liste des membres et des MP"
        }
    },
    required: true,

    css: [
        ".majic-member-list-decorators-wrapper { display: flex; align-items: center; justify-content: center; gap: 0.25em; }",
        ".majic-member-list-decorators-wrapper:not(:empty) { margin-left: 0.25em; }",
        "[class*=\"withDisplayNameStyles\"] [class^=\"name\"] { flex: initial; }"
    ].join(" "),

    patches: [
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /children:\[(?=[^]{0,300},lostPermissionTooltipText:)/,
                replace: '$&$self.render(arguments[0],"guild"),'
            }
        },
        {
            find: "PrivateChannel.renderAvatar",
            replacement: {
                match: /(?<=decorators:)(\i\.isSystemDM\(\)\?[^]+?:null)(?=,)/,
                replace: '[$self.render(arguments[0],"dm"),$1]'
            }
        }
    ],

    render: _renderMemberListDecorators
});
