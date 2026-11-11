/*
 * Majic — BlurNSFW plugin
 */

import { definePluginSettings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { definePlugin, OptionType } from "@utils/types";

const STYLE_ID = "majic-blur-nsfw";

function setCss() {
    enableStyle(STYLE_ID, `
        .majic-nsfw-img [class*=imageContainer],
        .majic-nsfw-img [class*=wrapperPaused] {
            filter: blur(${settings.store.blurAmount}px);
            transition: filter 0.2s;
            &:hover {
                filter: blur(0);
            }
        }
    `);
}

const settings = definePluginSettings({
    blurAmount: {
        type: OptionType.NUMBER,
        description: "Blur amount (in pixels)",
        default: 10,
        onChange: setCss,
        min: 0
    },
    ignoredChannels: {
        type: OptionType.STRING,
        description: "Channel IDs to not blur attachments in, separated by a space or comma",
        default: "",
        multiline: true
    }
});

export default definePlugin({
    name: "BlurNSFW",
    description: "Blurs attachments in NSFW channels until hovered",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Floute les pièces jointes des salons NSFW tant qu'on ne les survole pas",
            options: {
                blurAmount: "Intensité du flou (en pixels)",
                ignoredChannels: "ID des salons où ne pas flouter les pièces jointes, séparés par un espace ou une virgule"
            }
        }
    },
    settings,

    shouldBlur(channel?: { nsfw?: boolean; id: string; parent_id: string }) {
        if (!channel?.nsfw) return false;

        const { ignoredChannels } = settings.store;
        return !ignoredChannels.includes(channel.id) && !ignoredChannels.includes(channel.parent_id);
    },

    patches: [
        {
            find: "}renderStickersAccessories(",
            replacement: {
                match: /(\.renderReactions\(\i\).+?className:)/,
                replace: '$&($self.shouldBlur(this?.props?.channel)?"majic-nsfw-img ":"")+'
            }
        }
    ],

    start() {
        setCss();
    },

    stop() {
        disableStyle(STYLE_ID);
    }
});
