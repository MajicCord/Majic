/*
 * Majic — Hello example plugin
 */

import { showNotice } from "@api/notices";
import { showNotification } from "@api/notifications";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";
import { createStrings } from "@i18n";
import { showToast, Stores } from "@webpack/common";

const s = createStrings({
    en: { loaded: "Majic loaded, hi {name}!" },
    fr: { loaded: "Majic est chargé, salut {name} !" }
});

const logger = new Logger("Hello", "#ffb86c");

export default definePlugin({
    name: "Hello",
    description: "Example plugin showing a few Majic APIs",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Plugin d'exemple qui montre quelques API de Majic"
        }
    },
    enabledByDefault: true,

    start() {
        const username = Stores.UserStore?.getCurrentUser()?.username;
        logger.info("Hello from Majic! Logged in as", username);
        showToast({ text: s("loaded", { name: username }), variant: "success" });
    },

    commands: [
        {
            name: "majic",
            description: "Shows the running Majic version",
            execute() {
                showToast({ text: `Majic v${Majic.version} is running`, variant: "success" });
            }
        },
        {
            name: "majic-notice",
            description: "Shows a test banner at the top of Discord",
            execute() {
                showNotice({ message: "This is a Majic notice", buttonText: "Nice", onButtonClick: () => showToast({ text: "Button clicked" }) });
            }
        },
        {
            name: "majic-notify",
            description: "Shows a test Majic notification",
            execute() {
                void showNotification({ title: "Majic", body: "This is a Majic notification" });
            }
        }
    ]
});
