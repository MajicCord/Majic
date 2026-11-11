/*
 * Majic — oneko plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "oneko",
    description: "A cat that follows your mouse",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Un chat qui suit ta souris"
        }
    },

    start() {
        fetch("https://raw.githubusercontent.com/adryd325/oneko.js/c4ee66353b11a44e4a5b7e914a81f8d33111555e/oneko.js")
            .then(x => x.text())
            .then(script => script
                .replace("./oneko.gif", "https://raw.githubusercontent.com/adryd325/oneko.js/14bab15a755d0e35cd4ae19c931d96d306f99f42/oneko.gif")
                .replace("(isReducedMotion)", "(false)"))
            .then(eval);
    },

    stop() {
        document.getElementById("oneko")?.remove();
    }
});
