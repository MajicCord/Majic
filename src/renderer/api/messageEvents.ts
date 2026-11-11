/*
 * Majic — message events API
 */

import { Logger } from "@utils/logger";
import { MessageActions, Stores } from "@webpack/common";

const logger = new Logger("MessageEvents", "#bd93f9");

export interface MessageObject {
    content: string;
    tts?: boolean;
    invalidEmojis?: unknown[];
    validNonShortcutEmojis?: unknown[];
    [key: string]: unknown;
}

type Cancelable = void | { cancel: boolean };

export type MessageSendListener = (channelId: string, message: MessageObject, options: Record<string, any>) => Cancelable | Promise<Cancelable>;
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

async function isCanceled<A extends unknown[]>(listeners: Set<(...args: A) => Cancelable | Promise<Cancelable>>, kind: string, args: A) {
    for (const listener of listeners) {
        try {
            if ((await listener(...args))?.cancel) return true;
        } catch (err) {
            logger.error(`A ${kind} listener failed`, err);
        }
    }
    return false;
}

const originals = new Map<string, (...args: any[]) => any>();

function wrapAction(name: string, intercept: (original: (...args: any[]) => any) => (...args: any[]) => any) {
    const original = MessageActions[name];
    if (typeof original !== "function") {
        logger.error(`MessageActions.${name} not found, ${name} listeners will not run`);
        return;
    }
    originals.set(name, original);
    Object.defineProperty(MessageActions, name, { value: intercept(original), configurable: true, writable: true, enumerable: true });
}

function restoreActions() {
    for (const [name, original] of originals) {
        Object.defineProperty(MessageActions, name, { value: original, configurable: true, writable: true, enumerable: true });
    }
    originals.clear();
}

const MESSAGE_ELEMENT_ID = /^chat-messages-(\d+)-(\d+)$/;

function onDocumentClick(event: MouseEvent) {
    if (!clickListeners.size) return;

    const element = (event.target as Element | null)?.closest?.("[id^='chat-messages-']");
    const ids = element && MESSAGE_ELEMENT_ID.exec(element.id);
    if (!ids) return;

    const [, channelId, messageId] = ids;
    const message = Stores.MessageStore?.getMessage(channelId, messageId);
    const channel = Stores.ChannelStore?.getChannel(channelId);
    if (!message || !channel) return;

    for (const listener of clickListeners) {
        try {
            listener(message, channel, event);
        } catch (err) {
            logger.error("A message click listener failed", err);
        }
    }
}

export function _installMessageEvents() {
    wrapAction("sendMessage", original => async function (this: unknown, channelId: string, message: MessageObject, ...rest: any[]) {
        if (await isCanceled(sendListeners, "pre-send", [channelId, message, rest[1] ?? {}])) return;
        return original.call(this, channelId, message, ...rest);
    });

    wrapAction("editMessage", original => async function (this: unknown, channelId: string, messageId: string, message: MessageObject, ...rest: any[]) {
        if (await isCanceled(editListeners, "pre-edit", [channelId, messageId, message])) return;
        return original.call(this, channelId, messageId, message, ...rest);
    });

    document.addEventListener("click", onDocumentClick);
}

export function _uninstallMessageEvents() {
    restoreActions();
    document.removeEventListener("click", onDocumentClick);
}
