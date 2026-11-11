/*
 * Majic — FakeNitro plugin
 */

import { addMessagePreEditListener, addMessagePreSendListener, type MessageEditListener, type MessageSendListener, removeMessagePreEditListener, removeMessagePreSendListener } from "@api/messageEvents";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, proxyLazyWebpack } from "@webpack";
import { FluxDispatcher, IconUtils, openModal, Permissions, React, Stores, UserSettingsActionCreators } from "@webpack/common";
import type { ReactElement, ReactNode } from "react";

const s = createStrings({
    en: {
        holdOn: "Hold on!",
        embedNotice: "You are trying to send or edit a message that contains a FakeNitro emoji or sticker, but you do not have permission to embed links in this channel. Are you sure you want to send this message? Your FakeNitro items will appear as a link only.",
        sendAnyway: "Send Anyway",
        cancel: "Cancel",
        dontAskAgain: "Don't ask again",
        stickerNotice: " This is a FakeNitro sticker and renders like a real sticker only for you. Appears as a link to other users.",
        emojiNotice: " This is a FakeNitro emoji and renders like a real emoji only for you. Appears as a link to other users."
    },
    fr: {
        holdOn: "Attends !",
        embedNotice: "Tu essaies d'envoyer ou de modifier un message qui contient un emoji ou un autocollant FakeNitro, mais tu n'as pas la permission d'intégrer des liens dans ce salon. Veux-tu vraiment l'envoyer ? Tes éléments FakeNitro apparaîtront seulement comme des liens.",
        sendAnyway: "Envoyer quand même",
        cancel: "Annuler",
        dontAskAgain: "Ne plus demander",
        stickerNotice: " C'est un autocollant FakeNitro : il s'affiche comme un vrai autocollant seulement pour toi. Les autres voient un lien.",
        emojiNotice: " C'est un emoji FakeNitro : il s'affiche comme un vrai emoji seulement pour toi. Les autres voient un lien."
    }
});

const BINARY_READ_OPTIONS = findByPropsLazy("readerFactory");
const ConfirmModal = findByCodeLazy("actionBarInput:", '"critical"', '"secondary');

function searchProtoClassField(localName: string, protoClass: any) {
    const field = protoClass?.fields?.find((f: any) => f.localName === localName);
    if (!field) return;

    const fieldGetter = Object.values(field).find(value => typeof value === "function") as any;
    return fieldGetter?.();
}

const logger = new Logger("FakeNitro", "#ff79c6");

const PreloadedUserSettingsActionCreators = proxyLazyWebpack(() => UserSettingsActionCreators.PreloadedUserSettingsActionCreators);
const AppearanceSettingsActionCreators = proxyLazyWebpack(() => searchProtoClassField("appearance", PreloadedUserSettingsActionCreators.ProtoClass));
const ClientThemeSettingsActionsCreators = proxyLazyWebpack(() => searchProtoClassField("clientThemeSettings", AppearanceSettingsActionCreators));

const isUnusableRoleSubscriptionEmoji = findByCodeLazy(".getUserIsAdmin(");

const EmojiIntentions = {
    CHAT: 3,
    GUILD_STICKER_RELATED_EMOJI: 4
} as const;

const IS_BYPASSEABLE_INTENTION = `[${EmojiIntentions.CHAT},${EmojiIntentions.GUILD_STICKER_RELATED_EMOJI}].includes(fakeNitroIntention)`;

const FakeNoticeType = {
    Sticker: 0,
    Emoji: 1
} as const;

const StickerFormatType = {
    PNG: 1,
    APNG: 2,
    LOTTIE: 3,
    GIF: 4
} as const;

const fakeNitroEmojiRegex = /\/emojis\/(\d+?)\.(png|webp|gif)/;
const fakeNitroStickerRegex = /\/stickers\/(\d+?)\./;
const fakeNitroGifStickerRegex = /\/attachments\/\d+?\/\d+?\/(\d+?)\.gif/;
const hyperLinkRegex = /\[.+?\]\((https?:\/\/.+?)\)/;
const hyperLinkOnlyRegex = new RegExp(`^${hyperLinkRegex.source}$`);
const mediaSizes = [16, 32, 48, 56, 64, 96, 128, 160, 256, 512, 1024];

