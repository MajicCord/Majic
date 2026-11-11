/*
 * Majic — Discord helpers
 */

import { ComponentDispatch, FluxDispatcher, i18n, MessageActions, openMediaModal, showToast, Stores, UserSettingsActionCreators } from "@webpack/common";
import { t } from "@i18n";

import { runtimeHashMessageKey } from "./intlHash";
import { Logger } from "./logger";

const intlLogger = new Logger("IntlManager", "#ffb86c");

export function getIntlMessage(key: string, values?: Record<PropertyKey, any>): any {
    return getIntlMessageFromHash(runtimeHashMessageKey(key), values, key);
}

export function getIntlMessageFromHash(hashedKey: string, values?: Record<PropertyKey, any>, originalKey?: string): any {
    try {
        return values == null ? i18n.intl.string(i18n.t[hashedKey]) : i18n.intl.format(i18n.t[hashedKey], values);
    } catch (err) {
        intlLogger.error(`Failed to get intl message for key: ${originalKey ?? hashedKey}`, err);
        return originalKey ?? "";
    }
}

export function hasGuildFeature(guild: { features?: Set<string> } | null | undefined, feature: string): boolean {
    return guild?.features?.has(feature) ?? false;
}

export function sendMessage(channelId: string, data: { content: string; [key: string]: unknown }, waitForChannelReady = false, extra?: Record<string, unknown>) {
    const message = { invalidEmojis: [], tts: false, validNonShortcutEmojis: [], ...data };
    return MessageActions.sendMessage(channelId, message, waitForChannelReady, extra);
}

export function sendMessageAsReply(channelId: string, content: string) {
    const replyOptions = MessageActions.getSendMessageOptionsForReply(Stores.PendingReplyStore?.getPendingReply(channelId));
    return sendMessage(channelId, { content }, false, replyOptions).then(() => {
        FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });
    });
}

export interface ImageModalItem {
    url: string;
    original?: string;
    width?: number;
    height?: number;
    [key: string]: unknown;
}

export function openImageModal(item: ImageModalItem, mediaModalProps?: Record<string, unknown>) {
    return openMediaModal({
        items: [{ type: "IMAGE", original: item.original ?? item.url, ...item }],
        ...mediaModalProps
    });
}

export const Theme = {
    Dark: 1,
    Light: 2
} as const;

export function getTheme(): number {
    try {
        return UserSettingsActionCreators.PreloadedUserSettingsActionCreators.getCurrentValue()?.appearance?.theme;
    } catch {
        return Theme.Dark;
    }
}

export function insertTextIntoChatInputBox(text: string) {
    ComponentDispatch.dispatchToLastSubscribed("INSERT_TEXT", { rawText: text, plainText: text });
}

export function copyToClipboard(text: string): Promise<void> {
    const native = (window as any).DiscordNative;
    return native?.clipboard ? Promise.resolve(native.clipboard.copy(text)) : navigator.clipboard.writeText(text);
}

export async function copyWithToast(text: string, toastMessage = t("ui.copied")) {
    await copyToClipboard(text);
    showToast({ text: toastMessage, variant: "success" });
}
