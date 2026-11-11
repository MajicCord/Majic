/*
 * Majic — NoProfileThemes plugin
 */

import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";

export default definePlugin({
    name: "NoProfileThemes",
    description: "Removes Nitro profile themes from everyone but yourself",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Retire les thèmes de profil Nitro de tout le monde sauf toi"
        }
    },

    patches: [
        {
            find: "canEditThemes(){",
            replacement: {
                match: /get canEditThemes\(\){return /,
                replace: "$&$self.isCurrentUser(this?.userId)&&"
            }
        }
    ],

    isCurrentUser: (userId: string) => userId === Stores.UserStore.getCurrentUser()?.id
});