const DEFAULT_EMOJI_SIZE = 48;
const DEFAULT_STICKER_SIZE = 160;

let preSend: MessageSendListener | undefined;
let preEdit: MessageEditListener | undefined;

const settings = definePluginSettings({
    enableEmojiBypass: {
        type: OptionType.BOOLEAN,
        description: "Allows sending fake emojis (also bypasses missing permission to use custom emojis)",
        default: true,
        restartNeeded: true
    },
    emojiSize: {
        type: OptionType.SELECT,
        description: "Size of the emojis when sending",
        options: mediaSizes.map(size => ({ label: `${size}px`, value: size, default: size === DEFAULT_EMOJI_SIZE }))
    },
    transformEmojis: {
        type: OptionType.BOOLEAN,
        description: "Transform fake emojis into real ones",
        default: true,
        restartNeeded: true
    },
    enableStickerBypass: {
        type: OptionType.BOOLEAN,
        description: "Allows sending fake stickers (also bypasses missing permission to use stickers)",
        default: true,
        restartNeeded: true
    },
    stickerSize: {
        type: OptionType.SELECT,
        description: "Size of the stickers when sending",
        options: mediaSizes.map(size => ({ label: `${size}px`, value: size, default: size === DEFAULT_STICKER_SIZE }))
    },
    transformStickers: {
        type: OptionType.BOOLEAN,
        description: "Transform fake stickers into real ones",
        default: true,
        restartNeeded: true
    },
    transformCompoundSentence: {
        type: OptionType.BOOLEAN,
        description: "Transform fake stickers and emojis in compound sentences (sentences with more content than just the fake emoji or sticker link)",
        default: false
    },
    enableStreamQualityBypass: {
        type: OptionType.BOOLEAN,
        description: "Allow streaming in Nitro quality",
        default: true,
        restartNeeded: true
    },
    useHyperLinks: {
        type: OptionType.BOOLEAN,
        description: "Use hyperlinks when sending fake emojis and stickers",
        default: true
    },
    hyperLinkText: {
        type: OptionType.STRING,
        description: "Text the hyperlink should use. {{NAME}} will be replaced with the emoji or sticker name.",
        default: "{{NAME}}"
    },
    disableEmbedPermissionCheck: {
        type: OptionType.BOOLEAN,
        description: "Disable the embed permission check when sending fake emojis and stickers",
        default: false
    }
});

function hasPermission(channelId: string, permission: bigint) {
    const channel = Stores.ChannelStore.getChannel(channelId);
    if (!channel || channel.isPrivate()) return true;
    return Stores.PermissionStore.can(permission, channel);
}

const hasExternalEmojiPerms = (channelId: string) => hasPermission(channelId, Permissions.USE_EXTERNAL_EMOJIS);
const hasExternalStickerPerms = (channelId: string) => hasPermission(channelId, Permissions.USE_EXTERNAL_STICKERS);
const hasEmbedPerms = (channelId: string) => hasPermission(channelId, Permissions.EMBED_LINKS);

function getWordBoundary(origStr: string, offset: number) {
    return (!origStr[offset] || /\s/.test(origStr[offset])) ? "" : " ";
}

function getCurrentGuild() {
    const channel = Stores.ChannelStore.getChannel(Stores.SelectedChannelStore.getChannelId());
    return Stores.GuildStore.getGuild(channel?.guild_id);
}

