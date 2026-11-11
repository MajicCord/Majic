/*
 * Majic — ValidReply plugin
 */

import { definePlugin } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { FluxDispatcher, RestAPI } from "@webpack/common";

const ReferencedMessageState = {
    Loaded: 0,
    NotLoaded: 1,
    Deleted: 2
} as const;

const fetching = new Map<string, string>();
let ReplyStore: any;

const createMessageRecord = findByCodeLazy(".createFromServer(", ".isBlockedForMessage", "messageReference:");

export default definePlugin({
    name: "ValidReply",
    description: "Fixes \"Message could not be loaded\" when hovering a reply",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Corrige « Impossible de charger le message » au survol d'une réponse"
        }
    },

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            replacement: {
                match: /#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}\)/,
                replace: "$&,onMouseEnter:()=>$self.fetchReply(arguments[0])"
            }
        },
        {
            find: "ReferencedMessageStore",
            replacement: {
                match: /_channelCaches=new Map;/,
                replace: "$&_=$self.setReplyStore(this);"
            }
        }
    ],

    setReplyStore(store: any) {
        ReplyStore = store;
    },

    fetchReply(reply: { baseMessage: { messageReference: { channel_id: string; message_id: string } } }) {
        const { channel_id: channelId, message_id: messageId } = reply.baseMessage.messageReference;

        if (fetching.has(messageId)) return;
        fetching.set(messageId, channelId);

        RestAPI.get({
            url: `/channels/${channelId}/messages`,
            query: { limit: 1, around: messageId },
            retries: 2
        })
            .then((res: { body?: any[] }) => {
                const message = res?.body?.[0];
                if (!message) return;

                if (message.id !== messageId) {
                    ReplyStore.set(channelId, messageId, { state: ReferencedMessageState.Deleted });
                    FluxDispatcher.dispatch({ type: "MESSAGE_DELETE", channelId, message: messageId });
                } else {
                    ReplyStore.set(message.channel_id, message.id, {
                        state: ReferencedMessageState.Loaded,
                        message: createMessageRecord(message)
                    });
                    FluxDispatcher.dispatch({ type: "MESSAGE_UPDATE", message });
                }
            })
            .catch(() => { })
            .finally(() => fetching.delete(messageId));
    }
});
