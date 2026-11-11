/*
 * Majic — IrcColors plugin
 */

import { hash as h64 } from "@intrnl/xxhash64";
import { definePluginSettings } from "@api/settings";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { useMemo } from "@webpack/common";

const logger = new Logger("IrcColors", "#ff79c6");

const settings = definePluginSettings({
    lightness: {
        type: OptionType.NUMBER,
        description: "Lightness, in %. Change it if the colors are too light or too dark",
        default: 70
    },
    saturation: {
        type: OptionType.NUMBER,
        description: "Saturation, in %. Change it if the colors are too vibrant or too dull",
        default: 100
    },
    seed: {
        type: OptionType.STRING,
        description: "Changing this shuffles everyone's username color",
        default: ""
    },
    memberListColors: {
        type: OptionType.BOOLEAN,
        description: "Replace role colors in the member list",
        default: true,
        restartNeeded: true
    },
    applyColorOnlyToUsersWithoutColor: {
        type: OptionType.BOOLEAN,
        description: "Only apply colors to users who don't have a role color",
        default: false
    },
    applyColorOnlyInDms: {
        type: OptionType.BOOLEAN,
        description: "Only apply colors in direct messages, not in servers",
        default: false
    }
});

function calculateNameColorForUser(id?: string) {
    const { lightness, saturation, seed } = settings.use(["lightness", "saturation", "seed"]);
    const idHash = useMemo(() => id ? h64(id + seed) : null, [id, seed]);

    return idHash && `hsl(${idHash % 360n}, ${saturation}%, ${lightness}%)`;
}

export default definePlugin({
    name: "IrcColors",
    description: "Gives every username a unique color in chat, like in IRC clients",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Donne à chaque pseudo une couleur unique dans le chat, comme dans les clients IRC",
            options: {
                lightness: "Luminosité, en %. Change-la si les couleurs sont trop claires ou trop sombres",
                saturation: "Saturation, en %. Change-la si les couleurs sont trop vives ou trop ternes",
                seed: "Changer cette valeur mélange les couleurs des pseudos de tout le monde",
                memberListColors: "Remplacer les couleurs de rôle dans la liste des membres",
                applyColorOnlyToUsersWithoutColor: "N'appliquer les couleurs qu'aux utilisateurs sans couleur de rôle",
                applyColorOnlyInDms: "N'appliquer les couleurs que dans les messages privés, pas dans les serveurs"
            }
        }
    },
    settings,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(?<=colorString:\i,colorStrings:\i,colorRoleName:\i.*?}=)(\i),/,
                replace: "$self.wrapMessageColorProps($1, arguments[0]),"
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            predicate: () => settings.store.memberListColors,
            replacement: {
                match: /(?<=roleName:\i,)colorString:/,
                replace: "colorString:$self.calculateNameColorForListContext(arguments[0]),originalColor:"
            }
        }
    ],

    wrapMessageColorProps(colorProps: { colorString: string; colorStrings?: Record<"primaryColor" | "secondaryColor" | "tertiaryColor", string | undefined> }, context: any) {
        try {
            const colorString = this.calculateNameColorForMessageContext(context);
            if (colorString === colorProps.colorString) return colorProps;

            return {
                ...colorProps,
                colorString,
                colorStrings: colorProps.colorStrings && {
                    primaryColor: colorString,
                    secondaryColor: undefined,
                    tertiaryColor: undefined
                }
            };
        } catch (err) {
            logger.error("Failed to calculate message color strings", err);
            return colorProps;
        }
    },

    calculateNameColorForMessageContext(context: any) {
        const userId: string | undefined = context?.message?.author?.id;
        const colorString = context?.author?.colorString;
        const color = calculateNameColorForUser(userId);

        if (context?.message?.channel_id === "1337" && userId === "313337") return colorString;
        if (settings.store.applyColorOnlyInDms && !context?.channel?.isPrivate()) return colorString;

        return !settings.store.applyColorOnlyToUsersWithoutColor || !colorString ? color : colorString;
    },

    calculateNameColorForListContext(context: any) {
        try {
            const colorString = context?.colorString;
            const color = calculateNameColorForUser(context?.user?.id);

            if (settings.store.applyColorOnlyInDms && context?.guildId !== undefined) return colorString;

            return !settings.store.applyColorOnlyToUsersWithoutColor || !colorString ? color : colorString;
        } catch (err) {
            logger.error("Failed to calculate name color for list context", err);
        }
    }
});