function CannotEmbedNoticeModal({ modalProps, resolve }: { modalProps: any; resolve: (value: boolean) => void }) {
    const current = settings.use(["disableEmbedPermissionCheck"]);
    return (
        <ConfirmModal
            {...modalProps}
            title={s("holdOn")}
            subtitle={s("embedNotice")}
            confirmText={s("sendAnyway")}
            cancelText={s("cancel")}
            onConfirm={() => resolve(true)}
            onCloseCallback={() => setTimeout(() => resolve(false), 0)}
            checkboxProps={{
                label: s("dontAskAgain"),
                checked: current.disableEmbedPermissionCheck === true,
                onChange: (checked: boolean) => current.disableEmbedPermissionCheck = checked
            }}
        />
    );
}

function showCannotEmbedNotice() {
    return new Promise<boolean>(resolve => {
        openModal((props: any) => <CannotEmbedNoticeModal modalProps={props} resolve={resolve} />);
    });
}

function makeLink(url: URL, name: string) {
    const linkText = settings.store.hyperLinkText.replaceAll("{{NAME}}", name);
    return settings.store.useHyperLinks ? `[${linkText}](${url})` : String(url);
}

function getEmojiURL(emoji: { id: string; animated: boolean; name: string }) {
    const emojiSize = settings.store.emojiSize ?? DEFAULT_EMOJI_SIZE;
    const url = new URL(IconUtils.getEmojiURL({ id: emoji.id, animated: emoji.animated, size: emojiSize }));
    url.searchParams.set("size", String(emojiSize));
    url.searchParams.set("name", emoji.name);
    url.searchParams.set("lossless", "true");
    return url;
}

