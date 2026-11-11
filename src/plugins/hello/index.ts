/*
 * Majic — Hello example plugin
 */

import { definePlugin } from "@utils/types";
import { Logger } from "@utils/logger";
import { showToast, Stores } from "@webpack/common";

const logger = new Logger("Hello", "#ffb86c");

export default definePlugin({
    name: "Hello",
    description: "Example plugin: logs on startup and adds a purple line at the top of Discord.",
    authors: [{ name: "SnailyStudios" }],
    enabledByDefault: true,

    css: `body::before {
        content: "";
        position: fixed;
        inset: 0 0 auto 0;
        height: 2px;
        background: linear-gradient(90deg, #7c3aed, #ec4899);
        z-index: 9999;
        pointer-events: none;
    }`,

    start() {
        const username = Stores.UserStore?.getCurrentUser()?.username;
        logger.info("Hello from Majic! Logged in as", username);
        showToast({ text: `Majic loaded, hi ${username}!`, variant: "success" });
    }
});
