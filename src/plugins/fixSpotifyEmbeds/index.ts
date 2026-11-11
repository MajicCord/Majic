/*
 * Majic — FixSpotifyEmbeds plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, makeRange, OptionType } from "@utils/types";

const settings = definePluginSettings({
    volume: {
        type: OptionType.SLIDER,
        description: "Volume % for Spotify embeds. Anything above 10% is very loud",
        markers: makeRange(0, 100, 10),
        stickToMarkers: false,
        default: 10
    }
});

export default definePlugin({
    name: "FixSpotifyEmbeds",
    description: "Fixes Spotify embeds being incredibly loud by letting you set their volume",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Corrige le son trop fort des lecteurs Spotify intégrés en permettant de régler leur volume",
            options: {
                volume: "Volume des lecteurs Spotify en %. Au-delà de 10 %, c'est très fort"
            }
        }
    },
    settings
});
