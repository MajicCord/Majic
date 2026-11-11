/*
 * Majic — AddAttachments plugin
 */

import { ChatBarButton } from "@api/chatButtons";
import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DiscordIcon, Permissions, React, RestAPI, showToast, Stores } from "@webpack/common";

const s = createStrings({
    en: {
        noMore: "You cannot add more attachments to this message.",
        onlyMore: "You can only add {count} more attachment(s) to this message.",
        uploading: "Uploading, this can take a while...",
        addedOne: "Attachment added successfully!",
        addedMany: "Attachments added successfully!",
        add: "Add Attachments"
    },
    fr: {
        noMore: "Tu ne peux plus ajouter de pièces jointes à ce message.",
        onlyMore: "Tu ne peux ajouter que {count} pièce(s) jointe(s) de plus à ce message.",
        uploading: "Envoi en cours, ça peut prendre un moment...",
        addedOne: "Pièce jointe ajoutée !",
        addedMany: "Pièces jointes ajoutées !",
        add: "Ajouter des pièces jointes"
    }
});

const { uniqueId } = findByPropsLazy("uniqueId");

const MessageType = { DEFAULT: 0, REPLY: 19 } as const;
const IS_VOICE_MESSAGE = 1 << 13;

const UploadIcon = () => <DiscordIcon name="UploadIcon" size={18} />;
const ClockIcon = () => <DiscordIcon name="ClockIcon" size={18} />;

function chooseAttachments(channelId: string, messageId: string, existingAttachmentCount: number) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "*/*";
    input.multiple = true;
    input.click();

    input.addEventListener("change", async () => {
        try {
            if (!input.files) return;
            await addAttachments(channelId, messageId, existingAttachmentCount, input.files);
        } finally {
            input.remove();
        }
    });
}

async function addAttachments(channelId: string, messageId: string, existingAttachmentCount: number, files: FileList) {
    if (!files) return;

    if (files.length + existingAttachmentCount > 10) {
        const remaining = 10 - existingAttachmentCount;
        if (remaining <= 0) {
            showToast({ text: s("noMore"), variant: "critical" });
            return;
        }
        showToast({ text: s("onlyMore", { count: remaining }), variant: "critical" });
        return;
    }

    showToast({ text: s("uploading"), icon: ClockIcon, iconColor: "var(--text-default)" });

    const { body: { attachments } } = await RestAPI.post({
        url: `/channels/${channelId}/attachments`,
        body: {
            files: Array.from(files, file => ({
                filename: file.name,
                file_size: file.size,
                id: uniqueId(),
                is_clip: false
            }))
        }
    }) as { body: { attachments: { id: string; upload_url: string; upload_filename: string }[] } };

    const newAttachments = await Promise.all(
        attachments.map((file, i) =>
            fetch(file.upload_url, { method: "PUT", body: files[i] }).then(() => ({
                id: file.id,
                uploaded_filename: file.upload_filename,
                filename: files[i].name
            }))
        )
    );

    const message = Stores.MessageStore.getMessage(channelId, messageId);
    await RestAPI.patch({
        url: `/channels/${channelId}/messages/${messageId}`,
        body: {
            attachments: [...message.attachments, ...newAttachments]
        }
    });

    showToast({ text: files.length === 1 ? s("addedOne") : s("addedMany"), variant: "success" });
}

function canAddAttachments(message: any) {
    return (
        [MessageType.DEFAULT, MessageType.REPLY].includes(message.type) &&
        !message.hasFlag(IS_VOICE_MESSAGE) &&
        Stores.AuthenticationStore.getId() === message.author.id &&
        message.attachments.length < 10
    );
}

function handlePaste(e: ClipboardEvent) {
    if (!e.clipboardData?.files.length) return;

    const message = Stores.EditMessageStore.getEditingMessage(Stores.SelectedChannelStore.getChannelId());
    if (!message) return;

    e.preventDefault();
    e.stopImmediatePropagation();
    void addAttachments(message.channel_id, message.id, message.attachments.length, e.clipboardData.files);
}

export default definePlugin({
    name: "AddAttachments",
    description: "Lets you add new attachments while editing messages",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet d'ajouter des pièces jointes en modifiant un message"
        }
    },

    start() {
        document.addEventListener("paste", handlePaste, { capture: true });
    },

    stop() {
        document.removeEventListener("paste", handlePaste, { capture: true });
    },

    messagePopoverButtons: {
        addAttachments(message: any) {
            if (!canAddAttachments(message)) return null;

            const channel = Stores.ChannelStore.getChannel(message.channel_id);
            if (!channel.isPrivate() && !Stores.PermissionStore.can(Permissions.SEND_MESSAGES, channel)) return null;

            return {
                label: s("add"),
                icon: UploadIcon,
                onClick: () => chooseAttachments(message.channel_id, message.id, message.attachments.length)
            };
        }
    },

    chatBarButtons: {
        addAttachments({ channel, type }) {
            if (type.analyticsName !== "edit") return null;

            const message = Stores.EditMessageStore.getEditingMessage(channel.id);
            if (!message || !canAddAttachments(message)) return null;

            return (
                <ChatBarButton tooltip={s("add")} onClick={() => chooseAttachments(message.channel_id, message.id, message.attachments.length)}>
                    <DiscordIcon name="UploadIcon" size={18} />
                </ChatBarButton>
            );
        }
    }
});
