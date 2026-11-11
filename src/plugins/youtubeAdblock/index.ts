/*
 * Majic — YoutubeAdblock plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "YoutubeAdblock",
    description: "Blocks ads in YouTube embeds and the Watch Together activity, using AdGuard",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Bloque les pubs des vidéos YouTube intégrées et de l'activité Watch Together, avec AdGuard"
        }
    }
});
