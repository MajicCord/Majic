/*
 * Majic — F8Break plugin
 */

import { definePlugin } from "@utils/types";

function onKeyDown(e: KeyboardEvent) {
    if (e.code === "F8") {
        debugger;
    }
}

export default definePlugin({
    name: "F8Break",
    description: "Pauses the client when you press F8 with DevTools (and breakpoints) open",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Met le client en pause quand tu appuies sur F8 avec les DevTools (et les points d'arrêt) ouverts"
        }
    },

    start() {
        window.addEventListener("keydown", onKeyDown);
    },

    stop() {
        window.removeEventListener("keydown", onKeyDown);
    }
});
