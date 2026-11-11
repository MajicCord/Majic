/*
 * Majic — ComponentExtractor core plugin
 */

import { definePlugin } from "@utils/types";
import { setColorPicker, setCreateScroller, setRoleMemberPopout } from "@webpack/common";

export default definePlugin({
    name: "ComponentExtractor",
    description: "Exposes Discord components that are bundled inside other modules",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Rend accessibles des composants de Discord regroupés dans d'autres modules"
        }
    },
    required: true,

    patches: [
        {
            find: "#{intl::USER_SETTINGS_PROFILE_COLOR_SELECT_COLOR}),focusProps:",
            replacement: {
                match: /(?=function (\i)\(\i\)\{let\{onChange:\i,onClose:\i,[^}]+?showEyeDropper:)/,
                replace: "$self.setColorPicker($1);"
            }
        },
        {
            find: /="ltr",orientation:\i="vertical"[^}]+?customTheme:/,
            replacement: {
                match: /(?=function (\i)\(\i,\i,\i\)\{.{0,20}?return function\(\i\)\{let\{[^}]+?="ltr",orientation:)/,
                replace: "$self.setCreateScroller($1);"
            }
        },
        {
            find: ".ROLE_MENTION)",
            replacement: {
                match: /function (\i)(?=.+?renderPopout:.{0,20}\1,\{guildId:\i,channelId:\i)/,
                replace: "$self.setRoleMemberPopout($1);$&"
            }
        }
    ],

    setCreateScroller,
    setColorPicker,
    setRoleMemberPopout
});
