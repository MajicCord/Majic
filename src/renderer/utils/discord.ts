/*
 * Majic — Discord helpers
 */

import { cache } from "@webpack";
import { ComponentDispatch, FluxDispatcher, i18n, MessageActions, openMediaModal, openUserProfileModal, showToast, Stores, UserSettingsActionCreators, UserUtils } from "@webpack/common";
import { t } from "@i18n";

import { runtimeHashMessageKey } from "./intlHash";
import { Logger } from "./logger";

const intlLogger = new Logger("IntlManager", "#ffb86c");

export function getIntlMessage(key: string, values?: Record<PropertyKey, any>): any {
    return getIntlMessageFromHash(runtimeHashMessageKey(key), values, key);
}

const messagesByHash = new Map<string, any>();

function* loadedMessageProxies(): Generator<any> {
    for (const id in cache) {
        const exports = cache[id]?.exports;
        if (exports == null || typeof exports !== "object") continue;
        for (const key of Object.getOwnPropertyNames(exports)) {
            let value: any;
            try {
                value = exports[key];
            } catch {
                continue;
            }
            if (value !== i18n.t && value?.[Symbol.toStringTag] === "IntlMessagesProxy") yield value;
        }
    }
}

function hasMessage(messages: any, hashedKey: string) {
    const loader = messages?.$$loader;
    if (typeof loader?.getMessageValue !== "function") return false;
    return loader.getMessageValue(hashedKey, i18n.intl.currentLocale) != null
        || loader.getMessageValue(hashedKey, loader.defaultLocale) != null;
}

const missingSince = new Map<string, number>();

function findMessages(hashedKey: string) {
    const known = messagesByHash.get(hashedKey);
    if (known) return known;

    const missing = missingSince.get(hashedKey);
    if (missing != null && Date.now() - missing < 5000) return i18n.t;

    for (const messages of [i18n.t, ...loadedMessageProxies()]) {
        if (!hasMessage(messages, hashedKey)) continue;
        messagesByHash.set(hashedKey, messages);
        missingSince.delete(hashedKey);
        return messages;
    }

    missingSince.set(hashedKey, Date.now());
    return i18n.t;
}

export function getIntlMessageFromHash(hashedKey: string, values?: Record<PropertyKey, any>, originalKey?: string): any {
    try {
        const messages = findMessages(hashedKey);
        return values == null ? i18n.intl.string(messages[hashedKey]) : i18n.intl.format(messages[hashedKey], values);
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

export function getGuildAcronym(guild: { name: string }): string {
    return guild.name
        .replaceAll("'s ", " ")
        .replace(/\w+/g, m => m[0])
        .replace(/\s/g, "");
}

export async function openUserProfile(id: string) {
    const user = await UserUtils.getUser(id);
    if (!user) throw new Error("No such user: " + id);

    openUserProfileModal({
        userId: id,
        guildId: Stores.SelectedGuildStore.getGuildId(),
        channelId: Stores.SelectedChannelStore.getChannelId(),
        sourceAnalyticsLocations: ["username", "user profile popout"]
    });
}
