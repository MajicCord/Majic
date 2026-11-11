/*
 * Majic — Hello example plugin
 */

import { definePlugin } from "@utils/types";
import { Logger } from "@utils/logger";
import { findByProps } from "@webpack";

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

    flux: {
        CONNECTION_OPEN() {
            logger.info("Logged in as", findByProps("getCurrentUser", "getUser")?.getCurrentUser()?.username);
        }
    },

    start() {
        logger.info("Hello from Majic!");
    }
});
