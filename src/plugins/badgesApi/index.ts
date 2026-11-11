/*
 * Majic — BadgesAPI core plugin
 */

import { _getBadges } from "@api/badges";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "BadgesAPI",
    description: "Lets plugins add badges to user profiles",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des badges aux profils"
        }
    },
    required: true,

    patches: [
        {
            find: "getLegacyUsername(){",
            replacement: {
                match: /getBadges\(\)\{return\[([^]{0,100}?)\]\}/,
                replace: "getBadges(){const majic=$self.getBadges(this);return[...majic[0]??[],$1,...majic[1]??[]]}"
            }
        }
    ],

    getBadges: _getBadges
});
