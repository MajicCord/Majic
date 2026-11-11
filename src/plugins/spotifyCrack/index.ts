/*
 * Majic — SpotifyCrack plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    noSpotifyAutoPause: {
        type: OptionType.BOOLEAN,
        description: "Disable Spotify auto-pause",
        default: true,
        restartNeeded: true
    },
    keepSpotifyActivityOnIdle: {
        type: OptionType.BOOLEAN,
        description: "Keep the Spotify activity playing when idle",
        default: false,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "SpotifyCrack",
    description: "Free listen along, no auto-pausing in voice chat, and keeps the activity playing when idle",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Écoute en groupe gratuite, plus de pause automatique en vocal, et l'activité continue quand tu es inactif",
            options: {
                noSpotifyAutoPause: "Désactiver la pause automatique de Spotify",
                keepSpotifyActivityOnIdle: "Garder l'activité Spotify quand tu es inactif"
            }
        }
    },
    settings,

    patches: [
        {
            find: 'dispatch({type:"SPOTIFY_PROFILE_UPDATE"',
            replacement: {
                match: /SPOTIFY_PROFILE_UPDATE.+?isPremium:(?="premium"===(\i)\.body\.product)/,
                replace: (m: string, req: string) => `${m}(${req}.body.product="premium")&&`
            }
        },
        {
            find: "}getPlayableComputerDevices(){",
            replacement: [
                {
                    predicate: () => settings.store.noSpotifyAutoPause,
                    match: /(?<=function \i\(\){)(?=.{0,200}SPOTIFY_AUTO_PAUSED\))/,
                    replace: "return;"
                },
                {
                    predicate: () => settings.store.keepSpotifyActivityOnIdle,
                    match: /(shouldShowActivity\(\){.{0,50})&&!\i\.\i\.isIdle\(\)/,
                    replace: "$1"
                }
            ]
        }
    ]
});
