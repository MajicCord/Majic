/*
 * Majic — FixYoutubeEmbeds plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "FixYoutubeEmbeds",
    description: "Bypasses YouTube videos being blocked from playing in Discord (for example by UMG)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Contourne le blocage de certaines vidéos YouTube dans Discord (par exemple par UMG)"
        }
    }
});
