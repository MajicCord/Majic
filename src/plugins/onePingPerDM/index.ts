/*
 * Majic — OnePingPerDM plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { Stores } from "@webpack/common";

const s = createStrings({
    en: { both: "Both", userDm: "User DMs", groupDm: "Group DMs" },
    fr: { both: "Les deux", userDm: "MP avec un utilisateur", groupDm: "MP de groupe" }
});

const ChannelType = {
    DM: 1,
    GROUP_DM: 3
} as const;

const settings = definePluginSettings({
    channelToAffect: {
        type: OptionType.SELECT,
        description: "The type of DM the plugin affects",
        options: [
            { get label() { return s("both"); }, value: "both_dms", default: true },
            { get label() { return s("userDm"); }, value: "user_dm" },
            { get label() { return s("groupDm"); }, value: "group_dm" }
        ]
    },
    allowMentions: {
        type: OptionType.BOOLEAN,
        description: "Receive audio pings for @mentions",
        default: false
    },
    allowEveryone: {
        type: OptionType.BOOLEAN,
        description: "Receive audio pings for @everyone and @here in group DMs",
        default: false
    }
});

export default definePlugin({
    name: "OnePingPerDM",
    description: "If someone sends you several unread DMs, you only get one audio ping. Read the messages to reset it",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Si quelqu'un t'envoie plusieurs MP non lus, tu n'entends qu'un seul son. Lis les messages pour le réinitialiser",
            options: {
                channelToAffect: "Type de MP concerné",
                allowMentions: "Garder le son pour les @mentions",
                allowEveryone: "Garder le son pour @everyone et @here dans les MP de groupe"
            }
        }
    },
    settings,

    patches: [
        {
            find: '"NotificationStore"',
            replacement: [
                {
                    match: /(\i\.\i\.getDesktopType\(\)===\i\.\i\.NEVER)\)/,
                    replace: "$&if(!$self.isPrivateChannelRead(arguments[0]?.message))return;else "
                },
                {
                    match: /sound:(\i\?\i:void 0,volume:)/,
                    replace: "sound:!$self.isPrivateChannelRead(arguments[0]?.message)?undefined:$1"
                }
            ]
        }
    ],

    isPrivateChannelRead(message: { id: string; channel_id: string; mentions: Array<{ id: string }>; mention_everyone: boolean }) {
        const channelType = Stores.ChannelStore.getChannel(message.channel_id)?.type;
        if (
            (channelType !== ChannelType.DM && channelType !== ChannelType.GROUP_DM) ||
            (channelType === ChannelType.DM && settings.store.channelToAffect === "group_dm") ||
            (channelType === ChannelType.GROUP_DM && settings.store.channelToAffect === "user_dm") ||
            (settings.store.allowMentions && message.mentions.some(m => m.id === Stores.UserStore.getCurrentUser().id)) ||
            (settings.store.allowEveryone && message.mention_everyone)
        ) {
            return true;
        }
        return Stores.ReadStateStore.getOldestUnreadMessageId(message.channel_id) === message.id;
    }
});
