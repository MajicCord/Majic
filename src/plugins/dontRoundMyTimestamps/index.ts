/*
 * Majic — DontRoundMyTimestamps plugin
 */

import { definePlugin } from "@utils/types";
import { moment } from "@webpack/common";

export default definePlugin({
    name: "DontRoundMyTimestamps",
    description: "Always rounds relative timestamps down, so 7.6 years shows as 7 years instead of 8",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Arrondit toujours les dates relatives vers le bas : 7,6 ans s'affiche « 7 ans » au lieu de « 8 ans »"
        }
    },

    start() {
        moment.relativeTimeRounding(Math.floor);
    },

    stop() {
        moment.relativeTimeRounding(Math.round);
    }
});
