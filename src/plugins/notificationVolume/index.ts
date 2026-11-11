/*
 * Majic — NotificationVolume plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    notificationVolume: {
        type: OptionType.SLIDER,
        description: "Notification volume",
        markers: [0, 25, 50, 75, 100],
        default: 100,
        stickToMarkers: false
    }
});

export default definePlugin({
    name: "NotificationVolume",
    description: "Sets a separate volume for notifications and in-app sounds",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Règle un volume à part pour les notifications et les sons de l'application",
            options: {
                notificationVolume: "Volume des notifications"
            }
        }
    },
    settings,

    patches: [
        {
            find: "ensureAudio(){",
            replacement: {
                match: /(?=Math\.min\(\i\.\i\.getOutputVolume\(\)\/100)/g,
                replace: "$self.settings.store.notificationVolume/100*"
            }
        }
    ]
});
