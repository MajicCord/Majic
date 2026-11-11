/*
 * Majic — DynamicImageModalAPI core plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "DynamicImageModalAPI",
    description: "Lets plugins open image viewers with only a width or only a height",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ouvrir la visionneuse d'images avec seulement une largeur ou une hauteur"
        }
    },

    patches: [
        {
            find: ".renderLinkComponent",
            replacement: {
                match: /(?<=\i=)(null!=\i&&0!==\i)&&(null!=\i&&0!==\i)/,
                replace: "($1)||($2)"
            }
        }
    ]
});
