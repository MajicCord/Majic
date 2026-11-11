/*
 * Majic — QuickMention plugin
 */

import { createStrings } from "@i18n";
import { insertTextIntoChatInputBox } from "@utils/discord";
import { definePlugin } from "@utils/types";
import { DiscordIcon, Permissions, React, Stores } from "@webpack/common";

const s = createStrings({
    en: { label: "Quick Mention" },
    fr: { label: "Mentionner" }
});

const AtIcon = () => <DiscordIcon name="AtIcon" size={20} />;

export default definePlugin({
    name: "QuickMention",
    description: "Adds a quick mention button to the message actions bar",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton pour mentionner rapidement l'auteur dans la barre d'actions des messages"
        }
    },

    messagePopoverButtons: {
        quickMention(message) {
            const channel = Stores.ChannelStore.getChannel(message.channel_id);
            if (channel?.guild_id && !Stores.PermissionStore.can(Permissions.SEND_MESSAGES, channel)) return null;

            return {
                label: s("label"),
                icon: AtIcon,
                onClick: () => insertTextIntoChatInputBox(`<@${message.author.id}> `)
            };
        }
    }
});
