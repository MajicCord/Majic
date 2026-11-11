/*
 * Majic — PlainFolderIcon plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "PlainFolderIcon",
    description: "Hides the small server icons inside server folders",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque les petites icônes de serveurs dans les dossiers"
        }
    },

    css: ".majic-plainFolderIcon-plain { transition: none !important; transform: translateZ(0); background-color: color-mix(in oklab, var(--custom-folder-color, var(--badge-background-default)) 40%, transparent); }",

    patches: [
        {
            find: "#{intl::GUILD_FOLDER_TOOLTIP_A11Y_LABEL}",
            replacement: {
                match: /\.slice\(0,4\).+?\]:(\i),\[\i\.\i\]:!\1/,
                replace: (m: string, hasFolderButtonContent: string) => `${m},"majic-plainFolderIcon-plain":!${hasFolderButtonContent}`
            }
        }
    ]
});
