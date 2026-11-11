/*
 * Majic — RoleColorEverywhere plugin
 */

import { definePluginSettings } from "@api/settings";
import { hasGuildFeature } from "@utils/discord";
import { Logger } from "@utils/logger";
import { definePlugin, makeRange, OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { Stores } from "@webpack/common";

interface ColorStrings {
    primaryColor: string;
    secondaryColor?: string;
    tertiaryColor?: string;
}

interface Colored {
    colorString?: string;
    colorStrings?: ColorStrings;
}

const logger = new Logger("RoleColorEverywhere", "#ff79c6");

const useMessageAuthor = findByCodeLazy('"Result cannot be null because the message is not null"');

function getGradientColors(guildId: string, colorStrings: ColorStrings | undefined) {
    const guild = Stores.GuildStore.getGuild(guildId);
    if (!guild || !hasGuildFeature(guild, "ENHANCED_ROLE_COLORS") || !colorStrings?.secondaryColor) return null;
    return colorStrings;
}

function makeColorStyle(guildId: string, { colorString, colorStrings }: Colored): Record<string, string> | undefined {
    const gradient = getGradientColors(guildId, colorStrings);
    if (!gradient) return colorString ? { color: colorString } : undefined;

    const { primaryColor, secondaryColor, tertiaryColor } = gradient;
    const colors = [primaryColor, secondaryColor, tertiaryColor, primaryColor].filter(Boolean).join(",");

    return {
        color: primaryColor,
        backgroundImage: `linear-gradient(to right,${colors})`,
        backgroundClip: "text",
        backgroundSize: "100px auto",
        WebkitTextFillColor: "transparent"
    };
}

const settings = definePluginSettings({
    chatMentions: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in chat mentions (including in the message box)",
        restartNeeded: true
    },
    memberList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in member list role headers",
        restartNeeded: true
    },
    voiceUsers: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the voice chat user list",
        restartNeeded: true
    },
    reactorsList: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in the reactors list",
        restartNeeded: true
    },
    pollResults: {
        type: OptionType.BOOLEAN,
        default: true,
        description: "Show role colors in poll results",
        restartNeeded: true
    },
    colorChatMessages: {
        type: OptionType.BOOLEAN,
        default: false,
        description: "Color chat messages with the author's role color",
        restartNeeded: true
    },
    messageSaturation: {
        type: OptionType.SLIDER,
        description: "Intensity of message coloring",
        markers: makeRange(0, 100, 10),
        default: 30
    }
});

