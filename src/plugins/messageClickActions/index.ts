/*
 * Majic — MessageClickActions plugin
 */

import { definePluginSettings } from "@api/settings";
import { isPluginEnabled, plugins } from "@renderer/plugins";
import { definePlugin, OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, MessageTypeSets, Permissions, Stores } from "@webpack/common";

const MessageActions = findByPropsLazy("deleteMessage", "startEditMessage");
const EditStore = findByPropsLazy("isEditing", "isEditingAny");

const EPHEMERAL_FLAG = 1 << 6;
const USER_INSTALL = 1;

let isDeletePressed = false;
const keydown = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = true);
const keyup = (e: KeyboardEvent) => e.key === "Backspace" && (isDeletePressed = false);
const focusChanged = () => !Stores.WindowStore.isFocused() && (isDeletePressed = false);

const settings = definePluginSettings({
    enableDeleteOnClick: {
        type: OptionType.BOOLEAN,
        description: "Delete messages by clicking them while holding Backspace",
        default: true
    },
    enableDoubleClickToEdit: {
        type: OptionType.BOOLEAN,
        description: "Double click to edit",
        default: true
    },
    enableDoubleClickToReply: {
        type: OptionType.BOOLEAN,
        description: "Double click to reply",
        default: true
    },
    requireModifier: {
        type: OptionType.BOOLEAN,
        description: "Only run double click actions while Shift or Ctrl is held",
        default: false
    }
});

export default definePlugin({
    name: "MessageClickActions",
    description: "Hold Backspace and click to delete, double click to edit or reply",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Maintiens Retour arrière et clique pour supprimer, double-clique pour modifier ou répondre",
            options: {
                enableDeleteOnClick: "Supprimer un message en cliquant dessus en maintenant Retour arrière",
                enableDoubleClickToEdit: "Double-cliquer pour modifier",
                enableDoubleClickToReply: "Double-cliquer pour répondre",
                requireModifier: "N'activer les doubles-clics qu'en maintenant Maj ou Ctrl"
            }
        }
    },
    settings,

    start() {
        document.addEventListener("keydown", keydown);
        document.addEventListener("keyup", keyup);
        Stores.WindowStore.addChangeListener(focusChanged);
    },

    stop() {
        document.removeEventListener("keydown", keydown);
        document.removeEventListener("keyup", keyup);
        Stores.WindowStore.removeChangeListener(focusChanged);
    },

    onMessageClick(message: any, channel: any, event: MouseEvent) {
        const myId = Stores.AuthenticationStore.getId();
        const isMe = message.author.id === myId;
        const isSelfInvokedUserApp = message.interactionMetadata?.authorizing_integration_owners?.[USER_INSTALL] === myId;

        if (!isDeletePressed) {
            if (event.detail < 2) return;
            if (settings.store.requireModifier && !event.ctrlKey && !event.shiftKey) return;
            if (channel.guild_id && !Stores.PermissionStore.can(Permissions.SEND_MESSAGES, channel)) return;
            if (message.deleted === true) return;

            if (isMe) {
                if (!settings.store.enableDoubleClickToEdit || EditStore.isEditing(channel.id, message.id) || message.state !== "SENT") return;

                MessageActions.startEditMessage(channel.id, message.id, message.content);
                event.preventDefault();
            } else {
                if (!settings.store.enableDoubleClickToReply) return;
                if (!MessageTypeSets.REPLYABLE.has(message.type) || message.hasFlag(EPHEMERAL_FLAG)) return;

                const isShiftPress = event.shiftKey && !settings.store.requireModifier;
                const shouldMention = isPluginEnabled("NoReplyMention")
                    ? (plugins.NoReplyMention as any).shouldMention(message, isShiftPress)
                    : !isShiftPress;

                FluxDispatcher.dispatch({
                    type: "CREATE_PENDING_REPLY",
                    channel,
                    message,
                    shouldMention,
                    showMentionToggle: channel.guild_id !== null
                });
            }
        } else if (settings.store.enableDeleteOnClick && (isMe || Stores.PermissionStore.can(Permissions.MANAGE_MESSAGES, channel) || isSelfInvokedUserApp)) {
            if (message.deleted) {
                FluxDispatcher.dispatch({
                    type: "MESSAGE_DELETE",
                    channelId: channel.id,
                    id: message.id,
                    mlDeleted: true
                });
            } else {
                MessageActions.deleteMessage(channel.id, message.id);
            }
            event.preventDefault();
        }
    }
});
