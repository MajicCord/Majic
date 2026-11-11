/*
 * Majic — NoReplyMention plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { Stores } from "@webpack/common";

const s = createStrings({
    en: { exempt: "Do not ping the listed users / roles", only: "Only ping the listed users / roles" },
    fr: { exempt: "Ne pas mentionner les utilisateurs / rôles de la liste", only: "Mentionner seulement les utilisateurs / rôles de la liste" }
});

const settings = definePluginSettings({
    userList: {
        type: OptionType.STRING,
        description: "User IDs to allow or exempt pings for (separated by commas or spaces)",
        default: "1234567890123445,1234567890123445",
        multiline: true
    },
    roleList: {
        type: OptionType.STRING,
        description: "Role IDs to allow or exempt pings for (separated by commas or spaces)",
        default: "1234567890123445,1234567890123445",
        multiline: true
    },
    shouldPingListed: {
        type: OptionType.SELECT,
        description: "Behaviour",
        options: [
            { get label() { return s("exempt"); }, value: false },
            { get label() { return s("only"); }, value: true, default: true }
        ]
    },
    inverseShiftReply: {
        type: OptionType.BOOLEAN,
        description: "Invert Discord's Shift reply behaviour (enable to make Shift reply mention the user)",
        default: false
    }
});

export default definePlugin({
    name: "NoReplyMention",
    description: "Disables reply pings by default",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Désactive par défaut la mention dans les réponses",
            options: {
                userList: "ID d'utilisateurs à mentionner ou non (séparés par des virgules ou des espaces)",
                roleList: "ID de rôles à mentionner ou non (séparés par des virgules ou des espaces)",
                shouldPingListed: "Comportement",
                inverseShiftReply: "Inverser le comportement de Maj en répondant (activé : répondre avec Maj mentionne la personne)"
            }
        }
    },
    settings,

    shouldMention(message: any, isHoldingShift: boolean) {
        let isListed = settings.store.userList.includes(message.author.id);

        const channel = Stores.ChannelStore.getChannel(message.channel_id);
        if (channel?.guild_id && !isListed) {
            const roles: string[] | undefined = Stores.GuildMemberStore.getMember(channel.guild_id, message.author.id)?.roles;
            isListed = !!roles && roles.some(role => settings.store.roleList.includes(role));
        }

        const isExempt = settings.store.shouldPingListed ? isListed : !isListed;
        return settings.store.inverseShiftReply ? isHoldingShift !== isExempt : !isHoldingShift && isExempt;
    },

    patches: [
        {
            find: 'source:"message-actions"',
            replacement: {
                match: /:(\i),shouldMention:!(\i)\.shiftKey/,
                replace: ":$1,shouldMention:$self.shouldMention($1,$2.shiftKey)"
            }
        }
    ]
});
