/*
 * Majic — re-render or locally change messages
 */

import { findByPropsLazy } from "@webpack";
import { Stores } from "@webpack/common";

const MessageCache = findByPropsLazy("clearCache", "_channelMessages");

export function updateMessage(channelId: string, messageId: string, fields?: Record<string, unknown>) {
    const channelMessages = MessageCache.getOrCreate(channelId);
    if (!channelMessages.has(messageId)) return false;

    const updated = channelMessages.update(messageId, (message: any) =>
        fields ? message.merge(fields) : new message.constructor(message)
    );

    MessageCache.commit(updated);
    Stores.MessageStore.emitChange();
    return true;
}
