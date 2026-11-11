/*
 * Majic — AlwaysExpandRoles plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "AlwaysExpandRoles",
    description: "Always expands the role list in profile popouts",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Déplie toujours la liste des rôles dans les profils"
        }
    },

    patches: [
        {
            find: "hasDeveloperContextMenu:",
            replacement: [
                {
                    match: /(?<=\?\i\.current\[\i\].{0,100}?)useState\(!1\)/,
                    replace: "useState(!0)"
                },
                {
                    match: /(?<=useLayoutEffect\(\(\)=>\{if\()\i/,
                    replace: "false"
                }
            ]
        }
    ]
});
