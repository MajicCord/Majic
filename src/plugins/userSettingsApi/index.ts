/*
 * Majic — UserSettingsAPI core plugin
 */

import { _installUserSettings } from "@api/userSettings";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "UserSettingsAPI",
    description: "Lets plugins read and change Discord's own user settings",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins de lire et modifier les réglages Discord de l'utilisateur"
        }
    },
    required: true,
    startAt: "Init",

    start: _installUserSettings
});
