/*
 * Majic — Discord helpers
 */

import { FluxDispatcher, MessageActions, Stores } from "@webpack/common";

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
