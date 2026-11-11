/*
 * Majic — ColorSighted plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ColorSighted",
    description: "Removes the colorblind-friendly shapes from status icons, like Discord from 2015 to 2017",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Retire les formes pour daltoniens des icônes de statut, comme sur Discord de 2015 à 2017"
        }
    },

    patches: [
        {
            find: "Masks.STATUS_ONLINE",
            replacement: {
                match: /Masks\.STATUS_(?:IDLE|DND|STREAMING|OFFLINE)/g,
                replace: "Masks.STATUS_ONLINE"
            }
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            replacement: {
                match: /(fromIsMobile:\i=!0,.+?)status:(\i)/,
                replace: '$1status_$:$2="online"'
            }
        }
    ]
});
