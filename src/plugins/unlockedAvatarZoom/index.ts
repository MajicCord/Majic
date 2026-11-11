/*
 * Majic — UnlockedAvatarZoom plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, makeRange, OptionType } from "@utils/types";

const settings = definePluginSettings({
    zoomMultiplier: {
        type: OptionType.SLIDER,
        description: "Zoom multiplier",
        markers: makeRange(2, 16),
        default: 4
    }
});

export default definePlugin({
    name: "UnlockedAvatarZoom",
    description: "Lets you zoom in further in the image crop tool when changing your avatar",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de zoomer davantage dans l'outil de recadrage quand tu changes ton avatar",
            options: {
                zoomMultiplier: "Multiplicateur de zoom"
            }
        }
    },
    settings,

    patches: [
        {
            find: "#{intl::AVATAR_UPLOAD_EDIT_MEDIA}",
            replacement: {
                match: /maxValue:\d/,
                replace: "maxValue:$self.settings.store.zoomMultiplier"
            }
        }
    ]
});
