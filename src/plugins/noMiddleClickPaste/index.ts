/*
 * Majic — NoMiddleClickPaste plugin
 */

import { definePlugin } from "@utils/types";

const IS_LINUX = navigator.platform.toLowerCase().startsWith("linux");

function preventMiddleClick(e: MouseEvent) {
    if (e.button === 1) e.preventDefault();
}

export default definePlugin({
    name: "NoMiddleClickPaste",
    description: "Disables middle-click paste on Linux (Linux only)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Désactive le collage au clic molette sous Linux (Linux uniquement)"
        }
    },
    hidden: !IS_LINUX,

    start() {
        window.addEventListener("mouseup", preventMiddleClick);
    },

    stop() {
        window.removeEventListener("mouseup", preventMiddleClick);
    }
});
