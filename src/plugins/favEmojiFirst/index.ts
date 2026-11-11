/*
 * Majic — FavoriteEmojiFirst plugin
 */

import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";

interface EmojiAutocompleteState {
    query?: {
        type: string;
        typeInfo: { sentinel: string };
        results: { emojis: any[] & { sliceTo?: number } };
    };
}

export default definePlugin({
    name: "FavoriteEmojiFirst",
    description: "Puts your favorite emojis first in the emoji autocomplete",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Place tes emojis favoris en premier dans l'autocomplétion des emojis"
        }
    },

    patches: [
        {
            find: "renderResults({results:",
            replacement: {
                match: /let \i=.{1,100}renderResults\({results:(\i)\.query\.results,/,
                replace: "$self.sortEmojis($1);$&"
            }
        },
        {
            find: "numEmojiResults:",
            replacement: {
                match: /,maxCount:(\i)(.{1,500}\i)=(\i)\.slice\(0,(Math\.max\(\d+?,\i(?:-\i\.length){2}\))\)/,
                replace: ",maxCount:Infinity$2=($3.sliceTo = $4, $3)"
            }
        }
    ],

    sortEmojis({ query }: EmojiAutocompleteState) {
        if (
            query?.type !== "EMOJIS_AND_STICKERS"
            || query.typeInfo?.sentinel !== ":"
            || !query.results?.emojis?.length
        ) return;

        const emojiContext = Stores.EmojiStore.getDisambiguatedEmojiContext();

        query.results.emojis = query.results.emojis.sort((a, b) => {
            const aIsFavorite = emojiContext.isFavoriteEmojiWithoutFetchingLatest(a);
            const bIsFavorite = emojiContext.isFavoriteEmojiWithoutFetchingLatest(b);

            if (aIsFavorite && !bIsFavorite) return -1;
            if (!aIsFavorite && bIsFavorite) return 1;
            return 0;
        }).slice(0, query.results.emojis.sliceTo ?? Infinity);
    }
});
