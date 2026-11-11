/*
 * Majic — ExpressionManager stickers
 */

import { Menu } from "@api/contextMenu";
import { SubHeading, TextInput } from "@components/ui";
import { copyWithToast, getGuildAcronym } from "@utils/discord";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { Clickable, Endpoints, FluxDispatcher, IconUtils, Modal, openModalLazy, Permissions, React, RestAPI, showToast, Stores, Tooltip, useMemo, useState } from "@webpack/common";

import { buildCloneItem, ExternalIcon, LinkIcon, logger, s, settings } from "./shared";

const cl = (name: string) => `majic-expression-manager-${name}`;

const StickerFormatType = {
    PNG: 1,
    APNG: 2,
    LOTTIE: 3,
    GIF: 4
} as const;

export interface StickerItem {
    id: string;
    format_type: number;
    name: string;
    tags?: string;
    description?: string;
    [key: string]: unknown;
}

const loadCreateStickerModal = extractAndLoadChunksLazy(
    ["CREATE_STICKER_MODAL", "#{intl::STICKER_PICKER_CREATE_STICKER}"],
    /(?<=\.CREATE_STICKER_MODAL.{0,100}?)\.then\(\i\.bind\(\i,"?([\w$]+)"?/
);
const CreateStickerModal = findComponentByCodeLazy("#{intl::GUILD_STICKER_INVALID_STICKER}");

const StickerExtMap: Record<number, string> = {
    [StickerFormatType.PNG]: "png",
    [StickerFormatType.APNG]: "png",
    [StickerFormatType.LOTTIE]: "json",
    [StickerFormatType.GIF]: "gif"
};

const PremiumTierStickerLimitMap: Record<number, number> = {
    0: 5,
    1: 15,
    2: 30,
    3: 60
};

const MAX_STICKER_SIZE_BYTES = 512 * 1024;

export const formatStickerURL = (sticker: StickerItem, size: number) =>
    `${location.protocol}${(window as any).GLOBAL_ENV.MEDIA_PROXY_ENDPOINT}/stickers/${sticker.id}.${StickerExtMap[sticker.format_type]}?size=${size}&lossless=true&animated=true`;

function getGuildMaxStickerSlots(guild: any): number {
    if (guild.features.has("MORE_STICKERS") && guild.premiumTier === 3) return 120;
    return PremiumTierStickerLimitMap[guild.premiumTier] ?? PremiumTierStickerLimitMap[0];
}

async function fetchSticker(id: string) {
    const cached = Stores.StickersStore.getStickerById(id);
    if (cached) return cached;

    const { body } = await RestAPI.get(Endpoints.STICKER(id));
    FluxDispatcher.dispatch({ type: "STICKER_FETCH_SUCCESS", sticker: body });
    return body;
}

async function fetchBlob(sticker: StickerItem) {
    for (let size = 4096; size >= 16; size /= 2) {
        const url = formatStickerURL(sticker, size);
        const res = await fetch(url);

        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

        const contentLength = res.headers.get("Content-Length");
        if (Number(contentLength) > MAX_STICKER_SIZE_BYTES) {
            await res.body?.cancel();
            continue;
        }

        const blob = await res.blob();
        if (blob.size <= MAX_STICKER_SIZE_BYTES) return blob;
    }

    throw new Error(`Failed to fetch sticker within size limit of ${MAX_STICKER_SIZE_BYTES / 1024}KiB`);
}

async function doClone(guildId: string, sticker: StickerItem) {
    try {
        const data = new FormData();
        data.append("name", sticker.name);
        data.append("file", await fetchBlob(sticker));
        data.append("tags", sticker.tags ?? "👻");
        data.append("description", sticker.description ?? "");

        const { body } = await RestAPI.post({ url: Endpoints.GUILD_STICKER_PACKS(guildId), body: data });

        FluxDispatcher.dispatch({
            type: "GUILD_STICKERS_CREATE_SUCCESS",
            guildId,
            sticker: { ...body, user: Stores.UserStore.getCurrentUser() }
        });

        showToast({ text: s("cloneSuccess", { name: sticker.name, guild: Stores.GuildStore.getGuild(guildId)?.name ?? s("yourServer") }), variant: "success" });
    } catch (err: any) {
        let message = s("somethingWrong");
        try {
            message = JSON.parse(err.text).message;
        } catch { }

        logger.error(`Failed to clone ${sticker.name} to guild ${guildId}`, err);
        showToast({ text: s("cloneFailed", { message }), variant: "critical" });
    }
}

function getAcronymFontSize(text: string) {
    const sizes = [20, 20, 18, 18, 16, 14, 12];
    return sizes[text.length] ?? 4;
}

function getGuildCandidates() {
    const meId = Stores.AuthenticationStore.getId();

    return (Stores.GuildStore.getGuildsArray() as any[]).filter(g => {
        const canCreate = g.ownerId === meId
            || (Stores.PermissionStore.getGuildPermissions({ id: g.id }) & Permissions.CREATE_GUILD_EXPRESSIONS) === Permissions.CREATE_GUILD_EXPRESSIONS;
        if (!canCreate) return false;

        const stickers = Stores.StickersStore.getStickersByGuildId(g.id);
        return !stickers || stickers.length < getGuildMaxStickerSlots(g);
    }).sort((a, b) => a.name.localeCompare(b.name));
}

function CloneModal({ sticker }: { sticker: StickerItem }) {
    const [isCloning, setIsCloning] = useState(false);
    const [name, setName] = useState(sticker.name);
    const [guildCandidatesDep, setGuildCandidatesDep] = useState(0);

    const guilds = useMemo(() => getGuildCandidates(), [guildCandidatesDep]);
    const isValid = name.length >= 2 && name.length <= 30;

    return (
        <>
            <SubHeading>{s("customName")}</SubHeading>
            <TextInput
                value={name}
                onChange={value => {
                    sticker.name = value;
                    setName(value);
                }}
            />
            {!isValid && <span className={cl("error")}>{s("nameInvalid")}</span>}

            <div className={cl("guilds")}>
                {guilds.map(g => (
                    <Tooltip key={g.id} text={g.name}>
                        {(tooltipProps: Record<string, unknown>) => (
                            <Clickable
                                {...tooltipProps}
                                aria-disabled={isCloning}
                                className={cl("guild")}
                                data-is-cloning={isCloning}
                                onClick={() => {
                                    if (isCloning || !isValid) return;

                                    setIsCloning(true);
                                    void doClone(g.id, sticker).finally(() => {
                                        setGuildCandidatesDep(n => n + 1);
                                        setIsCloning(false);
                                    });
                                }}
                            >
                                {g.icon ? (
                                    <img
                                        aria-hidden
                                        className={cl("guild-icon")}
                                        src={IconUtils.getGuildIconURL({ id: g.id, icon: g.icon, canAnimate: true, size: 512 })}
                                        alt={g.name}
                                    />
                                ) : (
                                    <span className={cl("guild-acronym")} style={{ fontSize: getAcronymFontSize(getGuildAcronym(g)) }}>
                                        {getGuildAcronym(g)}
                                    </span>
                                )}
                            </Clickable>
                        )}
                    </Tooltip>
                ))}
            </div>
        </>
    );
}

function openCloneStickerModal(stickerData: StickerItem) {
    openModalLazy(async () => {
        const sticker: StickerItem = await fetchSticker(stickerData.id)
            .catch(() => stickerData)
            .then((result: StickerItem) => ({ ...result }));

        return (modalProps: any) => (
            <Modal
                {...modalProps}
                title={
                    <div style={{ display: "flex", gap: "0.5em", alignItems: "center" }}>
                        <img role="presentation" aria-hidden src={formatStickerURL(sticker, 128)} alt="" height={24} width={24} />
                        <span className={cl("title")}>{s("cloneTitle", { name: sticker.name })}</span>
                    </div>
                }
            >
                <CloneModal sticker={sticker} />
            </Modal>
        );
    });
}

export const buildCloneStickerItem = (sticker: StickerItem) =>
    buildCloneItem(s("cloneSticker"), () => openCloneStickerModal(sticker));

export const editSticker = (sticker: StickerItem, guildId: string) =>
    openModalLazy(async () => {
        await loadCreateStickerModal();
        return (modalProps: any) => <CreateStickerModal {...modalProps} sticker={sticker} guildId={guildId} />;
    });

export function buildStickerLinkItems(sticker: StickerItem, ParentComponent: React.ComponentType<any> = Menu.MenuGroup) {
    if (!settings.store.stickerCopyAndOpen) return null;

    return (
        <ParentComponent key="majic-em-sticker-links">
            <Menu.MenuItem
                id="majic-copy-sticker-link"
                key="majic-copy-sticker-link"
                label={s("copyStickerLink")}
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
                action={() => copyWithToast(formatStickerURL(sticker, 512), s("linkCopied"))}
            />
            <Menu.MenuItem
                id="majic-open-sticker-link"
                key="majic-open-sticker-link"
                label={s("openStickerLink")}
                leadingAccessory={{ type: "icon", icon: LinkIcon }}
                trailingIndicator={{ type: "icon", icon: ExternalIcon }}
                action={() => MajicNative.openExternal(formatStickerURL(sticker, 512))}
            />
        </ParentComponent>
    );
}
