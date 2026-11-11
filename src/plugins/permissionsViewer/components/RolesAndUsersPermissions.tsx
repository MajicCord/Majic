/*
 * Majic — PermissionsViewer roles and users modal
 */

import { Menu } from "@api/contextMenu";
import { copyToClipboard, getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { findByCodeLazy } from "@webpack";
import { DiscordIcon, FluxDispatcher, i18n, Modal, openModalLazy, Permissions, React, ScrollerThin, Stores, Tooltip, useEffect, useMemo, useRef, useState, useStateFromStores } from "@webpack/common";

import { cl, ContextMenuApi, getGuildPermissionSpecMap, getUniqueUsername, loadGetGuildPermissionSpecMap, PermissionOverwriteType, type RoleOrUserPermission, s, settings } from "../utils";
import { PermissionAllowedIcon, PermissionDeniedIcon } from "./icons";

const getRoleIconData: (role: any, size: number) => { customIconSrc?: string; unicodeEmoji?: { url: string } } | undefined =
    findByCodeLazy("convertSurrogateToName", "customIconSrc", "unicodeEmoji");

const CopyIdIcon = () => <DiscordIcon name="IdIcon" size={18} />;
const ViewAsRoleIcon = () => <DiscordIcon name="ArrowLargeRightIcon" size={18} />;

function getRoleIconSrc(role: any) {
    const icon = getRoleIconData(role, 20);
    if (!icon) return;
    return icon.customIconSrc ?? icon.unicodeEmoji?.url;
}

function buildExtraRoleContextMenuItems(role: any, guild: any, popoutRef: unknown): { before?: React.ReactNode; after?: React.ReactNode } {
    const betterRoleContext = (window as any).Majic?.Plugins?.plugins?.BetterRoleContext;
    if (!betterRoleContext?.started || typeof betterRoleContext.buildExtraRoleContextMenuItems !== "function") return {};
    return betterRoleContext.buildExtraRoleContextMenuItems(role, guild, popoutRef);
}

function RolesAndUsersPermissionsComponent({ permissions, guild, modalProps, header }: { permissions: RoleOrUserPermission[]; guild: any; modalProps: any; header: string }) {
    const guildPermissionSpecMap = useMemo(() => getGuildPermissionSpecMap(guild), [guild.id]);

    useStateFromStores(
        [Stores.GuildMemberStore],
        () => Stores.GuildMemberStore.getMemberIds(guild.id),
        undefined,
        (old, current) => old.length === current.length
    );

    useEffect(() => {
        permissions.sort((a, b) => a.type - b.type);
    }, [permissions]);

    useEffect(() => {
        const usersToRequest = permissions
            .filter(p => p.type === PermissionOverwriteType.MEMBER && !Stores.GuildMemberStore.isMember(guild.id, p.id))
            .map(({ id }) => id);

        FluxDispatcher.dispatch({ type: "GUILD_MEMBERS_REQUEST", guildIds: [guild.id], userIds: usersToRequest });
    }, []);

    const [selectedItemIndex, selectItem] = useState(0);
    const selectedItem = permissions[selectedItemIndex];

    const roles = Stores.GuildRoleStore.getRolesSnapshot(guild.id);

    return (
        <Modal {...modalProps} size="xl" title={s("permissionsTitle", { name: header })}>
            {!selectedItem && (
                <div className={cl("modal-no-perms")}>
                    <p className="majic-permviewer-text-lg">{s("noPermissions")}</p>
                </div>
            )}

            {selectedItem && (
                <div className={cl("modal-container")}>
                    <ScrollerThin className={cl("modal-list")} orientation="auto">
                        {permissions.map((permission, index) => {
                            const user = Stores.UserStore.getUser(permission.id ?? "");
                            const role = roles[permission.id ?? ""];
                            const roleIconSrc = role != null ? getRoleIconSrc(role) : undefined;

                            return (
                                <div key={index} className={cl("modal-list-item-btn")} onClick={() => selectItem(index)} role="button" tabIndex={0}>
                                    <div
                                        className={cl("modal-list-item", { "modal-list-item-active": selectedItemIndex === index })}
                                        onContextMenu={e => {
                                            if (permission.type === PermissionOverwriteType.ROLE)
                                                ContextMenuApi.openContextMenu(e, () => <RoleContextMenu guild={guild} roleId={permission.id!} onClose={modalProps.onClose} />);
                                            else if (permission.type === PermissionOverwriteType.MEMBER)
                                                ContextMenuApi.openContextMenu(e, () => <UserContextMenu userId={permission.id!} />);
                                        }}
                                    >
                                        {(permission.type === PermissionOverwriteType.ROLE || permission.type === PermissionOverwriteType.OWNER) && (
                                            <span className={cl("modal-role-circle")} style={{ backgroundColor: role?.colorString ?? "var(--primary-300)" }} />
                                        )}
                                        {permission.type === PermissionOverwriteType.ROLE && roleIconSrc != null && (
                                            <img className={cl("modal-role-image")} src={roleIconSrc} />
                                        )}
                                        {permission.type === PermissionOverwriteType.MEMBER && user != null && (
                                            <img className={cl("modal-user-img")} src={user.getAvatarURL(void 0, void 0, false)} />
                                        )}
                                        <p className={cl("modal-list-item-text")}>
                                            {permission.type === PermissionOverwriteType.ROLE
                                                ? role?.name ?? s("unknownRole")
                                                : permission.type === PermissionOverwriteType.MEMBER
                                                    ? (user != null && getUniqueUsername(user)) || s("unknownUser")
                                                    : (
                                                        <span style={{ display: "flex", gap: "0.2em", alignItems: "center" }}>
                                                            {s("owner")}
                                                            <DiscordIcon name="CrownIcon" size={18} />
                                                        </span>
                                                    )}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </ScrollerThin>
                    <div className={cl("modal-divider")} />
                    <ScrollerThin className={cl("modal-perms")} orientation="auto">
                        {(Object.values(Permissions) as bigint[]).map(bit => {
                            const overrideType = (() => {
                                const { permissions: itemPermissions, overwriteAllow, overwriteDeny } = selectedItem;

                                if (itemPermissions != null) return (itemPermissions & bit) === bit ? "allowed" : "denied";
                                if (overwriteAllow && (overwriteAllow & bit) === bit) return "allowed";
                                if (overwriteDeny && (overwriteDeny & bit) === bit) return "denied";
                                return "default";
                            })();

                            if (overrideType === "default") return null;

                            const spec = guildPermissionSpecMap[String(bit)];
                            return (
                                <div key={String(bit)} className={cl("modal-perms-item")}>
                                    <div className={cl("modal-perms-item-icon")}>
                                        {overrideType === "allowed" && <PermissionAllowedIcon />}
                                        {overrideType === "denied" && <PermissionDeniedIcon />}
                                    </div>
                                    <p className="majic-permviewer-text">{spec.title}</p>

                                    <Tooltip text={typeof spec.description === "function" ? i18n.intl.format(spec.description, {}) : spec.description}>
                                        {(props: Record<string, unknown>) => (
                                            <span {...props} className="majic-permviewer-info-icon">
                                                <DiscordIcon name="CircleInformationIcon" size={18} />
                                            </span>
                                        )}
                                    </Tooltip>
                                </div>
                            );
                        })}
                    </ScrollerThin>
                </div>
            )}
        </Modal>
    );
}

function RoleContextMenu({ guild, roleId, onClose }: { guild: any; roleId: string; onClose(): void }) {
    const popoutRef = useRef(null);
    const role = Stores.GuildRoleStore.getRole(guild.id, roleId);
    const { before, after } = buildExtraRoleContextMenuItems(role, guild, popoutRef);

    return (
        <Menu.Menu navId={cl("role-context-menu")} onClose={ContextMenuApi.closeContextMenu} aria-label={s("roleOptions")}>
            {before}

            <Menu.MenuItem
                id={cl("copy-role-id")}
                label={getIntlMessage("COPY_ID_ROLE")}
                icon={CopyIdIcon}
                leadingAccessory={{ type: "icon", icon: CopyIdIcon }}
                action={() => copyToClipboard(roleId)}
            />

            {after}

            {(settings.store as any).unsafeViewAsRole && (
                <Menu.MenuItem
                    id={cl("view-as-role")}
                    label={getIntlMessage("VIEW_AS_ROLE")}
                    icon={ViewAsRoleIcon}
                    leadingAccessory={{ type: "icon", icon: ViewAsRoleIcon }}
                    action={() => {
                        onClose();
                        FluxDispatcher.dispatch({
                            type: "IMPERSONATE_UPDATE",
                            guildId: guild.id,
                            data: { type: "ROLES", roles: { [roleId]: role } }
                        });
                    }}
                />
            )}
        </Menu.Menu>
    );
}

function UserContextMenu({ userId }: { userId: string }) {
    return (
        <Menu.Menu navId={cl("user-context-menu")} onClose={ContextMenuApi.closeContextMenu} aria-label={s("userOptions")}>
            <Menu.MenuItem
                id={cl("copy-user-id")}
                label={getIntlMessage("COPY_ID_USER")}
                leadingAccessory={{ type: "icon", icon: CopyIdIcon }}
                action={() => copyToClipboard(userId)}
            />
        </Menu.Menu>
    );
}

const RolesAndUsersPermissions = withErrorBoundary("PermissionsViewer", RolesAndUsersPermissionsComponent);

export default function openRolesAndUsersPermissionsModal(permissions: RoleOrUserPermission[], guild: any, header: string) {
    return openModalLazy(async () => {
        await loadGetGuildPermissionSpecMap();

        return (modalProps: any) => (
            <RolesAndUsersPermissions modalProps={modalProps} permissions={permissions} guild={guild} header={header} />
        );
    });
}
