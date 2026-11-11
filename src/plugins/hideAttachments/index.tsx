/*
 * Majic — HideMedia plugin
 */

import { DataStore } from "@api/dataStore";
import { updateMessage } from "@api/messageUpdater";
import { createStrings } from "@i18n";
import { classes } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { DiscordIcon, React } from "@webpack/common";

const s = createStrings({
    en: { show: "Show Media", hide: "Hide Media", hidden: "Media Hidden" },
    fr: { show: "Afficher les médias", hide: "Masquer les médias", hidden: "Médias masqués" }
});

const KEY = "HideAttachments_HiddenIds";

let hiddenMessages = new Set<string>();

async function getHiddenMessages() {
    hiddenMessages = await DataStore.get<Set<string>>(KEY) ?? new Set();
    return hiddenMessages;
}

const saveHiddenMessages = (ids: Set<string>) => DataStore.set(KEY, ids);

const hasMedia = (message: any) =>
    message.attachments.length > 0 || message.embeds.length > 0 || message.stickerItems.length > 0 || message.components.length > 0;

async function toggleHide(channelId: string, messageId: string) {
    const ids = await getHiddenMessages();
    if (!ids.delete(messageId)) ids.add(messageId);

    await saveHiddenMessages(ids);
    updateMessage(channelId, messageId);
}

const HideIcon = () => <DiscordIcon name="EyeSlashIcon" size={20} />;
const ShowIcon = () => <DiscordIcon name="ImageIcon" size={20} />;

export default definePlugin({
    name: "HideMedia",
    description: "Hides attachments and embeds of individual messages with a hover button",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["MessageUpdaterAPI"],
    translations: {
        fr: {
            description: "Masque les pièces jointes et intégrations de messages précis avec un bouton au survol"
        }
    },

    css: ".majic-hideAttachments-accessory { color: var(--text-muted); margin-top: 0.5em; font-style: italic; font-weight: 400; } .majic-hideAttachments-no-content { margin-top: 0; }",

    patches: [
        {
            find: "this.renderAttachments(",
            replacement: [
                {
                    match: /(?<=\i=)this\.render(?:Attachments|Embeds|StickersAccessories)\((\i)\)/g,
                    replace: "$self.shouldHide($1?.id)?null:$&"
                },
                {
                    match: /(?<=\i=)this\.renderComponentAccessories\((\i)\)/,
                    replace: "$self.shouldHide($1?.id)?$self.renderMediaHidden($1):$&"
                }
            ]
        }
    ],

    messagePopoverButtons: {
        hideMedia(message) {
            if (!hasMedia(message) && !message.messageSnapshots?.some((snapshot: any) => hasMedia(snapshot.message))) return null;

            const isHidden = hiddenMessages.has(message.id);
            return {
                label: isHidden ? s("show") : s("hide"),
                icon: isHidden ? ShowIcon : HideIcon,
                onClick: () => toggleHide(message.channel_id, message.id)
            };
        }
    },

    renderMediaHidden(message: any) {
        return (
            <span className={classes("majic-hideAttachments-accessory", !message.content && "majic-hideAttachments-no-content")}>
                {s("hidden")}
            </span>
        );
    },

    async start() {
        await getHiddenMessages();
    },

    stop() {
        hiddenMessages.clear();
    },

    shouldHide(messageId: string) {
        return hiddenMessages.has(messageId);
    }
});
