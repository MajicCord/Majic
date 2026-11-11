/*
 * Majic — VolumeBooster plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, makeRange, OptionType } from "@utils/types";

const settings = definePluginSettings({
    multiplier: {
        type: OptionType.SLIDER,
        description: "Volume multiplier",
        markers: makeRange(1, 5, 0.5),
        default: 2,
        stickToMarkers: true
    }
});

export default definePlugin({
    name: "VolumeBooster",
    description: "Lets you set user and stream volume above the default maximum",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de régler le volume des utilisateurs et des streams au-delà du maximum par défaut",
            options: {
                multiplier: "Multiplicateur de volume"
            }
        }
    },
    settings,

    patches: [
        {
            find: "#{intl::USER_VOLUME}",
            replacement: {
                match: /(?<=maxValue:)\i\.isPlatformEmbedded\?(\i\.\i|200):(?:\i\.\i|100)(?=,)/,
                replace: (_: string, higherMaxVolume: string) => `${higherMaxVolume}*$self.settings.store.multiplier`
            }
        },
        {
            find: "currentVolume:",
            replacement: {
                match: /(?<=maxValue:)\i\.\i\?(\d+?):\d+?(?=,)/,
                replace: (_: string, higherMaxVolume: string) => `${higherMaxVolume}*$self.settings.store.multiplier`
            }
        },
        {
            find: "AudioContextSettingsMigrated",
            replacement: [
                {
                    match: /(?<=isLocalMute\(\i,\i\),volume:(\i).+?\(0,\i\.\i\)\(\i,\i,\{volume:)\1(?=\}\))/,
                    replace: "$&>200?200:$&"
                },
                {
                    match: /(?<=Object\.entries\(\i\.localMutes\).+?volume:).+?(?=,)/,
                    replace: "$&>200?200:$&"
                },
                {
                    match: /(?<=Object\.entries\(\i\.localVolumes\).+?volume:).+?(?=})/,
                    replace: "$&>200?200:$&"
                }
            ]
        },
        {
            find: '="MediaEngineStore",',
            replacement: {
                match: /(\.settings\.audioContextSettings.+?)(\i\[\i\])=(\i\.volume)(.+?setLocalVolume\(\i,).+?\)/,
                replace: (_: string, rest1: string, localVolume: string, syncVolume: string, rest2: string) => rest1
                    + `(${localVolume}>200?void 0:${localVolume}=${syncVolume})`
                    + rest2
                    + `${localVolume}??${syncVolume})`
            }
        }
    ]
});
