/*
 * Majic — ExpressionManager emojis
 */

import { findByCodeLazy } from "@webpack";
import { showToast, Stores } from "@webpack/common";

import { buildCloneItem, logger, s } from "./shared";

interface Emoji {
    id: string;
    name: string;
}

const openEmojiStudioModal = findByCodeLazy("Emoji Studio");

export const EmojiURLRegex = /^https:\/\/cdn\.discordapp\.com\/emojis\/(\d+)\.\w+/;

export const formatEmojiURL = (emoji: Emoji, size: number) =>
    `${location.protocol}//${(window as any).GLOBAL_ENV.CDN_HOST}/emojis/${emoji.id}.webp?size=${size}&lossless=true&animated=true`;

export const buildCloneEmojiItem = (emoji: Emoji) =>
    buildCloneItem(s("cloneEmoji"), () => openEmojiUploadModal(formatEmojiURL(emoji, 128), emoji.name));

export const editEmoji = (emoji: Emoji, guildId: string) =>
    openEmojiStudioModal({
        analyticsLocation: "guild settings edit emoji",
        emoji,
        guildId
    });

export async function openEmojiUploadModal(url: string, filename?: string) {
    try {
        filename ||= new URL(url).pathname.split("/").pop() ?? "emoji.png";

        const blob = await fetch(url).then(res => res.blob());

        const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject("Failed to read blob as data URL");
            reader.readAsDataURL(blob);
        });

        const image = new Image();
        image.src = dataUrl;
        await image.decode();

        const file = new File([blob], filename, { type: blob.type });

        await openEmojiStudioModal({
            analyticsLocation: { page: "Guild Settings" },
            guildId: Stores.SelectedGuildStore.getGuildId(),
            userImage: { image, file, data: dataUrl }
        });
    } catch (err) {
        logger.error("Failed to open Emoji Modal", err);
        showToast({ text: s("emojiModalFailed", { error: String(err) }), variant: "critical" });
    }
}

export function resolveEmojiName(id: string, message: any) {
    const emoji = Stores.EmojiStore.getCustomEmojiById(id);
    if (emoji) return emoji.name;

    const reaction = "reactions" in message && message.reactions.find((r: any) => r.emoji.id === id);
    if (reaction) return reaction.emoji.name;

    const match = message.content.match(RegExp(`<a?:(\\w+)(?:~\\d+)?:${id}>|https://cdn\\.discordapp\\.com/emojis/${id}\\.[\\w?&=%]*`));
    if (!match) return null;

    return match[1]
        ?? URL.parse(match[0])?.searchParams.get("name")
        ?? "FakeNitroEmoji";
}
