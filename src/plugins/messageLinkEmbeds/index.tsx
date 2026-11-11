/*
 * Majic — MessageLinkEmbeds plugin
 */

import { addMessageAccessory, removeMessageAccessory } from "@api/messageDecorations";
import { updateMessage } from "@api/messageUpdater";
import { definePluginSettings } from "@api/settings";
import { getUserSettingLazy } from "@api/userSettings";
import { Button } from "@components/ui";
import { createStrings } from "@i18n";
import { Queue } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { findComponentByCodeLazy, findComponentLazy, findCssClassesLazy } from "@webpack";
import { Endpoints, IconUtils, Parser, Permissions, React, RestAPI, Stores } from "@webpack/common";
import type { ComponentType, ReactElement } from "react";

const s = createStrings({
    en: {
        always: "Always use automod embeds",
        prefer: "Prefer automod embeds, but use rich embeds if some content can't be shown",
        never: "Never use automod embeds",
        blacklist: "Blacklist",
        whitelist: "Whitelist",
        clearCache: "Clear the linked message cache",
        directMessage: "Direct Message",
        groupDm: "Group DM",
        server: "Server",
        noContent: "[no content, {details}]",
        attachments: "{count} attachment(s)",
        embeds: "{count} embed(s)",
        and: "{a} and {b}"
    },
    fr: {
        always: "Toujours utiliser les intégrations compactes",
        prefer: "Préférer les intégrations compactes, sauf si du contenu ne peut pas s'afficher",
        never: "Ne jamais utiliser les intégrations compactes",
        blacklist: "Liste noire",
        whitelist: "Liste blanche",
        clearCache: "Vider le cache des messages liés",
        directMessage: "Message privé",
        groupDm: "Groupe privé",
        server: "Serveur",
        noContent: "[pas de contenu, {details}]",
        attachments: "{count} pièce(s) jointe(s)",
        embeds: "{count} intégration(s)",
        and: "{a} et {b}"
    }
});

const messageCache = new Map<string, { message?: any; fetched: boolean }>();

const getCacheKey = (channelId: string, messageId: string) => `${channelId}:${messageId}`;

const Embed = findComponentLazy(m => m.prototype?.renderSuppressButton);
const ChannelMessage = findComponentByCodeLazy("childrenExecutedCommand:", ".hideAccessories");
let AutoModEmbed: ComponentType<any> = () => null;

const EmbedClasses = findCssClassesLazy("embedAuthorIcon", "embedAuthor", "embedAuthor", "embedMargin");

const MessageDisplayCompact = getUserSettingLazy("textAndImages", "messageDisplayCompact")!;

const messageLinkRegex = /(?<!<)https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/(?:\d{17,20}|@me)\/(\d{17,20})\/(\d{17,20})/g;
const tenorRegex = /^https:\/\/(?:www\.)?tenor\.com\//;

interface Attachment {
    height: number;
    width: number;
    url: string;
    proxyURL?: string;
}

interface MessageEmbedProps {
    message: any;
    channel: any;
}

const messageFetchQueue = new Queue();

const settings = definePluginSettings({
    messageBackgroundColor: {
        type: OptionType.BOOLEAN,
        description: "Background color for messages in rich embeds",
        default: false
    },
    automodEmbeds: {
        type: OptionType.SELECT,
        description: "Use automod embeds instead of rich embeds (smaller but less info)",
        options: [
            { get label() { return s("always"); }, value: "always" },
            { get label() { return s("prefer"); }, value: "prefer" },
            { get label() { return s("never"); }, value: "never", default: true }
        ]
    },
    listMode: {
        type: OptionType.SELECT,
        description: "Use the ID list as a blacklist or a whitelist",
        options: [
            { get label() { return s("blacklist"); }, value: "blacklist", default: true },
            { get label() { return s("whitelist"); }, value: "whitelist" }
        ]
    },
    idList: {
        type: OptionType.STRING,
        description: "Server/channel/user IDs to blacklist or whitelist (separated by commas)",
        default: "",
        multiline: true
    },
    clearMessageCache: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <Button onClick={() => messageCache.clear()}>{s("clearCache")}</Button>
    }
});

async function fetchMessage(channelId: string, messageId: string) {
    const cacheKey = getCacheKey(channelId, messageId);

    const cached = messageCache.get(cacheKey);
    if (cached) return cached.message;

    messageCache.set(cacheKey, { fetched: false });

    const res = await RestAPI.get({
        url: Endpoints.MESSAGES(channelId),
        query: { limit: 1, around: messageId },
        retries: 2
    }).catch(() => null);

    const msg = res?.body?.[0];
    if (!msg || msg.id !== messageId) return;

    const message = Stores.MessageStore.getMessages(msg.channel_id).receiveMessage(msg).get(msg.id);
    if (!message) return;

    messageCache.set(cacheKey, { message, fetched: true });
    return message;
}