export default definePlugin({
    name: "RoleColorEverywhere",
    description: "Shows the top role color anywhere possible",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche la couleur du rôle principal partout où c'est possible",
            options: {
                chatMentions: "Couleurs de rôle dans les mentions du chat (y compris dans la zone de saisie)",
                memberList: "Couleurs de rôle dans les en-têtes de rôle de la liste des membres",
                voiceUsers: "Couleurs de rôle dans la liste des utilisateurs en vocal",
                reactorsList: "Couleurs de rôle dans la liste des réactions",
                pollResults: "Couleurs de rôle dans les résultats de sondage",
                colorChatMessages: "Colorer les messages avec la couleur de rôle de leur auteur",
                messageSaturation: "Intensité de la couleur des messages"
            }
        }
    },
    settings,

    patches: [
        {
            find: ".USER_MENTION)",
            predicate: () => settings.store.chatMentions,
            replacement: {
                match: /(?<=user:(\i),guildId:([^,]+?),.{0,100}?children:\i=>\i)\((\i)\)/,
                replace: "({...$3,color:$self.getColorInt($1?.id,$2),roleColors:$self.getRoleColors($1?.id,$2)})"
            }
        },
        {
            find: '"text":"locked"',
            predicate: () => settings.store.chatMentions,
            replacement: {
                match: /(?<=let\{id:(\i),guildId:\i,channelId:(\i)\}.{0,500}?popoutProps:)\i(?=[},])/,
                replace: "{...$&,color:$self.getColorInt($1,$2),roleColors:$self.getRoleColors($1,$2)}"
            }
        },
        {
            find: 'tutorialId:"whos-online',
            predicate: () => settings.store.memberList,
            replacement: {
                match: /(?<=#{intl::CHANNEL_MEMBERS_A11Y_LABEL}.{0,400}?)children:(?=.{0,20}?(?:—|\\u2014) ",\i\])/,
                replace: "style:$self.getRoleStyle(arguments[0]),$&"
            }
        },
        {
            find: "?null:new Intl.NumberFormat",
            predicate: () => settings.store.memberList,
            replacement: {
                match: /(?<=#{intl::CHANNEL_MEMBERS_A11Y_LABEL},\{title:\i,count:\i\}\)\}\),\(0,\i\.jsxs\)\("div",\{)/,
                replace: "style:$self.getRoleStyle(arguments[0]),"
            }
        },
        {
            find: "#{intl::GUEST_NAME_SUFFIX})]",
            predicate: () => settings.store.voiceUsers,
            replacement: {
                match: /#{intl::GUEST_NAME_SUFFIX}.{0,50}?""\](?<=guildId:(\i),.+?user:(\i).+?)/,
                replace: "$&,style:$self.getColorStyle($2.id,$1),"
            }
        },
        {
            find: "MessageReactions.render:",
            predicate: () => settings.store.reactorsList,
            replacement: {
                match: /tag:"strong",variant:"body-md\/medium"(?<=onContextMenu:.{0,15}\((\i),(\i),\i\).+?)/,
                replace: "$&,style:$self.getColorStyle($2?.id,$1?.channel?.id)"
            }
        },
        {
            find: ",reactionVoteCounts",
            predicate: () => settings.store.pollResults,
            replacement: {
                match: /\.SIZE_32.+?variant:"body-md\/normal",className:\i\.\i,(?="aria-label":)/,
                replace: "$&style:$self.getColorStyle(arguments[0]?.user?.id,arguments[0]?.channel?.id),"
            }
        },
        {
            find: ".SEND_FAILED,",
            predicate: () => settings.store.colorChatMessages,
            replacement: {
                match: /(?<=\]:(\i)\.isUnsupported.{0,50}?,)(?=children:\[)/,
                replace: "style:$self.useMessageColorsStyle($1),"
            }
        }
    ],

    getMember(userId: string, channelOrGuildId: string) {
        try {
            const guildId = Stores.ChannelStore.getChannel(channelOrGuildId)?.guild_id ?? Stores.GuildStore.getGuild(channelOrGuildId)?.id;
            if (guildId == null) return null;

            const member = Stores.GuildMemberStore.getMember(guildId, userId);
            return member && { guildId, member };
        } catch (err) {
            logger.error("Failed to get member", err);
        }
        return null;
    },

    getColorInt(userId: string, channelOrGuildId: string) {
        try {
            const colorString: string | undefined = this.getMember(userId, channelOrGuildId)?.member.colorString;
            return colorString && parseInt(colorString.slice(1), 16);
        } catch (err) {
            logger.error(err);
        }
    },

    getRoleColors(userId: string, channelOrGuildId: string) {
        try {
            const data = this.getMember(userId, channelOrGuildId);
            return data && getGradientColors(data.guildId, data.member.colorStrings);
        } catch (err) {
            logger.error(err);
        }
    },

    getColorStyle(userId: string, channelOrGuildId: string) {
        try {
            const data = this.getMember(userId, channelOrGuildId);
            return data && makeColorStyle(data.guildId, data.member);
        } catch (err) {
            logger.error(err);
        }
    },

    useMessageColorsStyle(message: any) {
        try {
            const { messageSaturation } = settings.use(["messageSaturation"]);
            const author = useMessageAuthor(message);

            if (message.state === "SEND_FAILED") return;

            if (author.colorString != null && messageSaturation !== 0) {
                const value = `color-mix(in oklab, ${author.colorString} ${messageSaturation}%, var({DEFAULT}))`;
                return {
                    color: value.replace("{DEFAULT}", "--text-default"),
                    "--text-strong": value.replace("{DEFAULT}", "--text-strong"),
                    "--text-muted": value.replace("{DEFAULT}", "--text-muted")
                };
            }
        } catch (err) {
            logger.error("Failed to get message color", err);
        }
        return null;
    },

    getRoleStyle(props: any) {
        try {
            const role = Stores.GuildRoleStore.getRole(props?.guildId, props?.id);
            return role && makeColorStyle(props.guildId, role);
        } catch (err) {
            logger.error("Failed to get role style", err);
        }
    }
});