const plugin = definePlugin({
    name: "FakeNitro",
    description: "Lets you send fake emojis and stickers, use Nitro themes, and stream in Nitro quality",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["MessageEventsAPI"],
    translations: {
        fr: {
            description: "Permet d'envoyer de faux emojis et autocollants, d'utiliser les thèmes Nitro et de streamer en qualité Nitro",
            options: {
                enableEmojiBypass: "Permettre d'envoyer de faux emojis (contourne aussi l'absence de permission d'utiliser des emojis personnalisés)",
                emojiSize: "Taille des emojis à l'envoi",
                transformEmojis: "Transformer les faux emojis en vrais emojis",
                enableStickerBypass: "Permettre d'envoyer de faux autocollants (contourne aussi l'absence de permission d'utiliser des autocollants)",
                stickerSize: "Taille des autocollants à l'envoi",
                transformStickers: "Transformer les faux autocollants en vrais autocollants",
                transformCompoundSentence: "Transformer aussi les faux emojis et autocollants dans les phrases (messages qui contiennent plus que le lien)",
                enableStreamQualityBypass: "Permettre de streamer en qualité Nitro",
                useHyperLinks: "Utiliser des liens masqués pour les faux emojis et autocollants",
                hyperLinkText: "Texte du lien masqué. {{NAME}} est remplacé par le nom de l'emoji ou de l'autocollant.",
                disableEmbedPermissionCheck: "Ne pas vérifier la permission d'intégrer des liens avant d'envoyer de faux emojis et autocollants"
            }
        }
    },
    settings,

    patches: [
        {
            find: "canUseCustomStickersEverywhere:",
            replacement: [
                {
                    match: /canUseCustomStickersEverywhere:/,
                    replace: "$&()=>true,_$&",
                    predicate: () => settings.store.enableStickerBypass
                },
                {
                    match: /canUseHighVideoUploadQuality:/,
                    replace: "$&()=>true,_$&",
                    predicate: () => settings.store.enableStreamQualityBypass
                },
                {
                    match: /canStreamQuality:/,
                    replace: "$&()=>true,_$&",
                    predicate: () => settings.store.enableStreamQualityBypass
                },
                {
                    match: /canUseClientThemes:/,
                    replace: "$&()=>true,_$&"
                },
                {
                    match: /canUsePremiumAppIcons:/,
                    replace: "$&()=>true,_$&"
                }
            ]
        },
        {
            find: '.getByName("fork_and_knife")',
            predicate: () => settings.store.enableEmojiBypass,
            replacement: {
                match: ".CHAT",
                replace: ".STATUS"
            }
        },
        {
            find: ".GUILD_SUBSCRIPTION_UNAVAILABLE;",
            group: true,
            predicate: () => settings.store.enableEmojiBypass,
            replacement: [
                {
                    match: /(?<=\.USE_EXTERNAL_EMOJIS.+?;)(?<=intention:(\i).+?)/,
                    replace: (_: string, intention: string) => `const fakeNitroIntention=${intention};`
                },
                {
                    match: /&&!\i&&!\i(?=\)return \i\.\i\.DISALLOW_EXTERNAL;)/,
                    replace: (m: string) => `${m}&&!${IS_BYPASSEABLE_INTENTION}`
                },
                {
                    match: /!\i\.available(?=\)return \i\.\i\.GUILD_SUBSCRIPTION_UNAVAILABLE;)/,
                    replace: (m: string) => `${m}&&!${IS_BYPASSEABLE_INTENTION}`
                },
                {
                    match: /(?<=!\(\i\|\|)\i\.\i\.canUseEmojisEverywhere\(\i\)/,
                    replace: (check: string) => `(${check}||${IS_BYPASSEABLE_INTENTION})`
                },
                {
                    match: /(?<=\|\|)\i\.\i\.canUseAnimatedEmojis\(\i\)/,
                    replace: (m: string) => `(${m}||${IS_BYPASSEABLE_INTENTION})`
                }
            ]
        },
        {
            find: ".getUserIsAdmin(",
            replacement: {
                match: /(function(?: \i)?\(\i,\i)\){(.{0,250}.getUserIsAdmin\(.+?return!1})/,
                replace: (_: string, rest1: string, rest2: string) => `${rest1},fakeNitroOriginal){if(!fakeNitroOriginal)return false;${rest2}`
            }
        },
        {
            find: '"SENDABLE"',
            predicate: () => settings.store.enableStickerBypass,
            replacement: {
                match: /\i\.available\?/,
                replace: "true?"
            }
        },
        {
            find: "#{intl::STREAM_FPS_OPTION}",
            predicate: () => settings.store.enableStreamQualityBypass,
            replacement: {
                match: /guildPremiumTier:\i\.\i\.TIER_\d,?/g,
                replace: ""
            }
        },
        {
            find: '"UserSettingsProtoStore"',
            replacement: [
                {
                    match: /(?<=CONNECTION_OPEN:function\((\i)\){)/,
                    replace: (_: string, props: string) => `$self.handleProtoChange(${props}.userSettingsProto,${props}.user);`
                },
                {
                    match: /let{settings:/,
                    replace: "arguments[0].local||$self.handleProtoChange(arguments[0].settings.proto);$&"
                }
            ]
        },
        {
            find: ",updateTheme(",
            replacement: {
                match: /(function(?: \i)?\(\i\){let{backgroundGradientPresetId:(\i).+?)(\i\.\i\.updateAsync.+?theme=(.+?),.+?},\i\))/,
                replace: (_: string, rest: string, backgroundGradientPresetId: string, originalCall: string, theme: string) =>
                    `${rest}$self.handleGradientThemeSelect(${backgroundGradientPresetId},${theme},()=>${originalCall});`
            }
        },
        {
            find: ".CLIENT_THEMES_EDITOR?",
            replacement: {
                match: /(?<=\i=)\(0,\i\.\i\)\(\i\.\i\.TIER_2\)(?=,|;)/g,
                replace: "true"
            }
        },
        {
            find: '["strong","em","u","text","inlineCode","s","spoiler"]',
            predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
            replacement: {
                match: /\(\{ast:(\i)(?=,inline:\i)/,
                replace: "({ast:$self.transformAst($1)"
            }
        },
        {
            find: "}renderStickersAccessories(",
            replacement: [
                {
                    predicate: () => settings.store.transformEmojis || settings.store.transformStickers,
                    match: /(renderEmbeds\((\i)\){)(.+?embeds\.map\(\((\i),\i\)?=>{)/,
                    replace: (_: string, rest1: string, message: string, rest2: string, embed: string) =>
                        `${rest1}const fakeNitroMessage=${message};${rest2}if($self.shouldIgnoreEmbed(${embed},fakeNitroMessage))return null;`
                },
                {
                    predicate: () => settings.store.transformStickers,
                    match: /renderStickersAccessories\((\i)\){let (\i)=\(0,\i\.\i\)\(\i\).+?;/,
                    replace: (m: string, message: string, stickers: string) => `${m}${stickers}=$self.patchFakeNitroStickers(${stickers},${message});`
                },
                {
                    predicate: () => settings.store.transformStickers,
                    match: /renderAttachments\(\i\){.+?{attachments:(\i).+?;/,
                    replace: (m: string, attachments: string) => `${m}${attachments}=$self.filterAttachments(${attachments});`
                }
            ]
        },
        {
            find: "#{intl::STICKER_POPOUT_UNJOINED_PRIVATE_GUILD_DESCRIPTION}",
            predicate: () => settings.store.transformStickers,
            replacement: [
                {
                    match: /let{renderableSticker:(\i).{0,270}sticker:\i,channel:\i,/,
                    replace: (m: string, renderableSticker: string) => `${m}fakeNitroRenderableSticker:${renderableSticker},`
                },
                {
                    match: /(let \i,{sticker:\i,channel:\i,closePopout:\i.+?}=(\i).+?;)(.+?description:)(\i)(?=,sticker:\i)/,
                    replace: (_: string, rest: string, props: string, rest2: string, reactNode: string) =>
                        `${rest}let{fakeNitroRenderableSticker}=${props};${rest2}$self.addFakeNotice(${FakeNoticeType.Sticker},${reactNode},!!fakeNitroRenderableSticker?.fake)`
                }
            ]
        },
        {
            find: ".EMOJI_UPSELL_POPOUT_MORE_EMOJIS_OPENED,",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                match: /isDiscoverable:\i,shouldHideRoleSubscriptionCTA:\i,(?<={node:(\i),.+?)/,
                replace: (m: string, node: string) => `${m}fakeNitroNode:${node},`
            }
        },
        {
            find: "#{intl::EMOJI_POPOUT_UNJOINED_DISCOVERABLE_GUILD_DESCRIPTION}",
            predicate: () => settings.store.transformEmojis,
            replacement: {
                match: /(?<=emojiDescription:)(\i)(?<=\1=function\(\i\)\{let\{sourceType:.+?)/,
                replace: (_: string, reactNode: string) => `$self.addFakeNotice(${FakeNoticeType.Emoji},${reactNode},!!arguments[0]?.fakeNitroNode?.fake)`
            }
        },
        {
            find: "getCurrentDesktopIcon(),",
            replacement: {
                match: /\i\.\i\.isPremium\(\i\.\i\.getCurrentUser\(\)\)/,
                replace: "true"
            }
        },
        {
            find: 'type:"GUILD_SOUNDBOARD_SOUND_CREATE"',
            replacement: {
                match: /(?<=type:"(?:SOUNDBOARD_SOUNDS_RECEIVED|GUILD_SOUNDBOARD_SOUND_CREATE|GUILD_SOUNDBOARD_SOUND_UPDATE|GUILD_SOUNDBOARD_SOUNDS_UPDATE)".+?available:)\i\.available/g,
                replace: "true"
            }
        }
    ],

    get guildId() {
        return getCurrentGuild()?.id;
    },

    get canUseEmotes() {
        return (Stores.UserStore.getCurrentUser().premiumType ?? 0) > 0;
    },

    get canUseStickers() {
        return (Stores.UserStore.getCurrentUser().premiumType ?? 0) > 1;
    },

    handleProtoChange(proto: any, user: any) {
        try {
            if (proto == null || typeof proto === "string") return;

            const premiumType: number = user?.premium_type ?? Stores.UserStore?.getCurrentUser()?.premiumType ?? 0;
            if (premiumType === 2) return;

            proto.appearance ??= AppearanceSettingsActionCreators.create();

            const protoStoreAppearenceSettings = Stores.UserSettingsProtoStore.settings.appearance;

            proto.appearance = AppearanceSettingsActionCreators.create({
                ...proto.appearance,
                theme: protoStoreAppearenceSettings?.theme,
                clientThemeSettings: protoStoreAppearenceSettings?.clientThemeSettings
            });
        } catch (err) {
            logger.error(err);
        }
    },

    handleGradientThemeSelect(backgroundGradientPresetId: number | undefined, theme: number, original: () => void) {
        const premiumType = Stores.UserStore?.getCurrentUser()?.premiumType ?? 0;
        if (premiumType === 2 || backgroundGradientPresetId == null) return original();

        if (!PreloadedUserSettingsActionCreators || !AppearanceSettingsActionCreators || !ClientThemeSettingsActionsCreators || !BINARY_READ_OPTIONS) return;

        const currentAppearanceSettings = PreloadedUserSettingsActionCreators.getCurrentValue().appearance;

        const newAppearanceProto = currentAppearanceSettings != null
            ? AppearanceSettingsActionCreators.fromBinary(AppearanceSettingsActionCreators.toBinary(currentAppearanceSettings), BINARY_READ_OPTIONS)
            : AppearanceSettingsActionCreators.create();

        newAppearanceProto.theme = theme;

        const clientThemeSettingsDummy = ClientThemeSettingsActionsCreators.create({
            backgroundGradientPresetId: { value: backgroundGradientPresetId }
        });

        newAppearanceProto.clientThemeSettings ??= clientThemeSettingsDummy;
        newAppearanceProto.clientThemeSettings.backgroundGradientPresetId = clientThemeSettingsDummy.backgroundGradientPresetId;

        const proto = PreloadedUserSettingsActionCreators.ProtoClass.create();
        proto.appearance = newAppearanceProto;

        FluxDispatcher.dispatch({
            type: "USER_SETTINGS_PROTO_UPDATE",
            local: true,
            partial: true,
            settings: { type: 1, proto }
        });
    },

    trimContent(content: any[]) {
        const firstContent = content[0];
        if (typeof firstContent === "string") {
            content[0] = firstContent.trimStart();
            content[0] || content.shift();
        } else if (typeof firstContent?.props?.children === "string") {
            firstContent.props.children = firstContent.props.children.trimStart();
            firstContent.props.children || content.shift();
        }

        const lastIndex = content.length - 1;
        const lastContent = content[lastIndex];
        if (typeof lastContent === "string") {
            content[lastIndex] = lastContent.trimEnd();
            content[lastIndex] || content.pop();
        } else if (typeof lastContent?.props?.children === "string") {
            lastContent.props.children = lastContent.props.children.trimEnd();
            lastContent.props.children || content.pop();
        }
    },

    clearEmptyArrayItems(array: any[]) {
        return array.filter(item => item != null);
    },

    ensureChildrenIsArray(child: ReactElement<any>) {
        if (!Array.isArray(child.props.children)) child.props.children = [child.props.children];
    },

    transformAst(ast: any[]) {
        try {
            if (!settings.store.transformCompoundSentence && ast.length > 1) return ast;

            if (settings.store.transformStickers) {
                ast = ast.filter(node => {
                    const { type, target } = node;
                    if (type !== "link") return true;
                    if (fakeNitroStickerRegex.test(target)) return false;

                    const gifStickerLinkMatch = target.match(fakeNitroGifStickerRegex);
                    return !(gifStickerLinkMatch && Stores.StickersStore.getStickerById(gifStickerLinkMatch[1]));
                });
            }

            if (settings.store.transformEmojis) {
                ast = ast.map(node => {
                    const { type, target } = node;
                    if (type !== "link") return node;

                    const fakeNitroMatch = target.match(fakeNitroEmojiRegex);
                    if (!fakeNitroMatch) return node;

                    let url: URL | null = null;
                    try {
                        url = new URL(target);
                    } catch { }

                    const emojiId = fakeNitroMatch[1];
                    const emojiName = Stores.EmojiStore.getCustomEmojiById(emojiId)?.name ?? url?.searchParams.get("name") ?? "FakeNitroEmoji";
                    const animated = fakeNitroMatch[2] === "gif" || url?.searchParams.get("animated") === "true";

                    return { animated, emojiId, name: `:${emojiName}:`, type: "customEmoji", fake: true };
                });
            }
        } catch (err) {
            logger.error("Error transforming AST:", err);
        }

        return ast;
    },

    patchFakeNitroStickers(stickers: any[], message: any) {
        const itemsToMaybePush: string[] = [];

        const contentItems: string[] = message.content.split(/\s/);
        if (settings.store.transformCompoundSentence) itemsToMaybePush.push(...contentItems);
        else if (contentItems.length === 1) itemsToMaybePush.push(contentItems[0]);
        else if (hyperLinkOnlyRegex.test(message.content)) itemsToMaybePush.push(message.content);

        itemsToMaybePush.push(...message.attachments.filter((a: any) => a.content_type === "image/gif").map((a: any) => a.url));

        for (const item of itemsToMaybePush) {
            if (!settings.store.transformCompoundSentence && !item.startsWith("http") && !hyperLinkRegex.test(item)) continue;

            const imgMatch = item.match(fakeNitroStickerRegex);
            if (imgMatch) {
                let url: URL | null = null;
                try {
                    url = new URL(item);
                } catch { }

                const stickerName = Stores.StickersStore.getStickerById(imgMatch[1])?.name ?? url?.searchParams.get("name") ?? "FakeNitroSticker";
                stickers.push({ format_type: 1, id: imgMatch[1], name: stickerName, fake: true });
                continue;
            }

            const gifMatch = item.match(fakeNitroGifStickerRegex);
            if (gifMatch) {
                const sticker = Stores.StickersStore.getStickerById(gifMatch[1]);
                if (!sticker) continue;

                stickers.push({ format_type: 2, id: gifMatch[1], name: sticker.name ?? "FakeNitroSticker", fake: true });
            }
        }

        return stickers;
    },

    shouldIgnoreEmbed(embed: any, message: any) {
        try {
            const contentItems: string[] = message.content.split(/\s/);
            if (contentItems.length > 1 && !settings.store.transformCompoundSentence && !hyperLinkOnlyRegex.test(message.content)) return false;

            if (embed.type === "image") {
                const url: string | undefined = embed.url ?? embed.image?.url;
                if (!url) return false;
                if (
                    !settings.store.transformCompoundSentence
                    && !contentItems.some(item => item === url || item.match(hyperLinkRegex)?.[1] === url)
                    && !hyperLinkOnlyRegex.test(message.content)
                ) return false;

                if (settings.store.transformEmojis && fakeNitroEmojiRegex.test(url)) return true;

                if (settings.store.transformStickers) {
                    if (fakeNitroStickerRegex.test(url)) return true;

                    const gifMatch = url.match(fakeNitroGifStickerRegex);
                    if (gifMatch && Stores.StickersStore.getStickerById(gifMatch[1])) return true;
                }
            }
        } catch (err) {
            logger.error("Error in shouldIgnoreEmbed:", err);
        }

        return false;
    },

    filterAttachments(attachments: any[]) {
        return attachments.filter(attachment => {
            if (attachment.content_type !== "image/gif") return true;

            const match = attachment.url.match(fakeNitroGifStickerRegex);
            return !(match && Stores.StickersStore.getStickerById(match[1]));
        });
    },

    addFakeNotice(type: number, node: ReactNode | ReactNode[], fake: boolean) {
        if (!fake) return node;

        const nodes = Array.isArray(node) ? node : [node];
        nodes.push(type === FakeNoticeType.Sticker ? s("stickerNotice") : s("emojiNotice"));
        return nodes;
    },

    getStickerLink({ format_type, id }: { format_type: number; id: string }) {
        const ext = format_type === StickerFormatType.GIF ? "gif" : "png";
        return `https://media.discordapp.net/stickers/${id}.${ext}?size=${settings.store.stickerSize}`;
    },

    canUseEmote(e: any, channelId: string) {
        if (e.type === 0) return true;
        if (e.available === false) return false;

        if (isUnusableRoleSubscriptionEmoji(e, this.guildId, true)) return false;

        let isUsableTwitchSubEmote = false;
        if (e.managed && e.guildId) {
            const myRoles: string[] = Stores.GuildMemberStore.getSelfMember(e.guildId)?.roles ?? [];
            isUsableTwitchSubEmote = e.roles.some((r: string) => myRoles.includes(r));
        }

        if (this.canUseEmotes || isUsableTwitchSubEmote) return e.guildId === this.guildId || hasExternalEmojiPerms(channelId);
        return !e.animated && e.guildId === this.guildId;
    },

    start() {
        const store = settings.store;
        if (!store.enableEmojiBypass && !store.enableStickerBypass) return;

        preSend = addMessagePreSendListener(async (channelId, messageObj: any, options) => {
            const { guildId } = plugin;
            let hasBypass = false;

            stickerBypass: {
                if (!store.enableStickerBypass) break stickerBypass;

                const sticker = Stores.StickersStore.getStickerById(options.stickerIds?.[0]);
                if (!sticker) break stickerBypass;
                if ("pack_id" in sticker) break stickerBypass;

                const canUseStickers = plugin.canUseStickers && hasExternalStickerPerms(channelId);
                if (sticker.available !== false && (canUseStickers || sticker.guild_id === guildId)) break stickerBypass;

                hasBypass = true;

                const url = new URL(plugin.getStickerLink(sticker));
                url.searchParams.set("name", sticker.name);
                url.searchParams.set("lossless", "true");

                messageObj.content += `${getWordBoundary(messageObj.content, messageObj.content.length - 1)}${makeLink(url, sticker.name)}`;
                options.stickerIds.length = 0;
            }

            if (store.enableEmojiBypass) {
                for (const emoji of messageObj.validNonShortcutEmojis) {
                    if (plugin.canUseEmote(emoji, channelId)) continue;

                    hasBypass = true;

                    const emojiString = `<${emoji.animated ? "a" : ""}:${emoji.originalName || emoji.name}:${emoji.id}>`;
                    const url = getEmojiURL(emoji);

                    messageObj.content = messageObj.content.replace(emojiString, (match: string, offset: number, origStr: string) =>
                        `${getWordBoundary(origStr, offset - 1)}${makeLink(url, emoji.name)}${getWordBoundary(origStr, offset + match.length)}`);
                }
            }

            if (hasBypass && !store.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
                if (!await showCannotEmbedNotice()) return { cancel: true };
            }

            return { cancel: false };
        });

        preEdit = addMessagePreEditListener(async (channelId, _messageId, messageObj) => {
            if (!store.enableEmojiBypass) return { cancel: false };

            let hasBypass = false;

            messageObj.content = messageObj.content.replace(/(?<!\\)<a?:(?:\w+):(\d+)>/ig, (emojiStr: string, emojiId: string, offset: number, origStr: string) => {
                const emoji = Stores.EmojiStore.getCustomEmojiById(emojiId);
                if (emoji == null) return emojiStr;
                if (plugin.canUseEmote(emoji, channelId)) return emojiStr;

                hasBypass = true;
                return `${getWordBoundary(origStr, offset - 1)}${makeLink(getEmojiURL(emoji), emoji.name)}${getWordBoundary(origStr, offset + emojiStr.length)}`;
            });

            if (hasBypass && !store.disableEmbedPermissionCheck && !hasEmbedPerms(channelId)) {
                if (!await showCannotEmbedNotice()) return { cancel: true };
            }

            return { cancel: false };
        });
    },

    stop() {
        if (preSend) removeMessagePreSendListener(preSend);
        if (preEdit) removeMessagePreEditListener(preEdit);
    }
});

export default plugin;
