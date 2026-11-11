/*
 * Majic — StartupTimings plugin
 */

import { definePlugin } from "@utils/types";

import SettingsUI from "../settingsUi";
import StartupTimingPage, { s } from "./StartupTimingPage";

const ENTRY_KEY = "majic_startup_timings";

export default definePlugin({
    name: "StartupTimings",
    description: "Adds Startup Timings to the settings menu",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute les temps de démarrage au menu des paramètres"
        }
    },

    css: ".majic-st-heading { margin: 0 0 20px; color: var(--text-strong); font-size: 16px; font-weight: 600; }",

    start() {
        SettingsUI.customEntries.push({
            key: ENTRY_KEY,
            title: () => s("title"),
            Component: StartupTimingPage,
            Icon: "ClockIcon"
        });
    },

    stop() {
        const index = SettingsUI.customEntries.findIndex(entry => entry.key === ENTRY_KEY);
        if (index !== -1) SettingsUI.customEntries.splice(index, 1);
    }
});
