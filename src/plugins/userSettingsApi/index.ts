/*
 * Majic — UserSettingsAPI core plugin
 */

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

    patches: [
        {
            find: ",updateSetting:",
            replacement: [
                {
                    match: /\.updateAsync\(.+?(?=,useSetting:)/,
                    replace: "$&,userSettingsAPIGroup:arguments[0],userSettingsAPIName:arguments[1]"
                },
                {
                    match: /updateSetting:.{0,100}SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE/,
                    replace: "userSettingsAPIGroup:arguments[0].userSettingsAPIGroup,userSettingsAPIName:arguments[0].userSettingsAPIName,$&"
                },
                {
                    match: /updateSetting:.{0,60}USER_SETTINGS_OVERRIDE_CLEAR/,
                    replace: "userSettingsAPIGroup:arguments[0].userSettingsAPIGroup,userSettingsAPIName:arguments[0].userSettingsAPIName,$&"
                }
            ]
        }
    ]
});
