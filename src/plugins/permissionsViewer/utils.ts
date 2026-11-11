/*
 * Majic — PermissionsViewer helpers
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { OptionType } from "@utils/types";
import { extractAndLoadChunksLazy, filters, findByPropsLazy, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";
import { Stores } from "@webpack/common";

export const s = createStrings({
    en: {
        highestRole: "Highest Role",
        lowestRole: "Lowest Role",
        viewPermissions: "View Permissions",
        permissionsTitle: "{name} Permissions",
        noPermissions: "No permissions to display!",
        unknownRole: "Unknown Role",
        unknownUser: "Unknown User",
        owner: "@owner",
        roleOptions: "Role Options",
        userOptions: "User Options",
        permissions: "Permissions",
        sortingBy: "Sorting by {order}",
        roleDetails: "Role Details",
        grantedBy: "Granted By",
        ownerRole: "Owner",
        serverOwner: "Server Owner",
        allowed: "Allowed",
        denied: "Denied"
    },
    fr: {
        highestRole: "Rôle le plus haut",
        lowestRole: "Rôle le plus bas",
        viewPermissions: "Voir les permissions",
        permissionsTitle: "Permissions de {name}",
        noPermissions: "Aucune permission à afficher !",
        unknownRole: "Rôle inconnu",
        unknownUser: "Utilisateur inconnu",
        owner: "@propriétaire",
        roleOptions: "Options du rôle",
        userOptions: "Options de l'utilisateur",
        permissions: "Permissions",
        sortingBy: "Tri par {order}",
        roleDetails: "Détails des rôles",
        grantedBy: "Accordée par",
        ownerRole: "Propriétaire",
        serverOwner: "Propriétaire du serveur",
        allowed: "Autorisée",
        denied: "Refusée"
    }
});

export const PermissionsSortOrder = {
    HighestRole: 0,
    LowestRole: 1
} as const;

export const PermissionOverwriteType = {
    ROLE: 0,
    MEMBER: 1,
    OWNER: 2
} as const;

export interface RoleOrUserPermission {
    type: number;
    id?: string;
    permissions?: bigint;
    overwriteAllow?: bigint;
    overwriteDeny?: bigint;
    [key: string]: any;
}

export const settings = definePluginSettings({
    permissionsSortOrder: {
        type: OptionType.SELECT,
        description: "Sort method used to decide which role grants a user a permission",
        options: [
            { get label() { return s("highestRole"); }, value: PermissionsSortOrder.HighestRole, default: true },
            { get label() { return s("lowestRole"); }, value: PermissionsSortOrder.LowestRole }
        ]
    }
});

export const loadGetGuildPermissionSpecMap = extractAndLoadChunksLazy([".PRIMARY,badgeTooltipDelay:"]);
export const { getGuildPermissionSpecMap } = findByPropsLazy("getGuildPermissionSpecMap");

export const Dialog = findComponentByCodeLazy('role:"dialog",tabIndex:-1');

export const cl = (...names: Array<string | Record<string, boolean>>) => names
    .flatMap(name => typeof name === "string" ? [name] : Object.entries(name).filter(([, on]) => on).map(([key]) => key))
    .map(name => `majic-permviewer-${name}`)
    .join(" ");

export function getSortedRolesForMember({ id: guildId }: { id: string }, member: { roles: string[] }) {
    return Stores.GuildRoleStore
        .getSortedRoles(guildId)
        .filter((role: any) => role.id === guildId || member.roles.includes(role.id));
}

export function sortUserRoles(roles: any[]) {
    switch (settings.store.permissionsSortOrder) {
        case PermissionsSortOrder.HighestRole:
            return roles.sort((a, b) => b.position - a.position);
        case PermissionsSortOrder.LowestRole:
            return roles.sort((a, b) => a.position - b.position);
        default:
            return roles;
    }
}

export function sortPermissionOverwrites<T extends { id: string; type: number }>(overwrites: T[], guildId: string) {
    const roles = Stores.GuildRoleStore.getRolesSnapshot(guildId);

    return overwrites.sort((a, b) => {
        if (a.type !== PermissionOverwriteType.ROLE || b.type !== PermissionOverwriteType.ROLE) return 0;
        return roles[b.id].position - roles[a.id].position;
    });
}

export { ContextMenuApi, Popout } from "@webpack/common";

export { getUniqueUsername } from "@utils/discord";
