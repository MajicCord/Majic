/*
 * Majic — SecretRingToneEnabler plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    onlySnow: {
        type: OptionType.BOOLEAN,
        description: "Only play the Snow Halation theme",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SecretRingToneEnabler",
    description: "Always plays the secret version of the Discord ringtone (except during special ringtone events)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Joue toujours la version secrète de la sonnerie de Discord (sauf pendant les événements spéciaux)",
            options: {
                onlySnow: "Ne jouer que le thème Snow Halation"
            }
        }
    },
    settings,

    patches: [
        {
            find: '"call_ringing_beat"',
            replacement: [
                {
                    match: /500!==\i\(\)\.random\(1,1e3\)/,
                    replace: "false"
                },
                {
                    predicate: () => settings.store.onlySnow,
                    match: /"call_ringing_beat",/,
                    replace: ""
                }
            ]
        }
    ]
});
