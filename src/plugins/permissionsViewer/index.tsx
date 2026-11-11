/*
 * Majic — PermissionsViewer plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { DiscordIcon, Permissions, React, Stores, Tooltip, useEffect, useRef } from "@webpack/common";

import openRolesAndUsersPermissionsModal from "./components/RolesAndUsersPermissions";
import UserPermissions from "./components/UserPermissions";
import { Dialog, getSortedRolesForMember, loadGetGuildPermissionSpecMap, PermissionOverwriteType, Popout, type RoleOrUserPermission, s, settings, sortPermissionOverwrites } from "./utils";

const PopoutClasses = findCssClassesLazy("container", "popoutRoleDot");

const MenuItemParentType = {
    User: 0,
    Channel: 1,
    Guild: 2
} as const;

type ParentType = typeof MenuItemParentType[keyof typeof MenuItemParentType];

const SafetyIcon = () => <DiscordIcon name="ShieldIcon" size={18} />;

function getPermissionsFor(guildId: string, id: string | undefined, type: ParentType | undefined): { permissions: RoleOrUserPermission[]; header: string } {
    const guild = Stores.GuildStore.getGuild(guildId);

    if (type === MenuItemParentType.User) {
        const member = Stores.GuildMemberStore.getMember(guildId, id);
        const permissions: RoleOrUserPermission[] = getSortedRolesForMember(guild, member).map((role: any) => ({ type: PermissionOverwriteType.ROLE, ...role }));

        if (guild.ownerId === id) {
            permissions.push({
                type: PermissionOverwriteType.OWNER,
                permissions: (Object.values(Permissions) as bigint[]).reduce((prev, curr) => prev | curr, 0n)
            });
        }

        return { permissions, header: member.nick ?? Stores.UserStore.getUser(member.userId).username };
    }

    if (type === MenuItemParentType.Channel) {
        const channel = Stores.ChannelStore.getChannel(id);
        const permissions = sortPermissionOverwrites(
            Object.values<any>(channel.permissionOverwrites).map(({ id: overwriteId, allow, deny, type: overwriteType }) => ({
                type: overwriteType,
                id: overwriteId,
                overwriteAllow: allow,
                overwriteDeny: deny
            })),
            guildId
        );

        return { permissions, header: channel.name };
    }

    return {
        permissions: Stores.GuildRoleStore.getSortedRoles(guild.id).map((role: any) => ({ type: PermissionOverwriteType.ROLE, ...role })),
        header: guild.name
    };
}

function MenuItem(guildId: string, { id, type, withIcon }: { id?: string; type?: ParentType; withIcon?: boolean }) {
    if (type === MenuItemParentType.User && !Stores.GuildMemberStore.isMember(guildId, id)) return null;

    return (
        <Menu.MenuItem
            id="perm-viewer-permissions"
            key="perm-viewer-permissions"
            label={s("viewPermissions")}
            leadingAccessory={withIcon ? { type: "icon", icon: SafetyIcon } : undefined}
            action={() => {
                const { permissions, header } = getPermissionsFor(guildId, id, type);
                openRolesAndUsersPermissionsModal(permissions, Stores.GuildStore.getGuild(guildId), header);
            }}
        />
    );
}

function makeContextMenuPatch(childId: string | string[], type?: ParentType, withIcon = false) {
    return (children: any[], props: any) => {
        if (
            !props
            || (type === MenuItemParentType.User && !props.user)
            || (type === MenuItemParentType.Guild && !props.guild)
            || (type === MenuItemParentType.Channel && (!props.channel || !props.guild))
        ) return;

        const group = findGroupChildrenByChildId(childId, children);

        const item = type === MenuItemParentType.User
            ? MenuItem(props.guildId, { id: props.user.id, type, withIcon })
            : type === MenuItemParentType.Channel
                ? MenuItem(props.guild.id, { id: props.channel.id, type, withIcon })
                : type === MenuItemParentType.Guild
                    ? MenuItem(props.guild.id, { withIcon })
                    : null;

        if (item == null) return;

        if (group) {
            group.push(item);
            return;
        }

        if (childId === "roles" && props.guildId) {
            children.splice(-1, 0, <Menu.MenuGroup key="majic-perm-viewer-group">{item}</Menu.MenuGroup>);
        }
    };
}

function ViewPermissionsButton({ className, guild, userId }: { className: string; guild: any; userId: string }) {
    const buttonRef = useRef(null);
    useEffect(() => void loadGetGuildPermissionSpecMap(), []);

    const guildMember = Stores.GuildMemberStore.getMember(guild.id, userId);
    if (!guildMember) return null;

    return (
        <Popout
            position="bottom"
            align="center"
            targetElementRef={buttonRef}
            renderPopout={({ closePopout }: { closePopout(): void }) => (
                <Dialog className={PopoutClasses.container} style={{ width: "500px" }}>
                    <UserPermissions guild={guild} guildMember={guildMember} closePopout={closePopout} />
                </Dialog>
            )}
        >
            {(popoutProps: Record<string, unknown>) => (
                <Tooltip text={s("viewPermissions")}>
                    {(tooltipProps: Record<string, unknown>) => (
                        <button
                            {...tooltipProps}
                            {...popoutProps}
                            ref={buttonRef}
                            type="button"
                            className={classes(className, "majic-permviewer-role-button")}
                        >
                            <DiscordIcon name="ShieldIcon" size={16} />
                        </button>
                    )}
                </Tooltip>
            )}
        </Popout>
    );
}

const CSS = [
    ".majic-permviewer-user-header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }",
    ".majic-permviewer-user-header-btns { display: flex; gap: 8px; }",
    ".majic-permviewer-user-header-btn { cursor: pointer; display: flex; align-items: center; justify-content: center; }",
    ".majic-permviewer-heading { margin: 0; color: var(--text-strong); font-size: 16px; font-weight: 600; }",
    ".majic-permviewer-text { margin: 0; color: var(--text-default); font-size: 16px; }",
    ".majic-permviewer-text-lg { margin: 0; color: var(--text-default); font-size: 20px; }",
    ".majic-permviewer-text-xs { font-size: 12px; font-weight: 500; }",
    ".majic-permviewer-modal-no-perms { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; }",
    ".majic-permviewer-modal-container { width: 100%; height: min(760px, 80vh); min-height: 0; display: flex; gap: 8px; overflow: hidden; }",
    ".majic-permviewer-modal-list { display: flex; flex-direction: column; gap: 2px; flex: 0 0 200px; max-height: 100%; min-height: 0; overflow: auto; padding-right: 8px; }",
    ".majic-permviewer-modal-list-item-btn { cursor: pointer; }",
    ".majic-permviewer-modal-list-item { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 5px; }",
    ".majic-permviewer-modal-list-item:hover { background-color: var(--background-mod-subtle); }",
    ".majic-permviewer-modal-list-item-active { background-color: var(--background-mod-strong); }",
    ".majic-permviewer-modal-list-item-text { margin: 0; color: var(--text-default); font-size: 16px; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; }",
    ".majic-permviewer-modal-role-circle { border-radius: 50%; width: 12px; height: 12px; flex-shrink: 0; }",
    ".majic-permviewer-modal-role-image { width: 20px; height: 20px; object-fit: contain; }",
    ".majic-permviewer-modal-user-img { border-radius: 50%; width: 20px; height: 20px; }",
    ".majic-permviewer-modal-divider { width: 2px; background-color: var(--background-mod-normal); }",
    ".majic-permviewer-modal-perms { display: flex; flex-direction: column; flex: 1 1 0; max-height: 100%; min-width: 0; min-height: 0; overflow: auto; padding-right: 8px; }",
    ".majic-permviewer-modal-perms-item { display: flex; align-items: center; gap: 5px; padding: 10px 2px 10px 10px; border-bottom: 2px solid var(--background-mod-normal); }",
    ".majic-permviewer-modal-perms-item:last-child { border: 0; }",
    ".majic-permviewer-modal-perms-item-icon { border: 1px solid var(--background-mod-strong); width: 24px; height: 24px; }",
    ".majic-permviewer-info-icon { display: flex; color: var(--interactive-muted); margin-left: auto; cursor: pointer; transition: color ease-in 0.1s; }",
    ".majic-permviewer-info-icon:hover { color: var(--interactive-icon-active); }",
    ".majic-permviewer-role-button { display: flex; align-items: center; justify-content: center; background: none; cursor: pointer; border-radius: var(--radius-sm); color: var(--interactive-icon-default); border: 1px solid var(--user-profile-border); width: fit-content; height: 24px; padding: 4px; }",
    ".majic-permviewer-role-button:hover { background-color: var(--user-profile-background-hover); }",
    ".majic-permviewer-granted-by-container { max-width: 300px; width: auto; }",
    ".majic-permviewer-granted-by-content { display: flex; align-items: center; gap: 4px; }"
].join(" ");

export default definePlugin({
    name: "PermissionsViewer",
    description: "View the permissions of a user or channel, and the roles of a server",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les permissions d'un utilisateur ou d'un salon, et les rôles d'un serveur",
            options: {
                permissionsSortOrder: "Méthode de tri pour savoir quel rôle accorde une permission"
            }
        }
    },
    settings,

    css: CSS,

    patches: [
        {
            find: "#{intl::COLLAPSE_ROLES}",
            replacement: {
                match: /(?<=\i\.id\)\),\i\(\))(?=,\i\?)/,
                replace: ",$self.ViewPermissionsButton(arguments[0])"
            }
        }
    ],

    ViewPermissionsButton: withErrorBoundary("PermissionsViewer", ViewPermissionsButton),

    contextMenus: {
        "user-context": makeContextMenuPatch("roles", MenuItemParentType.User),
        "channel-context": makeContextMenuPatch(["mute-channel", "unmute-channel"], MenuItemParentType.Channel),
        "guild-context": makeContextMenuPatch("privacy", MenuItemParentType.Guild),
        "guild-header-popout": makeContextMenuPatch("privacy", MenuItemParentType.Guild, true)
    }
});
