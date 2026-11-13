/*
 * Majic — PreviewMessage plugin
 */

import { ChatBarButton, type ChatBarButtonRenderer } from "@api/chatButtons";
import { _generateBotMessageId, sendBotMessage } from "@api/commands";
import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { DiscordIcon, DraftType, React, Stores, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { preview: "Preview Message" },
    fr: { preview: "Aperçu du message" }
});

const objectURLMap = new Map<string, string[]>();

const getDraft = (channelId: string) => Stores.DraftStore.getDraft(channelId, DraftType.ChannelMessage);

const getImageBox = (url: string): Promise<{ width: number; height: number } | null> =>
    new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width, height: img.height });
        img.onerror = () => resolve(null);
        img.src = url;
    });

const getAttachments = (channelId: string) =>
    Promise.all(
        Stores.UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).map(async (upload: any) => {
            const { isImage, filename, spoiler, item: { file } } = upload;

            const url = URL.createObjectURL(file);
            const attachment: Record<string, unknown> = {
                id: _generateBotMessageId(),
                filename: spoiler ? "SPOILER_" + filename : filename,
                content_type: undefined,
                size: upload.getSize(),
                spoiler,
                url: url + "#",
                proxy_url: url + "#"
            };

            if (isImage) {
                const box = await getImageBox(url);
                if (box) {
                    attachment.width = box.width;
                    attachment.height = box.height;
                }
            }

            return { attachment, objectURL: url };
        })
    );

const PreviewButton: ChatBarButtonRenderer = props => {
    const { isAnyChat, isEmpty, channel: { id: channelId } } = props;
    const attachmentsEnabled = (props.type as { attachments?: boolean }).attachments;
    const draft = useStateFromStores([Stores.DraftStore], () => getDraft(channelId));

    if (!isAnyChat) return null;

    const hasAttachments = attachmentsEnabled && Stores.UploadAttachmentStore.getUploads(channelId, DraftType.ChannelMessage).length > 0;
    const hasContent = !isEmpty && draft?.length > 0;

    if (!hasContent && !hasAttachments) return null;

    return (
        <ChatBarButton
            tooltip={s("preview")}
            onClick={async () => {
                const attachments = hasAttachments ? await getAttachments(channelId) : undefined;
                const message = sendBotMessage(channelId, {
                    content: getDraft(channelId),
                    author: Stores.UserStore.getCurrentUser(),
                    attachments: attachments?.map(a => a.attachment)
                });

                if (attachments) objectURLMap.set(message.id, attachments.map(a => a.objectURL));
            }}
            buttonProps={{ style: { translate: "0 2px" } }}
        >
            <DiscordIcon name="EyeIcon" size={20} />
        </ChatBarButton>
    );
};

export default definePlugin({
    name: "PreviewMessage",
    description: "Lets you preview your message before sending it",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de prévisualiser ton message avant de l'envoyer"
        }
    },
    startAt: "Init",

    chatBarButtons: {
        previewMessage: PreviewButton
    },

    flux: {
        MESSAGE_DELETE({ id: messageId }: { id: string }) {
            const objectURLs = objectURLMap.get(messageId);
            if (!objectURLs) return;
            objectURLs.forEach(url => URL.revokeObjectURL(url));
            objectURLMap.delete(messageId);
        }
    }
});
