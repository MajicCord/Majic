/*
 * Majic — BetterGifPicker plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "BetterGifPicker",
    description: "Makes the GIF picker open on the Favourites category by default",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ouvre le sélecteur de GIF directement sur la catégorie Favoris"
        }
    },

    patches: [
        {
            find: "renderHeaderContent(){",
            replacement: {
                match: /(?<=state={resultType:)null/,
                replace: '"Favorites"'
            }
        }
    ]
});
