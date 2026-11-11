/*
 * Majic — BetterRoleContext plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { getUserSettingLazy } from "@api/userSettings";
import { createStrings } from "@i18n";
import { copyToClipboard, getIntlMessage, openImageModal } from "@utils/discord";
import { makeLazy } from "@utils/lazy";
import { classes } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { filters, findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findCssClassesLazy, mapMangledModuleLazy } from "@webpack";
import { DiscordIcon, React, RoleMemberPopout, Stores, useRef, useState } from "@webpack/common";

const s = createStrings({
    en: {
        editRole: "Edit Role",
        copyRoleColor: "Copy Role Color",
        viewRoleIcon: "View Role Icon",
        viewRoleMembers: "View Role Members",
        roleActions: "Role Actions"
    },
    fr: {
        editRole: "Modifier le rôle",
        copyRoleColor: "Copier la couleur du rôle",
        viewRoleIcon: "Voir l'icône du rôle",
        viewRoleMembers: "Voir les membres du rôle",
        roleActions: "Actions du rôle"
    }
});

const ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: filters.byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: filters.byCode("renderLazy:"),
    openContextMenuLazy: (e: any) => typeof e === "function" && e.toString().length < 100
});

const MenuRoot = findComponentByCodeLazy('path:["empty"]');
const Popout = findComponentByCodeLazy("ref:this.ref,", "renderPopout:this.renderPopout,");
const GuildSettingsActions = findByPropsLazy("open", "selectRole", "updateGuild");
const MenuItemClasses = findCssClassesLazy("item", "labelContainer", "colorDefault", "label", "iconContainer");
const loadRoleMembers = findByCodeLazy(".GUILD_ROLE_MEMBER_IDS(", "requestMembersById");
const DeveloperMode = getUserSettingLazy<boolean>("appearance", "developerMode");

const getOpenProfileContext = makeLazy(() => React.createContext<[string | null, (userId: string | null) => void] | null>(null));

const PencilIcon = () => <DiscordIcon name="PencilIcon" size={18} />;
const AppearanceIcon = () => <DiscordIcon name="PaintPaletteIcon" size={18} />;
const ImageIcon = () => <DiscordIcon name="ImageIcon" size={18} />;
const CopyIdIcon = () => <DiscordIcon name="IdIcon" size={18} />;

const getCurrentChannel = () => Stores.ChannelStore.getChannel(Stores.SelectedChannelStore.getChannelId());
const getCurrentGuild = () => Stores.GuildStore.getGuild(getCurrentChannel()?.guild_id);

const settings = definePluginSettings({
    roleIconFileFormat: {
        type: OptionType.SELECT,
        description: "File format to use when viewing role icons",
        options: [
            { label: "png", value: "png", default: true },
            { label: "webp", value: "webp" },
            { label: "jpg", value: "jpg" }
        ]
    }
});

function RoleMembers({ popoutProps, guildId, roleId }: { popoutProps: any; guildId: string; roleId: string }) {
    const OpenProfileContext = getOpenProfileContext();
    const openProfile = useState<string | null>(null);

    return (
        <OpenProfileContext.Provider value={openProfile}>
            <RoleMemberPopout popoutProps={popoutProps} guildId={guildId} channelId={getCurrentChannel()!.id} roleId={roleId} />
        </OpenProfileContext.Provider>
    );
}

export function buildExtraRoleContextMenuItems(role: any, guild: any, popoutRef?: React.RefObject<any>) {
    if (!role) return { before: [], after: [] };

    const before = [
        Stores.PermissionStore.getGuildPermissionProps(guild).canManageRoles && (
            <Menu.MenuItem
                key="majic-edit-role"
                id="majic-edit-role"
                label={s("editRole")}
                action={async () => {
                    await GuildSettingsActions.open(guild.id, "ROLES");
                    GuildSettingsActions.selectRole(role.id);
                }}
                icon={PencilIcon}
                leadingAccessory={{ type: "icon", icon: PencilIcon }}
            />
        ),
        role.colorString && (
            <Menu.MenuItem
                key="majic-copy-role-color"
                id="majic-copy-role-color"
                label={s("copyRoleColor")}
                action={() => copyToClipboard(role.colorString)}
                icon={AppearanceIcon}
                leadingAccessory={{ type: "icon", icon: AppearanceIcon }}
            />
        )
    ].filter(Boolean);

    const after = [
        role.icon && (
            <Menu.MenuItem
                key="majic-view-role-icon"
                id="majic-view-role-icon"
                label={s("viewRoleIcon")}
                action={() => {
                    openImageModal({
                        url: `${location.protocol}//${(window as any).GLOBAL_ENV.CDN_HOST}/role-icons/${role.id}/${role.icon}.${settings.store.roleIconFileFormat}`,
                        height: 128,
                        width: 128
                    });
                }}
                icon={ImageIcon}
                leadingAccessory={{ type: "icon", icon: ImageIcon }}
            />
        ),
        popoutRef && (
            <Menu.MenuItem
                key="majic-view-role-members"
                id="majic-view-role-members"
                label={s("viewRoleMembers")}
                render={() => (
                    <Popout
                        position="right"
                        align="center"
                        targetElementRef={popoutRef}
                        preload={() => loadRoleMembers(guild.id, role.id)}
                        renderPopout={(popoutProps: any) => <RoleMembers popoutProps={popoutProps} guildId={guild.id} roleId={role.id} />}
                    >
                        {(popoutProps: Record<string, unknown>) => (
                            <div
                                className={classes(MenuItemClasses.item, MenuItemClasses.labelContainer, MenuItemClasses.colorDefault)}
                                ref={popoutRef}
                                role="menuitem"
                                {...popoutProps}
                            >
                                <div className={MenuItemClasses.label}>{s("viewRoleMembers")}</div>
                                <div className={MenuItemClasses.iconContainer}>
                                    <DiscordIcon name="GroupIcon" size={18} />
                                </div>
                            </div>
                        )}
                    </Popout>
                )}
            />
        )
    ].filter(Boolean);

    return { before, after };
}

function RoleContextMenu({ role, guild }: { role: any; guild: any }) {
    const popoutRef = useRef(null);
    const { before, after } = buildExtraRoleContextMenuItems(role, guild, popoutRef);

    return (
        <MenuRoot navId="majic-better-role-context-member-list" onClose={ContextMenuApi.closeContextMenu} aria-label={s("roleActions")}>
            {before}
            {after}
            <Menu.MenuItem
                key="majic-better-role-context-copy-role-id"
                id="majic-better-role-context-copy-role-id"
                label={getIntlMessage("COPY_ID_ROLE")}
                icon={CopyIdIcon}
                leadingAccessory={{ type: "icon", icon: CopyIdIcon }}
                action={() => copyToClipboard(role.id)}
            />
        </MenuRoot>
    );
}

export function openRoleContextMenu(event: React.MouseEvent<HTMLElement>, { guildId, id: roleId }: { guildId: string; id: string }) {
    const guild = getCurrentGuild();
    if (!guild || guild.id !== guildId) return;

    const role = Stores.GuildRoleStore.getRole(guildId, roleId);
    if (!role) return;

    ContextMenuApi.openContextMenu(event, () => <RoleContextMenu role={role} guild={guild} />);
}

export default definePlugin({
    name: "BetterRoleContext",
    description: "Adds options to copy role color, edit the role, view the role icon and its members when right clicking roles in profiles or the member list",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["UserSettingsAPI"],
    translations: {
        fr: {
            description: "Ajoute des options pour copier la couleur, modifier le rôle, voir son icône et ses membres au clic droit sur un rôle dans les profils ou la liste des membres",
            options: {
                roleIconFileFormat: "Format de fichier pour voir les icônes de rôle"
            }
        }
    },
    settings,

    openRoleContextMenu,

    patches: [
        {
            find: 'tutorialId:"whos-online',
            replacement: {
                match: /(?<=#{intl::CHANNEL_MEMBERS_A11Y_LABEL}.{0,400}?)children:(?=.{0,20}?(?:—|\\u2014) ",\i\])/,
                replace: "onContextMenu:e=>$self.openRoleContextMenu(e,arguments[0]),$&"
            }
        },
        {
            find: "?null:new Intl.NumberFormat",
            replacement: {
                match: /(?<=#{intl::CHANNEL_MEMBERS_A11Y_LABEL},\{title:\i,count:\i\}\)\}\),\(0,\i\.jsxs\)\("div",\{)/,
                replace: "onContextMenu:e=>$self.openRoleContextMenu(e,arguments[0]),"
            }
        },
        {
            find: ".id,spacing:14,",
            replacement: [
                {
                    match: /(?=let\{member:)/,
                    replace: "const majicProfileProps=$self.useMemberProfileProps(arguments[0].member.userId);"
                },
                {
                    match: /\.id,spacing:14,/,
                    replace: "$&...(typeof majicProfileProps!=='undefined'?majicProfileProps:undefined),"
                }
            ]
        }
    ],

    useMemberProfileProps(userId: string) {
        const openProfile = React.useContext(getOpenProfileContext());
        if (!openProfile) return {};

        const [openUserId, setOpenUserId] = openProfile;
        return {
            shouldShow: openUserId === userId,
            onRequestOpen: () => setOpenUserId(userId),
            onRequestClose: () => setOpenUserId(null)
        };
    },

    start() {
        void DeveloperMode?.updateSetting(true);
    },

    contextMenus: {
        "dev-context"(children, { id }: { id?: string } = {}) {
            const popoutRef = useRef(null);
            const guild = getCurrentGuild();
            if (!guild || !id) return;

            const role = Stores.GuildRoleStore.getRole(guild.id, id);
            if (!role) return;

            const { before, after } = buildExtraRoleContextMenuItems(role, guild, popoutRef);
            children.unshift(...before);
            children.push(...after);
        }
    }
});
