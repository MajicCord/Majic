/*
 * Majic — Hello example plugin
 */

import { definePlugin } from "@utils/types";
import { Logger } from "@utils/logger";
import { ChatBarButton } from "@api/chatButtons";
import { showNotice } from "@api/notices";
import { showNotification } from "@api/notifications";
import { React, showToast, Stores } from "@webpack/common";

const logger = new Logger("Hello", "#ffb86c");

const SPARKLE_ICON = "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="#b18cff" d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>'
);

export default definePlugin({
    name: "Hello",
    description: "Example plugin showing how to use every Majic API",
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
    },

    onBeforeMessageSend(channelId, message) {
        logger.info(`Sending a message in ${channelId} (${message.content.length} characters)`);
    },

    onBeforeMessageEdit(channelId, messageId) {
        logger.info(`Editing message ${messageId} in ${channelId}`);
    },

    onMessageClick(message) {
        logger.info(`Clicked message ${message.id}`);
    },

    chatBarButtons: {
        sparkle: () => React.createElement(ChatBarButton, {
            tooltip: "Majic",
            onClick: () => showToast({ text: "Hello from the Majic chat bar button!", variant: "success" }),
            children: "✨"
        })
    },

    messagePopoverButtons: {
        sparkle: message => ({
            label: "Majic",
            icon: "✨",
            onClick: () => showToast({ text: `Message ${message.id} by ${message.author?.username}`, variant: "info" })
        })
    },

    badges: [
        {
            id: "sparkle",
            description: "Majic user",
            iconSrc: SPARKLE_ICON,
            shouldShow: userId => userId === Stores.UserStore?.getCurrentUser()?.id
        }
    ],

    memberListDecorators: {
        sparkle: ({ user }) => (user?.id === Stores.UserStore?.getCurrentUser()?.id ? "✨" : null)
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
