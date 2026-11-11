/*
 * Majic — PermissionsViewer user permissions
 */

import { getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { findCssClassesLazy } from "@webpack";
import { DiscordIcon, Permissions, React, Stores, Tooltip, useMemo } from "@webpack/common";

import { cl, getGuildPermissionSpecMap, getSortedRolesForMember, PermissionOverwriteType, PermissionsSortOrder, type RoleOrUserPermission, s, settings, sortUserRoles } from "../utils";
import openRolesAndUsersPermissionsModal from "./RolesAndUsersPermissions";

interface UserPermission {
    permission: string;
    roleName: string;
    roleColor: string;
    rolePosition: number;
}

const RoleClasses = findCssClassesLazy("role", "roleName", "roleRemoveButton", "roleNameOverflow", "root");
const RoleBorderClasses = findCssClassesLazy("roleCircle", "dot", "dotBorderColor");

function FakeRole({ text, color, ...props }: React.HTMLAttributes<HTMLDivElement> & { text: string; color: string }) {
    return (
        <div {...props} className={classes(RoleClasses.role)}>
            <div className={RoleClasses.roleRemoveButton}>
                <span className={RoleBorderClasses.roleCircle} style={{ backgroundColor: color }} />
            </div>
            <div className={RoleClasses.roleName}>
                <span className={classes(RoleClasses.roleNameOverflow, "majic-permviewer-text-xs")}>{text}</span>
            </div>
        </div>
    );
}

function GrantedByTooltip({ roleName, roleColor }: { roleName: string; roleColor: string }) {
    return (
        <>
            <p className="majic-permviewer-text">{s("grantedBy")}</p>
            <FakeRole text={roleName} color={roleColor} />
        </>
    );
}

function UserPermissionsComponent({ guild, guildMember, closePopout }: { guild: any; guildMember: any; closePopout(): void }) {
    const { permissionsSortOrder } = settings.use(["permissionsSortOrder"]);

    const guildPermissionSpecMap = useMemo(() => getGuildPermissionSpecMap(guild), [guild.id]);

    const [rolePermissions, userPermissions] = useMemo(() => {
        const userPermissions: UserPermission[] = [];
        const userRoles = getSortedRolesForMember(guild, guildMember);

        const rolePermissions: RoleOrUserPermission[] = userRoles.map((role: any) => ({ type: PermissionOverwriteType.ROLE, ...role }));

        if (guild.ownerId === guildMember.userId) {
            rolePermissions.push({
                type: PermissionOverwriteType.OWNER,
                permissions: (Object.values(Permissions) as bigint[]).reduce((prev, curr) => prev | curr, 0n)
            });

            userPermissions.push({
                permission: getIntlMessage("GUILD_OWNER") ?? s("serverOwner"),
                roleName: s("ownerRole"),
                roleColor: "var(--primary-300)",
                rolePosition: Infinity
            });
        }

        sortUserRoles(userRoles);

        for (const bit of Object.values(Permissions) as bigint[]) {
            for (const { permissions, colorString, position, name } of userRoles) {
                if ((permissions & bit) === bit) {
                    userPermissions.push({
                        permission: guildPermissionSpecMap[String(bit)].title,
                        roleName: name,
                        roleColor: colorString || "var(--primary-300)",
                        rolePosition: position
                    });
                    break;
                }
            }
        }

        userPermissions.sort((a, b) => b.rolePosition - a.rolePosition);
        return [rolePermissions, userPermissions];
    }, [permissionsSortOrder]);

    const highest = permissionsSortOrder === PermissionsSortOrder.HighestRole;

    return (
        <div>
            <div className={cl("user-header-container")}>
                <h4 className="majic-permviewer-heading">{s("permissions")}</h4>
                <div className={cl("user-header-btns")}>
                    <Tooltip text={s("sortingBy", { order: highest ? s("highestRole") : s("lowestRole") })}>
                        {(tooltipProps: Record<string, unknown>) => (
                            <div
                                {...tooltipProps}
                                className={cl("user-header-btn")}
                                role="button"
                                tabIndex={0}
                                style={{ transform: highest ? undefined : "scaleY(-1)" }}
                                onClick={() => {
                                    settings.store.permissionsSortOrder = highest ? PermissionsSortOrder.LowestRole : PermissionsSortOrder.HighestRole;
                                }}
                            >
                                <DiscordIcon name="ArrowLargeUpIcon" size={24} color="var(--text-default)" />
                            </div>
                        )}
                    </Tooltip>
                    <Tooltip text={s("roleDetails")}>
                        {(tooltipProps: Record<string, unknown>) => (
                            <div
                                {...tooltipProps}
                                className={cl("user-header-btn")}
                                role="button"
                                tabIndex={0}
                                onClick={() => {
                                    closePopout();
                                    openRolesAndUsersPermissionsModal(rolePermissions, guild, guildMember.nick || Stores.UserStore.getUser(guildMember.userId).username);
                                }}
                            >
                                <DiscordIcon name="MoreHorizontalIcon" size={24} color="var(--text-default)" />
                            </div>
                        )}
                    </Tooltip>
                </div>
            </div>
            {userPermissions.length > 0 && (
                <div className={classes(RoleClasses.root)}>
                    {userPermissions.map(({ permission, roleColor, roleName }) => (
                        <Tooltip
                            key={permission}
                            text={<GrantedByTooltip roleName={roleName} roleColor={roleColor} />}
                            tooltipClassName={cl("granted-by-container")}
                            tooltipContentClassName={cl("granted-by-content")}
                        >
                            {(tooltipProps: Record<string, unknown>) => <FakeRole {...tooltipProps} text={permission} color={roleColor} />}
                        </Tooltip>
                    ))}
                </div>
            )}
        </div>
    );
}

export default withErrorBoundary("PermissionsViewer", UserPermissionsComponent);
