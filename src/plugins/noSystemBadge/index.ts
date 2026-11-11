/*
 * Majic — NoSystemBadge plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoSystemBadge",
    description: "Disables the unread count badge on the taskbar and system tray",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Désactive le badge de messages non lus sur la barre des tâches et la zone de notification"
        }
    },

    patches: [
        {
            find: ",setSystemTrayApplications",
            replacement: [
                {
                    match: /setBadge\(\i\).+?},/,
                    replace: "setBadge(){},"
                },
                {
                    match: /setSystemTrayIcon\(\i\).+?},/,
                    replace: "setSystemTrayIcon(){},"
                }
            ]
        }
    ]
});
