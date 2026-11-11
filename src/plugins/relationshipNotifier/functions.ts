/*
 * Majic — RelationshipNotifier handlers
 */

import { openUserProfile } from "@utils/discord";
import { UserUtils } from "@webpack/common";

import settings, { GROUP_DM, RelationshipType, s } from "./settings";
import type { ChannelDelete, GuildDelete, RelationshipRemove } from "./types";
import { deleteGroup, deleteGuild, getGroup, getGuild, getUniqueUsername, GuildAvailabilityStore, notify } from "./utils";

let manuallyRemovedFriend: string | undefined;
let manuallyRemovedGuild: string | undefined;
let manuallyRemovedGroup: string | undefined;

export const removeFriend = (id: string) => manuallyRemovedFriend = id;
export const removeGuild = (id: string) => manuallyRemovedGuild = id;
export const removeGroup = (id: string) => manuallyRemovedGroup = id;

export async function onRelationshipRemove({ relationship: { type, id } }: RelationshipRemove) {
    if (manuallyRemovedFriend === id) {
        manuallyRemovedFriend = undefined;
        return;
    }

    const user = await UserUtils.getUser(id).catch(() => null);
    if (!user) return;

    switch (type) {
        case RelationshipType.FRIEND:
            if (settings.store.friends) {
                notify(
                    s("friendRemoved", { name: getUniqueUsername(user) }),
                    user.getAvatarURL(undefined, undefined, false),
                    () => openUserProfile(user.id)
                );
            }
            break;
        case RelationshipType.INCOMING_REQUEST:
            if (settings.store.friendRequestCancels) {
                notify(
                    s("requestRemoved", { name: getUniqueUsername(user) }),
                    user.getAvatarURL(undefined, undefined, false),
                    () => openUserProfile(user.id)
                );
            }
            break;
    }
}

export function onGuildDelete({ guild: { id, unavailable } }: GuildDelete) {
    if (!settings.store.servers) return;
    if (unavailable || GuildAvailabilityStore.isUnavailable(id)) return;

    if (manuallyRemovedGuild === id) {
        deleteGuild(id);
        manuallyRemovedGuild = undefined;
        return;
    }

    const guild = getGuild(id);
    if (guild) {
        deleteGuild(id);
        notify(s("removedFromServer", { name: guild.name }), guild.iconURL);
    }
}

export function onChannelDelete({ channel: { id, type } }: ChannelDelete) {
    if (!settings.store.groups) return;
    if (type !== GROUP_DM) return;

    if (manuallyRemovedGroup === id) {
        deleteGroup(id);
        manuallyRemovedGroup = undefined;
        return;
    }

    const group = getGroup(id);
    if (group) {
        deleteGroup(id);
        notify(s("removedFromGroup", { name: group.name }), group.iconURL);
    }
}