function getImages(message: any): Attachment[] {
    const attachments: Attachment[] = [];

    for (const { content_type, height, width, url, proxy_url } of message.attachments ?? []) {
        if (content_type?.startsWith("image/")) attachments.push({ height, width, url, proxyURL: proxy_url });
    }

    for (const { type, image, thumbnail, url } of message.embeds ?? []) {
        if (type === "image") attachments.push({ ...(image ?? thumbnail) });
        else if (url && type === "gifv" && !tenorRegex.test(url)) attachments.push({ height: thumbnail.height, width: thumbnail.width, url });
    }

    return attachments;
}

function noContent(attachments: number, embeds: number) {
    if (!attachments && !embeds) return "";
    const attachmentText = s("attachments", { count: attachments });
    const embedText = s("embeds", { count: embeds });
    if (!attachments) return s("noContent", { details: embedText });
    if (!embeds) return s("noContent", { details: attachmentText });
    return s("noContent", { details: s("and", { a: attachmentText, b: embedText }) });
}

function requiresRichEmbed(message: any) {
    if (message.components.length) return true;
    if (message.attachments.some((a: any) => !a.content_type?.startsWith("image/"))) return true;
    if (message.embeds.some((e: any) => e.type !== "image" && (e.type !== "gifv" || tenorRegex.test(e.url)))) return true;
    return false;
}

function computeWidthAndHeight(width: number, height: number) {
    const maxWidth = 400;
    const maxHeight = 300;

    if (width > height) {
        const adjustedWidth = Math.min(width, maxWidth);
        return { width: adjustedWidth, height: Math.round(height / (width / adjustedWidth)) };
    }

    const adjustedHeight = Math.min(height, maxHeight);
    return { width: Math.round(width / (height / adjustedHeight)), height: adjustedHeight };
}

function withEmbeddedBy(message: any, embeddedBy: string[]) {
    return new Proxy(message, {
        get(target, prop, receiver) {
            if (prop === "majicEmbeddedBy") return embeddedBy;
            return Reflect.get(target, prop, receiver);
        }
    });
}

function MessageEmbedAccessory({ message }: { message: any }) {
    const embeddedBy: string[] = message.majicEmbeddedBy ?? [];
    const accessories: Array<ReactElement | null> = [];

    const seen = new Set<string>();
    let count = 0;
    for (const [, channelId, messageId] of (message.content as string).matchAll(messageLinkRegex)) {
        if (embeddedBy.includes(messageId) || embeddedBy.length > 2 || seen.has(messageId) || count >= 5) continue;

        seen.add(messageId);
        count++;

        const linkedChannel = Stores.ChannelStore.getChannel(channelId);
        if (!linkedChannel || (!linkedChannel.isPrivate() && !Stores.PermissionStore.can(Permissions.VIEW_CHANNEL, linkedChannel))) continue;

        const { listMode, idList } = settings.store;
        const isListed = [linkedChannel.guild_id, channelId, message.author.id].some(id => id && idList.includes(id));

        if (listMode === "blacklist" && isListed) continue;
        if (listMode === "whitelist" && !isListed) continue;

        const cacheKey = getCacheKey(channelId, messageId);
        let linkedMessage = messageCache.get(cacheKey)?.message;
        if (!linkedMessage) {
            linkedMessage = Stores.MessageStore.getMessage(channelId, messageId);
            if (linkedMessage) {
                messageCache.set(cacheKey, { message: linkedMessage, fetched: true });
            } else {
                messageFetchQueue.unshift(() => fetchMessage(channelId, messageId).then(m => m && updateMessage(message.channel_id, message.id)));
                continue;
            }
        }

        const messageProps: MessageEmbedProps = {
            message: withEmbeddedBy(linkedMessage, [...embeddedBy, message.id]),
            channel: linkedChannel
        };

        const type = settings.store.automodEmbeds;
        accessories.push(
            type === "always" || (type === "prefer" && !requiresRichEmbed(linkedMessage))
                ? <AutomodEmbedAccessory key={messageId} {...messageProps} />
                : <ChannelMessageEmbedAccessory key={messageId} {...messageProps} />
        );
    }

    return accessories.length ? <>{accessories}</> : null;
}

