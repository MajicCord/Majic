/*
 * Majic — QuickReply plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { isPluginEnabled, plugins } from "@renderer/plugins";
import { IS_MAC } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { ComponentDispatch, FluxDispatcher, MessageActions, MessageTypeSets, Permissions, Stores } from "@webpack/common";

const s = createStrings({
    en: { followPlugin: "Follow the NoReplyMention plugin (if enabled)", enabled: "Enabled", disabled: "Disabled" },
    fr: { followPlugin: "Suivre le plugin NoReplyMention (s'il est activé)", enabled: "Activé", disabled: "Désactivé" }
});

const EPHEMERAL_FLAG = 1 << 6;

const MentionOptions = {
    DISABLED: 0,
    ENABLED: 1,
    NO_REPLY_MENTION_PLUGIN: 2
} as const;

let currentlyReplyingId: string | null = null;
let currentlyEditingId: string | null = null;

const settings = definePluginSettings({
    shouldMention: {
        type: OptionType.SELECT,
        description: "Ping reply by default",
        options: [
            { get label() { return s("followPlugin"); }, value: MentionOptions.NO_REPLY_MENTION_PLUGIN, default: true },
            { get label() { return s("enabled"); }, value: MentionOptions.ENABLED },
            { get label() { return s("disabled"); }, value: MentionOptions.DISABLED }
        ]
    },
    ignoreBlockedAndIgnored: {
        type: OptionType.BOOLEAN,
        description: "Skip messages from blocked or ignored users when navigating",
        default: true
    }
});

const isCtrl = (e: KeyboardEvent) => IS_MAC ? e.metaKey : e.ctrlKey;
const isAltOrMeta = (e: KeyboardEvent) => e.altKey || (!IS_MAC && e.metaKey);

function onKeydown(e: KeyboardEvent) {
    const isUp = e.key === "ArrowUp";
    if (!isUp && e.key !== "ArrowDown") return;
    if (!isCtrl(e) || isAltOrMeta(e)) return;

    e.preventDefault();

    if (e.shiftKey) nextEdit(isUp);
    else nextReply(isUp);
}

function jumpIfOffScreen(channelId: string, messageId: string) {
    const element = document.getElementById("message-content-" + messageId);
    if (!element) return;

    const vh = Math.max(document.documentElement.clientHeight, window.innerHeight);
    const rect = element.getBoundingClientRect();
    const isOffscreen = rect.bottom < 150 || rect.top - vh >= -150;

    if (isOffscreen) {
        MessageActions.jumpToMessage({ channelId, messageId, flash: false, jumpType: "INSTANT" });
    }
}

function isBlockedOrIgnored(userId: string) {
    const { RelationshipStore } = Stores;
    return RelationshipStore.isBlockedOrIgnored?.(userId) ?? (RelationshipStore.isBlocked(userId) || RelationshipStore.isIgnored?.(userId));
}

function getNextMessage(isUp: boolean, isReply: boolean) {
    let messages: any[] = Stores.MessageStore.getMessages(Stores.SelectedChannelStore.getChannelId())._array;

    const meId = Stores.UserStore.getCurrentUser().id;

    messages = messages.filter(m => {
        if (m.deleted) return false;
        if (!isReply && m.author.id !== meId) return false;
        if (!MessageTypeSets.REPLYABLE.has(m.type) || m.hasFlag(EPHEMERAL_FLAG)) return false;
        if (settings.store.ignoreBlockedAndIgnored && isBlockedOrIgnored(m.author.id)) return false;
        return true;
    });

    const findNextNonDeleted = (id: string | null) => {
        if (id === null) return messages[messages.length - 1];

        const index = messages.findIndex(m => m.id === id);
        if (index === -1) return messages[messages.length - 1];

        return messages[isUp ? index - 1 : index + 1] ?? null;
    };

    const message = findNextNonDeleted(isReply ? currentlyReplyingId : currentlyEditingId);
    if (isReply) currentlyReplyingId = message?.id ?? null;
    else currentlyEditingId = message?.id ?? null;
    return message;
}

function shouldMention(message: any) {
    switch (settings.store.shouldMention) {
        case MentionOptions.NO_REPLY_MENTION_PLUGIN:
            if (!isPluginEnabled("NoReplyMention")) return true;
            return (plugins.NoReplyMention as any).shouldMention(message, false);
        case MentionOptions.DISABLED:
            return false;
        default:
            return true;
    }
}

function canSendInCurrentChannel() {
    const channel = Stores.ChannelStore.getChannel(Stores.SelectedChannelStore.getChannelId());
    return !channel?.guild_id || Stores.PermissionStore.can(Permissions.SEND_MESSAGES, channel);
}

function nextReply(isUp: boolean) {
    if (!canSendInCurrentChannel()) return;

    const message = getNextMessage(isUp, true);
    if (!message) {
        return void FluxDispatcher.dispatch({
            type: "DELETE_PENDING_REPLY",
            channelId: Stores.SelectedChannelStore.getChannelId()
        });
    }

    const channel = Stores.ChannelStore.getChannel(message.channel_id);
    const meId = Stores.UserStore.getCurrentUser().id;

    FluxDispatcher.dispatch({
        type: "CREATE_PENDING_REPLY",
        channel,
        message,
        shouldMention: shouldMention(message),
        showMentionToggle: !channel.isPrivate() && message.author.id !== meId,
        _isQuickReply: true
    });

    ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
    jumpIfOffScreen(channel.id, message.id);
}

function nextEdit(isUp: boolean) {
    if (!canSendInCurrentChannel()) return;

    const message = getNextMessage(isUp, false);
    if (!message) {
        return void FluxDispatcher.dispatch({
            type: "MESSAGE_END_EDIT",
            channelId: Stores.SelectedChannelStore.getChannelId()
        });
    }

    FluxDispatcher.dispatch({
        type: "MESSAGE_START_EDIT",
        channelId: message.channel_id,
        messageId: message.id,
        content: message.content,
        _isQuickEdit: true
    });

    jumpIfOffScreen(message.channel_id, message.id);
}

export default definePlugin({
    name: "QuickReply",
    description: "Reply to (Ctrl + Up/Down) and edit (Ctrl + Shift + Up/Down) messages with keyboard shortcuts",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Répondre (Ctrl + Haut/Bas) et modifier (Ctrl + Maj + Haut/Bas) des messages avec des raccourcis clavier",
            options: {
                shouldMention: "Mentionner par défaut dans les réponses",
                ignoreBlockedAndIgnored: "Ignorer les messages des utilisateurs bloqués ou ignorés pendant la navigation"
            }
        }
    },
    settings,

    start() {
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown);
    },

    flux: {
        DELETE_PENDING_REPLY() {
            currentlyReplyingId = null;
        },
        MESSAGE_END_EDIT() {
            currentlyEditingId = null;
        },
        CHANNEL_SELECT() {
            currentlyReplyingId = null;
            currentlyEditingId = null;
        },
        MESSAGE_START_EDIT({ messageId, _isQuickEdit }: { messageId: string; _isQuickEdit?: boolean }) {
            if (_isQuickEdit) return;
            currentlyEditingId = messageId;
        },
        CREATE_PENDING_REPLY({ message, _isQuickReply }: { message: { id: string }; _isQuickReply?: boolean }) {
            if (_isQuickReply) return;
            currentlyReplyingId = message.id;
        }
    }
});
