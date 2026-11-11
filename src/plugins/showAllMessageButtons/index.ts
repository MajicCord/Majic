/*
 * Majic — ShowAllMessageButtons plugin
 * Ported from Vencord, GPL-3.0-or-later
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ShowAllMessageButtons",
    description: "Always show all message buttons, whether or not you are holding Shift.",
    authors: [{ name: "Nuckyz" }],
    enabledByDefault: true,

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