function getChannelLabelAndIconUrl(channel: any): [string, string | undefined] {
    if (channel.isDM()) return [s("directMessage"), IconUtils.getUserAvatarURL(Stores.UserStore.getUser(channel.recipients[0]))];
    if (channel.isGroupDM()) return [s("groupDm"), IconUtils.getChannelIconURL(channel)];
    return [s("server"), IconUtils.getGuildIconURL(Stores.GuildStore.getGuild(channel.guild_id))];
}

function ChannelMessageEmbedAccessory({ message, channel }: MessageEmbedProps) {
    const compact = MessageDisplayCompact.useSetting();
    const dmReceiver = Stores.UserStore.getUser(Stores.ChannelStore.getChannel(channel.id).recipients?.[0]);
    const [channelLabel, iconUrl] = getChannelLabelAndIconUrl(channel);

    return (
        <Embed
            embed={{
                rawDescription: "",
                color: "var(--background-base-lower)",
                author: {
                    name: (
                        <span className="majic-mle-author">
                            <span>{channelLabel} - </span>
                            {Parser.parse(channel.isDM() ? `<@${dmReceiver.id}>` : `<#${channel.id}>`)}
                        </span>
                    ),
                    iconProxyURL: iconUrl
                }
            }}
            renderDescription={() => (
                <div
                    key={message.id}
                    style={!settings.store.messageBackgroundColor ? undefined : {
                        backgroundColor: "var(--background-base-lower)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "8px",
                        paddingBottom: "8px"
                    }}
                >
                    <ChannelMessage
                        id={`message-link-embeds-${message.id}`}
                        message={message}
                        channel={channel}
                        subscribeToComponentDispatch={false}
                        compact={compact}
                    />
                </div>
            )}
        />
    );
}

function AutomodEmbedAccessory({ message, channel }: MessageEmbedProps) {
    const compact = MessageDisplayCompact.useSetting();
    const images = getImages(message);
    const [channelLabel, iconUrl] = getChannelLabelAndIconUrl(channel);

    return (
        <AutoModEmbed
            channel={channel}
            childrenAccessories={
                <span className={`majic-mle-author ${EmbedClasses.embedAuthor} ${EmbedClasses.embedMargin}`} style={{ color: "var(--text-muted, var(--text-default))" }}>
                    {iconUrl && <img src={iconUrl} className={EmbedClasses.embedAuthorIcon} alt="" />}
                    <span>
                        <span>{channelLabel} - </span>
                        {channel.isDM()
                            ? Parser.parse(`<@${Stores.ChannelStore.getChannel(channel.id).recipients[0]}>`)
                            : Parser.parse(`<#${channel.id}>`)}
                    </span>
                </span>
            }
            compact={compact}
            content={
                <>
                    {message.content || message.attachments.length <= images.length
                        ? Parser.parse(message.content)
                        : [noContent(message.attachments.length, message.embeds.length)]}
                    {images.map((a, idx) => {
                        const { width, height } = computeWidthAndHeight(a.width, a.height);
                        return (
                            <div key={idx}>
                                <img src={a.proxyURL ?? a.url} width={width} height={height} />
                            </div>
                        );
                    })}
                </>
            }
            hideTimestamp={false}
            message={message}
            _messageEmbed="automod"
        />
    );
}

export default definePlugin({
    name: "MessageLinkEmbeds",
    description: "Adds a preview to messages that link another message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un aperçu aux messages qui contiennent un lien vers un autre message",
            options: {
                messageBackgroundColor: "Couleur de fond pour les messages dans les intégrations détaillées",
                automodEmbeds: "Utiliser les intégrations compactes au lieu des détaillées (plus petites mais moins d'infos)",
                listMode: "Utiliser la liste d'ID comme liste noire ou liste blanche",
                idList: "ID de serveurs/salons/utilisateurs pour la liste noire ou blanche (séparés par des virgules)"
            }
        }
    },
    settings,

    css: ".majic-mle-author { font-size: 12px; font-weight: 500; }",

    patches: [
        {
            find: "!1,withFooter:",
            replacement: {
                match: /(?=function (\i)\(\i\){let{message:\i,channel:\i,[^}]+?withFooter:)/,
                replace: "$self.AutoModEmbed=$1;"
            }
        }
    ],

    set AutoModEmbed(value: any) {
        AutoModEmbed = value;
    },

    start() {
        addMessageAccessory("MessageLinkEmbeds", props => {
            if (!messageLinkRegex.test(props.message.content)) return null;
            messageLinkRegex.lastIndex = 0;
            return <MessageEmbedAccessory message={props.message} />;
        }, 4);
    },

    stop() {
        removeMessageAccessory("MessageLinkEmbeds");
    }
});
