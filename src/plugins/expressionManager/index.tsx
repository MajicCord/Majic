/*
 * Majic — ExpressionManager plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { Endpoints, Permissions, React, RestAPI, showToast, Stores, UserSettingsActionCreators } from "@webpack/common";
import type { ReactElement } from "react";

import { buildCloneEmojiItem, editEmoji, EmojiURLRegex, openEmojiUploadModal, resolveEmojiName } from "./emojis";
import { confirmAction, CopyIcon, DeleteIcon, HistoryIcon, PencilIcon, PlusIcon, s, settings } from "./shared";
import { buildCloneStickerItem, buildStickerLinkItems, editSticker, type StickerItem } from "./stickers";

const StickersPersistedStore = findStoreLazy("StickersPersistedStore");

const EMOJI_INTENTION_REACTION = 0;
const STICKER_TYPE_GUILD = 2;
const STICKER_FORMAT_LOTTIE = 3;

let emojiIntention: number | undefined;

function buildManageExpressionItems(id: string, type: string) {
    if (!settings.store.editAndDelete) return null;

    let guild: any;
    let expression: any;

    if (type === "emoji") {
        expression = Stores.EmojiStore.getCustomEmojiById(id);
        if (!expression) return null;
        guild = Stores.GuildStore.getGuild(expression.guildId);
    } else {
        const sticker = Stores.StickersStore.getStickerById(id);
        if (sticker?.type !== STICKER_TYPE_GUILD) return null;
        expression = sticker;
        guild = Stores.GuildStore.getGuild(sticker.guild_id);
    }

    if (!guild || !Stores.PermissionStore.can(Permissions.MANAGE_GUILD_EXPRESSIONS, guild)) return null;

    const isEmoji = type === "emoji";

    return (
        <>
            <Menu.MenuItem
                key="majic-em-edit"
                id="majic-em-edit"
                label={isEmoji ? s("editEmoji") : s("editSticker")}
                leadingAccessory={{ type: "icon", icon: PencilIcon }}
                action={() => {
                    if (isEmoji) editEmoji(expression, guild.id);
                    else editSticker(expression, guild.id);
                }}
            />
            <Menu.MenuItem
                key="majic-em-delete"
                id="majic-em-delete"
                label={isEmoji ? s("deleteEmoji") : s("deleteSticker")}
                leadingAccessory={{ type: "icon", icon: DeleteIcon }}
                color="danger"
                action={() => {
                    void confirmAction({
                        title: s("deleteTitle", { name: expression.name }),
                        subtitle: s("deleteSubtitle", { type: isEmoji ? s("emojiType") : s("stickerType") }),
                        confirmText: s("delete"),
                        async onConfirm() {
                            const url = isEmoji ? Endpoints.GUILD_EMOJI(guild.id, id) : Endpoints.GUILD_STICKER(guild.id, id);

                            await RestAPI.del(url).then(
                                () => showToast({ text: isEmoji ? s("emojiDeleted") : s("stickerDeleted"), variant: "success" }),
                                () => showToast({ text: isEmoji ? s("emojiDeleteFailed") : s("stickerDeleteFailed"), variant: "critical" })
                            );
                        }
                    });
                }}
            />
        </>
    );
}

function buildRemoveFrecentItem({ type, id, name }: Record<"type" | "id" | "name", string | undefined>) {
    if (!settings.store.recents) return;

    const isReaction = emojiIntention === EMOJI_INTENTION_REACTION;
    let expressionKey: string | undefined;

    switch (type) {
        case "emoji": {
            if (emojiIntention == null) return;

            const ctx = Stores.EmojiStore.getDisambiguatedEmojiContext(Stores.SelectedGuildStore.getGuildId());
            const frecents: any[] = isReaction
                ? ctx.getFrequentlyUsedReactionEmojisWithoutFetchingLatest()
                : ctx.getFrequentlyUsedEmojisWithoutFetchingLatest();

            if (frecents.some(e => id ? e.id === id : e.name === name)) expressionKey = id ?? name!;
            break;
        }
        case "sticker": {
            const frecents: any[] = StickersPersistedStore.stickerFrecencyWithoutFetchingLatest.frequently;
            if (id && frecents.some(e => e.id === id)) expressionKey = id;
            break;
        }
    }

    if (!expressionKey) return;

    const collectionKey = type === "emoji"
        ? isReaction ? "emojiReactionFrecency" : "emojiFrecency"
        : "stickerFrecency";
    const itemsKey = `${type}s`;
    const typeLabel = type === "emoji" ? s("emojiType") : s("stickerType");

    return (
        <Menu.MenuItem
            id="majic-em-remove-frecent"
            key="majic-em-remove-frecent"
            label={s("removeFromRecents")}
            leadingAccessory={{ type: "icon", icon: HistoryIcon }}
            action={async (e: MouseEvent) => {
                const onConfirm = () => {
                    UserSettingsActionCreators.FrecencyUserSettingsActionCreators.updateAsync(
                        collectionKey,
                        (settingsProto: any) => delete settingsProto[itemsKey][expressionKey!],
                        0
                    );
                };

                const confirmed = e.shiftKey || isReaction
                    || await confirmAction({
                        title: s("removeFromRecents"),
                        subtitle: s("removeSubtitle", { type: typeLabel }),
                        confirmText: s("doIt")
                    });

                if (confirmed) onConfirm();
            }}
        />
    );
}

const findFavoriteGroup = (children: Array<ReactElement | null>) =>
    findGroupChildrenByChildId("favorite", children) ?? findGroupChildrenByChildId("unfavorite", children);

function patchExpressionPickerMenu(children: any[], props: { target?: HTMLElement } = {}) {
    const { id, name, type, formatType } = props?.target?.dataset ?? {};

    const removeFrecentItem = buildRemoveFrecentItem({ type, id, name });
    if (removeFrecentItem) findFavoriteGroup(children)?.splice(1, 0, removeFrecentItem);

    if (!id) {
        const group = findGroupChildrenByChildId("copy", children);
        if (!group) return;

        const index = group.findIndex((item: any) => item?.props?.id === "copy");
        if (index !== -1) group[index] = React.cloneElement(group[index], { leadingAccessory: { type: "icon", icon: CopyIcon } });
        return;
    }

    if (type === "emoji" && name) {
        children.push(
            <Menu.MenuGroup key="majic-em-group">
                {buildCloneEmojiItem({ id, name })}
                {buildManageExpressionItems(id, type)}
            </Menu.MenuGroup>
        );
        return;
    }

    if (type === "sticker" && !props.target!.className?.includes("lottieCanvas")) {
        const sticker: StickerItem = { id, format_type: Number(formatType), name: name! };

        if (settings.store.stickerCopyAndOpen) {
            const oldCopyLinkParent = findGroupChildrenByChildId("copy-image-link", children);
            if (oldCopyLinkParent) {
                const index = oldCopyLinkParent.findIndex((c: any) => c?.props?.id === "copy-image-link");
                if (index !== -1) oldCopyLinkParent.splice(index, 1);
            }

            children.push(buildStickerLinkItems(sticker));
        }

        children.push(
            <Menu.MenuGroup key="majic-em-manage">
                {buildCloneStickerItem(sticker)}
                {buildManageExpressionItems(id, type)}
            </Menu.MenuGroup>
        );
    }
}

function patchMessageContextMenu(children: any[], props: any) {
    const { favoriteableId, mediaItem, favoriteableType } = props ?? {};
    const { message } = props.message?.messageSnapshots?.[0] ?? props;

    switch (favoriteableType) {
        case "emoji": {
            const name = resolveEmojiName(favoriteableId, message);
            if (!name) return;

            const favContainer = findFavoriteGroup(children);
            const container = favContainer ?? findGroupChildrenByChildId("copy-native-link", children);

            if (container) {
                container.unshift(
                    buildCloneEmojiItem({ id: favoriteableId, name }),
                    !favContainer ? <Menu.MenuSeparator key="majic-em-emoji-separator" /> : null
                );
            } else {
                children.push(buildCloneEmojiItem({ id: favoriteableId, name }));
            }
            break;
        }
        case "sticker": {
            const sticker = message.stickerItems.find((item: StickerItem) => item.id === favoriteableId);
            if (!sticker || sticker.format_type === STICKER_FORMAT_LOTTIE) return;

            const favoriteContainer = findFavoriteGroup(children);
            const cloneItem = buildCloneStickerItem(sticker);

            if (favoriteContainer) {
                favoriteContainer.unshift(cloneItem);

                if (settings.store.stickerCopyAndOpen) {
                    favoriteContainer.push(
                        <Menu.MenuSeparator key="majic-em-sticker-links-separator" />,
                        buildStickerLinkItems(sticker, React.Fragment)
                    );
                }
            } else {
                children.splice(-1, 0,
                    <Menu.MenuGroup key="majic-em-clone-sticker-group">{cloneItem}</Menu.MenuGroup>,
                    buildStickerLinkItems(sticker)
                );
            }
            break;
        }
    }

    if (mediaItem?.contentType?.startsWith("image/")) {
        findGroupChildrenByChildId("save-image", children)?.push(
            <Menu.MenuItem
                key="majic-em-upload-as-emoji"
                id="majic-em-upload-as-emoji"
                label={s("uploadAsEmoji")}
                leadingAccessory={{ type: "icon", icon: PlusIcon }}
                action={() => openEmojiUploadModal(mediaItem.url)}
            />
        );
    }
}

function patchImageContextMenu(children: any[], { target, src }: { target?: HTMLImageElement; src?: string } = {}) {
    const id = src?.match(EmojiURLRegex)?.[1];
    if (!id) return;

    const name = target?.alt || Stores.EmojiStore.getCustomEmojiById(id)?.name || "Emoji";
    children.push(buildCloneEmojiItem({ id, name }));
}

function patchForumTagContextMenu(children: any[], { tag }: { tag?: Record<"emojiId" | "emojiName", string> } = {}) {
    if (!tag?.emojiId) return;

    const name = Stores.EmojiStore.getCustomEmojiById(tag.emojiId)?.name || tag.emojiName || "emoji";
    children.push(buildCloneEmojiItem({ id: tag.emojiId, name }));
}

export default definePlugin({
    name: "ExpressionManager",
    description: "Clone emojis and stickers, with context menu options to quickly clone, edit or delete them, plus copy and open options for stickers",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Clone les emojis et autocollants, avec des options dans le menu clic droit pour les cloner, modifier ou supprimer, et copier ou ouvrir les autocollants",
            options: {
                editAndDelete: "Ajouter « Modifier » et « Supprimer » au menu clic droit du sélecteur d'expressions",
                stickerCopyAndOpen: "Ajouter « Copier le lien » et « Ouvrir le lien » au menu clic droit des autocollants",
                recents: "Ajouter « Retirer des récents » au menu clic droit des expressions fréquemment utilisées"
            }
        }
    },
    settings,

    css: [
        ".majic-expression-manager-guilds { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; margin-top: 16px; gap: 4px; }",
        ".majic-expression-manager-guild { border-radius: 50%; background-color: var(--background-base-lower); display: inline-flex; justify-content: center; align-items: center; width: 4em; height: 4em; cursor: pointer; color: var(--text-default); }",
        ".majic-expression-manager-guild[data-is-cloning=\"true\"] { cursor: not-allowed; filter: brightness(50%); }",
        ".majic-expression-manager-guild-icon { border-radius: 50%; width: 100%; height: 100%; }",
        ".majic-expression-manager-guild-acronym { width: 100%; text-align: center; overflow: hidden; white-space: nowrap; user-select: none; }",
        ".majic-expression-manager-title { color: var(--text-strong); font-size: 20px; font-weight: 600; }",
        ".majic-expression-manager-error { display: block; margin-top: 4px; color: var(--text-feedback-critical, var(--status-danger)); font-size: 12px; }"
    ].join(" "),

    patches: [
        {
            find: '"emoji-picker-categories"',
            replacement: {
                match: /return.{0,30}?value:\i,children:\i(?<=intention:(\i),.{0,400}?)/,
                replace: "$self.intention=$1;$&"
            }
        }
    ],

    set intention(value: number) {
        emojiIntention = value;
    },

    contextMenus: {
        "message": patchMessageContextMenu,
        "expression-picker": patchExpressionPickerMenu,
        "forum-tag": patchForumTagContextMenu,
        "image-context": patchImageContextMenu
    }
});
