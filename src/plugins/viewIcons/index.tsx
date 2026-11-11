/*
 * Majic — ViewIcons plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { openImageModal } from "@utils/discord";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, IconUtils, React, Stores } from "@webpack/common";

const s = createStrings({
    en: {
        viewAvatar: "View Avatar",
        viewServerAvatar: "View Server Avatar",
        viewDecoration: "View Avatar Decoration",
        viewIcon: "View Icon",
        viewBanner: "View Banner"
    },
    fr: {
        viewAvatar: "Voir l'avatar",
        viewServerAvatar: "Voir l'avatar de serveur",
        viewDecoration: "Voir la décoration d'avatar",
        viewIcon: "Voir l'icône",
        viewBanner: "Voir la bannière"
    }
});

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Image format for non-animated images (animated ones always use webp)",
        options: [
            { label: "webp", value: "webp", default: true },
            { label: "png", value: "png" },
            { label: "jpg", value: "jpg" }
        ]
    },
    imgSize: {
        type: OptionType.SELECT,
        description: "Image size to use",
        options: ["128", "256", "512", "1024", "2048", "4096"].map(n => ({ label: n, value: n, default: n === "1024" }))
    }
});

const ImageIcon = (props: { width?: number; height?: number }) => <DiscordIcon name="ImageIcon" size={props.width ?? 18} />;

function openImage({ url, width, height, event }: { url: string; width: number; height?: number; event?: React.MouseEvent }) {
    event?.stopPropagation();
    const u = new URL(url, window.location.href);

    const format = url.startsWith("/")
        ? "png"
        : u.searchParams.get("animated") === "true"
            ? "webp"
            : settings.store.format;

    u.searchParams.set("size", String(settings.store.imgSize));
    u.pathname = u.pathname.replace(/\.(png|jpe?g|webp)$/, `.${format}`);
    const sized = u.toString();

    u.searchParams.set("size", "4096");
    openImageModal({ url: sized, original: u.toString(), width, height });
}

const openAvatar = (url: string, event?: React.MouseEvent) => openImage({ url, width: 512, height: 512, event });
const openBanner = (url: string, event?: React.MouseEvent) => openImage({ url, width: 1024, event });

function imageItem(id: string, label: string, action: () => void) {
    return (
        <Menu.MenuItem
            id={id}
            key={id}
            label={label}
            action={action}
            icon={ImageIcon}
            leadingAccessory={{ type: "icon", icon: ImageIcon }}
        />
    );
}

export default definePlugin({
    name: "ViewIcons",
    description: "Makes avatars and banners clickable, and adds view avatar, icon and banner items to user, server and group context menus",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["DynamicImageModalAPI"],
    translations: {
        fr: {
            description: "Rend les avatars et bannières cliquables, et ajoute « Voir l'avatar / l'icône / la bannière » aux menus clic droit des utilisateurs, serveurs et groupes",
            options: {
                format: "Format des images non animées (les images animées utilisent toujours webp)",
                imgSize: "Taille d'image à utiliser"
            }
        }
    },
    settings,

    openAvatar,
    openBanner,

    contextMenus: {
        "user-context"(children, { user, guildId }: { user?: any; guildId?: string } = {}) {
            if (!user) return;
            const memberAvatar = Stores.GuildMemberStore.getMember(guildId, user.id)?.avatar || null;
            const avatarDecoration = user.avatarDecorationData ?? user.avatarDecoration;

            children.splice(-1, 0, (
                <Menu.MenuGroup>
                    {imageItem("view-avatar", s("viewAvatar"), () => openAvatar(IconUtils.getUserAvatarURL(user, true)))}
                    {memberAvatar && imageItem("view-server-avatar", s("viewServerAvatar"), () => openAvatar(IconUtils.getGuildMemberAvatarURLSimple({
                        userId: user.id,
                        avatar: memberAvatar,
                        guildId,
                        canAnimate: true
                    })))}
                    {avatarDecoration && imageItem("view-avatar-decoration", s("viewDecoration"), () => openAvatar(IconUtils.getAvatarDecorationURL({
                        avatarDecoration,
                        size: 1024,
                        canAnimate: true
                    })))}
                </Menu.MenuGroup>
            ));
        },

        "guild-context"(children, { guild }: { guild?: any } = {}) {
            if (!guild) return;
            const { id, icon, banner } = guild;
            if (!banner && !icon) return;

            children.splice(-1, 0, (
                <Menu.MenuGroup>
                    {icon ? imageItem("view-icon", s("viewIcon"), () => openAvatar(IconUtils.getGuildIconURL({ id, icon, canAnimate: true }))) : null}
                    {banner ? imageItem("view-banner", s("viewBanner"), () => openBanner(IconUtils.getGuildBannerURL(guild, true))) : null}
                </Menu.MenuGroup>
            ));
        },

        "gdm-context"(children, { channel }: { channel?: any } = {}) {
            if (!channel) return;
            children.splice(-1, 0, (
                <Menu.MenuGroup>
                    {imageItem("view-group-channel-icon", s("viewIcon"), () => openAvatar(IconUtils.getChannelIconURL(channel)))}
                </Menu.MenuGroup>
            ));
        }
    },

    patches: [
        {
            find: "return{avatarProps:{",
            replacement: {
                match: /(?<=onClick:.{0,30}?)null!=(\i)(?=.{0,200}children:.{0,50}...(\i),imageClassName:)/,
                replace: "null!=($1&&=$self.openAvatar.bind(undefined,$2.src))"
            }
        },
        {
            find: '"--custom-cutout-radius":',
            replacement: {
                match: /style:{(?=\.\.\.\i,backgroundImage:null!=(\i).{0,20}?\?`url\(\$\{\1\}\)`)/,
                replace: (_: string, bannerSrc: string) => `onClick:majicEvent=>${bannerSrc}!=null&&$self.openBanner(${bannerSrc},majicEvent),style:{cursor:${bannerSrc}!=null?"pointer":void 0,`
            }
        },
        {
            find: '["aria-hidden"],"aria-label":',
            replacement: {
                match: /null==\i\.icon\?.+?src:(\(0,\i\.\i\).+?\))(?=[,}])/,
                replace: (m: string, iconUrl: string) => `${m},onClick:majicEvent=>arguments[0]?.size!=="SIZE_40"&&$self.openAvatar(${iconUrl},majicEvent)`
            }
        },
        {
            find: ".channel.getRecipientId(),",
            replacement: {
                match: /(?=,src:(\i.getAvatarURL\(.+?[)]))/,
                replace: (_: string, avatarUrl: string) => `,onClick:majicEvent=>$self.openAvatar(${avatarUrl},majicEvent)`
            }
        },
        {
            find: ".EMPTY_GROUP_DM)",
            replacement: {
                match: /(?<=SIZE_80,)(?=src:(.+?\))[,}])/,
                replace: (_: string, avatarUrl: string) => `onClick:majicEvent=>$self.openAvatar(${avatarUrl},majicEvent),`
            }
        }
    ]
});
