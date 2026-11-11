/*
 * Majic — message events API
 */

import { Logger } from "@utils/logger";
import { Stores } from "@webpack/common";

const logger = new Logger("MessageEvents", "#bd93f9");

export interface MessageObject {
    content: string;
    tts?: boolean;
    invalidEmojis?: unknown[];
    validNonShortcutEmojis?: unknown[];
    [key: string]: unknown;
}

export interface SendMessageProps {
    channel: any;
    content: string;
    hasAttachments?: boolean;
    hasStickers?: boolean;
    [key: string]: unknown;
}

type Cancelable = void | { cancel: boolean };

export type MessageSendListener = (channelId: string, message: MessageObject, options: Record<string, any>, props?: SendMessageProps) => Cancelable | Promise<Cancelable>;
export type MessageEditListener = (channelId: string, messageId: string, message: MessageObject) => Cancelable | Promise<Cancelable>;
export type MessageClickListener = (message: any, channel: any, event: MouseEvent) => void;

const sendListeners = new Set<MessageSendListener>();
const editListeners = new Set<MessageEditListener>();
const clickListeners = new Set<MessageClickListener>();

export const addMessagePreSendListener = (listener: MessageSendListener) => (sendListeners.add(listener), listener);
export const removeMessagePreSendListener = (listener: MessageSendListener) => sendListeners.delete(listener);
export const addMessagePreEditListener = (listener: MessageEditListener) => (editListeners.add(listener), listener);
export const removeMessagePreEditListener = (listener: MessageEditListener) => editListeners.delete(listener);
export const addMessageClickListener = (listener: MessageClickListener) => (clickListeners.add(listener), listener);
export const removeMessageClickListener = (listener: MessageClickListener) => clickListeners.delete(listener);

async function anyCanceled<A extends unknown[]>(listeners: Set<(...args: A) => Cancelable | Promise<Cancelable>>, kind: string, args: A) {
    for (const listener of listeners) {
        try {
            if ((await listener(...args))?.cancel) return true;
        } catch (err) {
            logger.error(`A ${kind} listener failed`, err);
        }
    }
    return false;
}

export const _handlePreSend = (channelId: string, message: MessageObject, options: Record<string, any>, props: SendMessageProps) =>
    anyCanceled(sendListeners, "pre-send", [channelId, message, options, props]);

export const _handlePreEdit = (channelId: string, messageId: string, message: MessageObject) =>
    anyCanceled(editListeners, "pre-edit", [channelId, messageId, message]);

export function _handleClick(message: any, channel: any, event: MouseEvent) {
    const current = Stores.MessageStore?.getMessage(channel.id, message.id) ?? message;
    for (const listener of clickListeners) {
        try {
            listener(current, channel, event);
        } catch (err) {
            logger.error("A message click listener failed", err);
        }
    }
}
