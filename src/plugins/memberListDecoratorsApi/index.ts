/*
 * Majic — MemberListDecoratorsAPI core plugin
 */

import { _renderMemberListDecorators } from "@api/memberListDecorators";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MemberListDecoratorsAPI",
    description: "Lets plugins add decorations next to names in the member list and DM list",
    authors: [{ name: "SnailyStudios" }],
    required: true,

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
