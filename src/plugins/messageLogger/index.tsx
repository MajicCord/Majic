/*
 * Majic — MessageLogger plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { updateMessage } from "@api/messageUpdater";
import { definePluginSettings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { classes } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { DiscordIcon, FluxDispatcher, React, Stores, Timestamp, useStateFromStores } from "@webpack/common";

import { openHistoryModal } from "./HistoryModal";
import { parseEditContent, s } from "./utils";

const logger = new Logger("MessageLogger", "#ff5555");

const MessageClasses = findCssClassesLazy("edited", "communicationDisabled", "isSystemMessage");

const HistoryIcon = () => <DiscordIcon name="ClockIcon" size={18} />;
const EyeIcon = () => <DiscordIcon name="EyeIcon" size={18} />;

const TEXT_STYLE = ".majic-ml-deleted { --text-default: var(--status-danger, #f04747); --interactive-icon-default: var(--status-danger, #f04747); --text-muted: var(--status-danger, #f04747); --embed-title: var(--red-460, #be3535); --text-link: var(--red-460, #be3535); --text-strong: var(--red-460, #be3535); }";
const OVERLAY_STYLE = ".majic-ml-deleted { background-color: hsl(var(--red-430-hsl, 0 85% 61%) / 15%) !important; }";

const settings = definePluginSettings({
    deleteStyle: {
        type: OptionType.SELECT,
        description: "Style of deleted messages",
        options: [
            { get label() { return s("redText"); }, value: "text", default: true },
            { get label() { return s("redOverlay"); }, value: "overlay" }
        ],
        onChange: () => addDeleteStyle()
    },
    logDeletes: {
        type: OptionType.BOOLEAN,
        description: "Log deleted messages",
        default: true
    },
    collapseDeleted: {
        type: OptionType.BOOLEAN,
        description: "Collapse deleted messages, like blocked messages",
        default: false,
        restartNeeded: true
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: "Log edited messages",
        default: true
    },
    logDeletedAttachments: {
        type: OptionType.BOOLEAN,
        description: "Log deleted attachments",
        default: true,
        restartNeeded: true
    },
    inlineEdits: {
        type: OptionType.BOOLEAN,
        description: "Show edit history as part of the message content",
        default: true
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Ignore messages by bots",
        default: true
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Ignore your own messages",
        default: false
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to ignore",
        default: "",
        multiline: true
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to ignore",
        default: "",
        multiline: true
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of server IDs to ignore",
        default: "",
        multiline: true
    }
});

function addDeleteStyle() {
    if (settings.store.deleteStyle === "text") {
        enableStyle("message-logger-delete-style", TEXT_STYLE);
    } else {
        enableStyle("message-logger-delete-style", OVERLAY_STYLE);
    }
}

const buttonsToRemove = ["edit", "reply", "forward", "thread", "pin", "delete", "mark-unread", "apps", "bookmark", "reminder"];

const REMOVE_HISTORY_ID = "ml-remove-history";
const TOGGLE_DELETE_STYLE_ID = "ml-toggle-style";

function clearMessageHistory(message: any) {
    if (message.deleted) {
        FluxDispatcher.dispatch({
            type: "MESSAGE_DELETE",
            channelId: message.channel_id,
            id: message.id,
            mlDeleted: true
        });
    } else {
        const attachments = message.attachments?.filter((a: any) => !a.deleted);
        updateMessage(message.channel_id, message.id, { editHistory: [], attachments });
    }
}

function doesMessageHaveHistory(message: any): boolean {
    return message.deleted || !!message.editHistory?.length || message.attachments?.some((a: any) => a.deleted);
}

function patchMessageContextMenu(children: any[], { message }: { message?: any } = {}) {
    if (!message || !doesMessageHaveHistory(message)) return;
    const { deleted, id, channel_id } = message;

    if (deleted) {
        for (const buttonId of buttonsToRemove) {
            const group = findGroupChildrenByChildId(buttonId, children);
            if (group) {
                const index = group.findIndex(c => c?.props?.id === buttonId);
                group.splice(index, 1);
            }
        }

        const domElement = document.getElementById(`chat-messages-${channel_id}-${id}`);
        if (domElement) {
            children.push(
                <Menu.MenuItem
                    id={TOGGLE_DELETE_STYLE_ID}
                    key={TOGGLE_DELETE_STYLE_ID}
                    label={s("toggleHighlight")}
                    leadingAccessory={{ type: "icon", icon: EyeIcon }}
                    action={() => domElement.classList.toggle("majic-ml-deleted")}
                />
            );
        }
    }

    children.push(
        <Menu.MenuItem
            id={REMOVE_HISTORY_ID}
            key={REMOVE_HISTORY_ID}
            label={s("clearHistory")}
            leadingAccessory={{ type: "icon", icon: HistoryIcon }}
            color="danger"
            action={() => clearMessageHistory(message)}
        />
    );
}

function patchChannelContextMenu(children: any[], { channel }: { channel?: any } = {}) {
    const messages = Stores.MessageStore.getMessages(channel?.id);
    if (!messages?.some((msg: any) => doesMessageHaveHistory(msg))) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="majic-ml-clear-channel"
            key="majic-ml-clear-channel"
            label={s("clearLog")}
            color="danger"
            action={() => messages.forEach((msg: any) => clearMessageHistory(msg))}
        />
    );
}

function Edits({ message: { id: messageId, channel_id: channelId } }: { message: any }) {
    const message = useStateFromStores(
        [Stores.MessageStore],
        () => Stores.MessageStore.getMessage(channelId, messageId),
        undefined,
        (oldMsg, newMsg) => oldMsg?.editHistory === newMsg?.editHistory
    );

    if (!settings.store.inlineEdits) return null;

    return (
        <>
            {message.editHistory?.map((edit: { content: string; timestamp: Date }, idx: number) => (
                <div key={idx} className="majic-ml-edited">
                    {parseEditContent(edit.content, message)}
                    <Timestamp timestamp={edit.timestamp} isEdited={true} isInline={false}>
                        <span className={MessageClasses.edited}>{" "}({getIntlMessage("MESSAGE_EDITED")})</span>
                    </Timestamp>
                </div>
            ))}
        </>
    );
}

const CSS = [
    `.majic-ml-deleted [class*="buttonsInner"] [role="button"]:not([aria-label="Clear history"]):not([aria-label="Effacer l'historique"]), .majic-ml-deleted [class*="buttonsInner"] [class*="separator"] { display: none; }`,
    `.majic-ml-deleted-attachment, .majic-ml-deleted :is(.emoji, [data-type="sticker"], [class*="embedIframe"], [class*="embedSpotify"], [class*="imageContainer"]) { filter: grayscale(1) !important; transition: 150ms filter ease-in-out; &[class*="hiddenMosaicItem"] { filter: grayscale(1) blur(var(--custom-message-attachment-spoiler-blur-radius, 44px)) !important; } &:hover { filter: grayscale(0) !important; } }`,
    ".majic-ml-deleted [class*=\"spoilerWarning\"] { color: var(--status-danger); }",
    ".theme-dark .majic-ml-edited { filter: brightness(80%); }",
    ".theme-light .majic-ml-edited { opacity: 0.5; }",
    ".majic-ml-edit-marker { cursor: pointer; }",
    ".majic-ml-modal-timestamp { cursor: unset; height: unset; }",
    ".majic-ml-modal-tab-bar { flex-wrap: wrap; gap: 16px; }"
].join(" ");

export default definePlugin({
    name: "MessageLogger",
    description: "Temporarily logs deleted and edited messages",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Garde temporairement les messages supprimés et modifiés",
            options: {
                deleteStyle: "Style des messages supprimés",
                logDeletes: "Garder les messages supprimés",
                collapseDeleted: "Replier les messages supprimés, comme les messages bloqués",
                logEdits: "Garder les messages modifiés",
                logDeletedAttachments: "Garder les pièces jointes supprimées",
                inlineEdits: "Afficher l'historique des modifications dans le message",
                ignoreBots: "Ignorer les messages des bots",
                ignoreSelf: "Ignorer tes propres messages",
                ignoreUsers: "ID d'utilisateurs à ignorer, séparés par des virgules",
                ignoreChannels: "ID de salons à ignorer, séparés par des virgules",
                ignoreGuilds: "ID de serveurs à ignorer, séparés par des virgules"
            }
        }
    },
    settings,

    css: CSS,

    contextMenus: {
        message: patchMessageContextMenu,
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "user-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu
    },

    start() {
        addDeleteStyle();
    },

    stop() {
        disableStyle("message-logger-delete-style");
    },

    messagePopoverButtons: {
        history(message) {
            const current = Stores.MessageStore.getMessage(message.channel_id, message.id);
            if (!current || !doesMessageHaveHistory(current)) return null;

            return {
                label: s("clearHistoryShort"),
                icon: HistoryIcon,
                onClick: () => {
                    const latest = Stores.MessageStore.getMessage(message.channel_id, message.id);
                    if (latest) clearMessageHistory(latest);
                }
            };
        }
    },

    renderEdits: withErrorBoundary("MessageLogger", Edits),

    makeEdit(newMessage: any, oldMessage: any) {
        return {
            timestamp: new Date(newMessage.edited_timestamp),
            content: oldMessage.content
        };
    },

    handleUpdateAttachments(newMessage: any) {
        const oldMessage = Stores.MessageStore.getMessage(newMessage.channel_id, newMessage.id);
        if (!oldMessage || this.shouldIgnore(newMessage, true)) return newMessage.attachments;

        if (!newMessage.attachments?.length) {
            return oldMessage.attachments.map((a: any) => ({ ...a, deleted: true }));
        }

        return oldMessage.attachments
            .map((oldAttachment: any) => newMessage.attachments.find((a: any) => a.id === oldAttachment.id) ?? { ...oldAttachment, deleted: true })
            .concat(newMessage.attachments.filter((a: any) => !oldMessage.attachments.some((o: any) => o.id === a.id)));
    },

    handleDelete(cache: any, data: { ids: string[]; id: string; mlDeleted?: boolean }, isBulk: boolean) {
        try {
            if (cache == null || (!isBulk && !cache.has(data.id))) return cache;

            const mutate = (id: string) => {
                const msg = cache.get(id);
                if (!msg) return;

                const EPHEMERAL = 64;
                const shouldIgnore = data.mlDeleted || (msg.flags & EPHEMERAL) === EPHEMERAL || this.shouldIgnore(msg);

                if (shouldIgnore) {
                    cache = cache.remove(id);
                } else {
                    cache = cache.update(id, (m: any) => m
                        .set("deleted", true)
                        .set("attachments", m.attachments.map((a: any) => (a.deleted = true, a))));
                }
            };

            if (isBulk) data.ids.forEach(mutate);
            else mutate(data.id);
        } catch (err) {
            logger.error("Error during handleDelete", err);
        }
        return cache;
    },

    shouldIgnore(message: any, isEdit = false) {
        try {
            const { ignoreBots, ignoreSelf, ignoreUsers, ignoreChannels, ignoreGuilds, logEdits, logDeletes } = settings.store;
            const myId = Stores.UserStore.getCurrentUser().id;
            const channel = Stores.ChannelStore.getChannel(message.channel_id);

            return ignoreBots && message.author?.bot
                || ignoreSelf && message.author?.id === myId
                || ignoreUsers.includes(message.author?.id)
                || ignoreChannels.includes(message.channel_id)
                || ignoreChannels.includes(channel?.parent_id)
                || (isEdit ? !logEdits : !logDeletes)
                || ignoreGuilds.includes(channel?.guild_id);
        } catch {
            return false;
        }
    },

    normalizeNonce(msg: any) {
        try {
            if (!msg.nonce || msg.author.id === Stores.AuthenticationStore.getId()) return;

            const prevMsg = Stores.MessageStore.getMessage(msg.channel_id, msg.nonce);
            if (!prevMsg || prevMsg.state !== "SENT") return;

            if (prevMsg.id !== msg.id) delete msg.nonce;
        } catch {
            logger.error("Error normalizing nonce");
        }
    },

    EditMarker({ message, className, children, ...props }: any) {
        return (
            <span
                {...props}
                className={classes("majic-ml-edit-marker", className)}
                onClick={() => openHistoryModal(message)}
                role="button"
            >
                {children}
            </span>
        );
    },

    DELETED_MESSAGE_COUNT: () => ({
        ast: [[
            6,
            "count",
            {
                "=0": [s("noDeleted")],
                one: [[1, "count"], s("deletedOne")],
                other: [[1, "count"], s("deletedOther")]
            },
            0,
            "cardinal"
        ]]
    }),

    getReactionTarget(channelId: string) {
        const messages = Stores.MessageStore.getMessages(channelId)._array;
        return messages.findLast((msg: any) => !msg.deleted);
    },

    patches: [
        {
            find: '"MessageStore"',
            replacement: [
                {
                    match: /(?<=MESSAGE_DELETE:function\((\i)\)\{)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, false);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    match: /(?<=MESSAGE_DELETE_BULK:function\((\i)\){)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, true);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    match: /(MESSAGE_UPDATE:function\((\i)\).+?)\.update\((\i)/,
                    replace: `
                        $1
                        .update($3, m =>
                            (($2.message.flags & 64) === 64 || $self.shouldIgnore($2.message, true)) ? m :
                            $2.message.edited_timestamp && $2.message.content !== m.content ?
                                m.set('editHistory',[...(m.editHistory || []), $self.makeEdit($2.message, m)]) :
                                m
                        )
                        .update($3
                    `
                },
                {
                    match: /(?<=getLastEditableMessage\(\i\)\{.{0,200}\.find\((\i)=>)/,
                    replace: "!$1.deleted &&"
                }
            ]
        },
        {
            find: "}addReaction(",
            replacement: {
                match: /this\.customRenderedContent=(\i)\.customRenderedContent,/,
                replace: "this.customRenderedContent = $1.customRenderedContent,"
                    + "this.deleted = $1.deleted || false,"
                    + "this.editHistory = $1.editHistory || [],"
                    + "this.firstEditTimestamp = $1.firstEditTimestamp || this.editedTimestamp || this.timestamp,"
            }
        },
        {
            find: ".PREMIUM_REFERRAL&&(",
            replacement: [
                {
                    match: /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                    replace: "Object.assign($&,{ deleted:$1.deleted, editHistory:$1.editHistory, firstEditTimestamp:$1.firstEditTimestamp })"
                },
                {
                    match: /attachments:(\i)\.attachments\?\?\[\],/,
                    predicate: () => settings.store.logDeletedAttachments,
                    replace: "attachments: $self.handleUpdateAttachments($1),"
                }
            ]
        },
        {
            find: "#{intl::REMOVE_ATTACHMENT_TOOLTIP_TEXT}",
            replacement: [
                {
                    match: /\.SPOILER,(?=\[\i\.\i\]:)(?<=item:(\i),.{0,200}?)/,
                    replace: '$&"majic-ml-deleted-attachment": $1?.originalItem?.deleted,'
                },
                {
                    match: /(?<=\{let\{[^}]*?item:(\i),autoPlayGif:\i,)canRemoveItem:(\i)(?=,onRemoveItem:)/,
                    replace: "_canRemoveItem:$2 = arguments[0].canRemoveItem && !$1?.originalItem?.deleted"
                }
            ]
        },
        {
            find: "Message must not be a thread starter message",
            replacement: {
                match: /\)\("li",\{(.+?),className:/,
                replace: ")(\"li\",{$1,className:(arguments[0].message.deleted ? \"majic-ml-deleted \" : \"\")+"
            }
        },
        {
            find: ".SEND_FAILED,",
            replacement: {
                match: /\]:\i.isUnsupported.{0,20}?,children:\[/,
                replace: "$&arguments[0]?.message?.editHistory?.length>0&&$self.renderEdits(arguments[0]),"
            }
        },
        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /(isInline:!1,children:.{0,50}?)"span",\{(?=className:)/,
                replace: "$1$self.EditMarker,{message:arguments[0].message,"
            }
        },
        {
            find: '"ReferencedMessageStore"',
            replacement: [
                {
                    match: /(?<=MESSAGE_DELETE:function\(\i\)\{)/,
                    replace: "return;"
                },
                {
                    match: /(?<=MESSAGE_DELETE_BULK:function\(\i\)\{)/,
                    replace: "return;"
                }
            ]
        },
        {
            find: ".MESSAGE,commandTargetId:",
            replacement: {
                match: /children:(\[""===.+?\])/,
                replace: "children:arguments[0].message.deleted?[]:$1"
            }
        },
        {
            find: "NON_COLLAPSIBLE.has(",
            predicate: () => settings.store.collapseDeleted,
            replacement: {
                match: /if\((\i)\.blocked\)return \i\.\i\.MESSAGE_GROUP_BLOCKED;/,
                replace: '$&else if($1.deleted) return"MESSAGE_GROUP_DELETED";'
            }
        },
        {
            find: "#{intl::NEW_MESSAGES_ESTIMATED_WITH_DATE}",
            predicate: () => settings.store.collapseDeleted,
            replacement: [
                {
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\|\|/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"||'
                },
                {
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\?(\i)=.*?:/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"?$2=$self.DELETED_MESSAGE_COUNT:'
                }
            ]
        },
        {
            find: "this.truncateTop",
            replacement: {
                match: /receiveMessage\((\i)\)\{/,
                replace: "$& $self.normalizeNonce($1);"
            }
        },
        {
            find: "anyScopeRegex(/^\\+:(.+?): *$/)",
            replacement: {
                match: /(?<=anyScopeRegex\(\/\^\\\+:\(\.\+\?\): \*\$\/\),action\(\i,\i\)\{.{10,80}?\i=)\i\.\i\.getMessages\((\i\.id)\)\.last\(\)/,
                replace: "$self.getReactionTarget($1)"
            }
        }
    ]
});
