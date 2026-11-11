/*
 * Majic — RelationshipNotifier helpers
 */

import { DataStore } from "@api/dataStore";
import { dismissNotice, showNotice } from "@api/notices";
import { showNotification } from "@api/notifications";
import { openUserProfile } from "@utils/discord";
import { findStoreLazy } from "@webpack";
import { Stores, UserUtils } from "@webpack/common";

import settings, { GROUP_DM, RelationshipType, s } from "./settings";
import type { SimpleGroupChannel, SimpleGuild } from "./types";

export const GuildAvailabilityStore = findStoreLazy("GuildAvailabilityStore") as {
    totalGuilds: number;
    totalUnavailableGuilds: number;
    unavailableGuilds: string[];
    isUnavailable(guildId: string): boolean;
};

const guilds = new Map<string, SimpleGuild>();
const groups = new Map<string, SimpleGroupChannel>();
const friends = {
    friends: [] as string[],
    requests: [] as string[]
};

const guildsKey = () => `relationship-notifier-guilds-${Stores.UserStore.getCurrentUser().id}`;
const groupsKey = () => `relationship-notifier-groups-${Stores.UserStore.getCurrentUser().id}`;
const friendsKey = () => `relationship-notifier-friends-${Stores.UserStore.getCurrentUser().id}`;

export function getUniqueUsername(user: any) {
    return user.discriminator === "0" ? user.username : user.tag;
}

export async function syncAndRunChecks() {
    if (Stores.UserStore.getCurrentUser() == null) return;

    const [oldGuilds, oldGroups, oldFriends] = await Promise.all([
        DataStore.get<Map<string, SimpleGuild>>(guildsKey()),
        DataStore.get<Map<string, SimpleGroupChannel>>(groupsKey()),
        DataStore.get<Record<"friends" | "requests", string[]>>(friendsKey())
    ]);

    await Promise.all([syncGuilds(), syncGroups(), syncFriends()]);

    if (!settings.store.offlineRemovals) return;

    if (settings.store.groups && oldGroups?.size) {
        for (const [id, group] of oldGroups) {
            if (!groups.has(id)) notify(s("noLongerInGroup", { name: group.name }), group.iconURL);
        }
    }

    if (settings.store.servers && oldGuilds?.size) {
        for (const [id, guild] of oldGuilds) {
            if (!guilds.has(id) && !GuildAvailabilityStore.isUnavailable(id)) notify(s("noLongerInServer", { name: guild.name }), guild.iconURL);
        }
    }

    if (settings.store.friends && oldFriends?.friends.length) {
        for (const id of oldFriends.friends) {
            if (friends.friends.includes(id)) continue;

            const user = await UserUtils.getUser(id).catch(() => undefined);
            if (user) {
                notify(
                    s("noLongerFriends", { name: getUniqueUsername(user) }),
                    user.getAvatarURL(undefined, undefined, false),
                    () => openUserProfile(user.id)
                );
            }
        }
    }

    if (settings.store.friendRequestCancels && oldFriends?.requests?.length) {
        for (const id of oldFriends.requests) {
            if (
                friends.requests.includes(id)
                || ([RelationshipType.FRIEND, RelationshipType.BLOCKED, RelationshipType.OUTGOING_REQUEST] as number[]).includes(Stores.RelationshipStore.getRelationshipType(id))
            ) continue;

            const user = await UserUtils.getUser(id).catch(() => undefined);
            if (user) {
                notify(
                    s("requestRevoked", { name: getUniqueUsername(user) }),
                    user.getAvatarURL(undefined, undefined, false),
                    () => openUserProfile(user.id)
                );
            }
        }
    }
}

export function notify(text: string, icon?: string, onClick?: () => void) {
    if (settings.store.notices) {
        showNotice({
            message: text,
            buttonText: s("ok"),
            onButtonClick: () => dismissNotice()
        });
    }

    void showNotification({
        title: s("title"),
        body: text,
        icon,
        onClick
    });
}

export function getGuild(id: string) {
    return guilds.get(id);
}

export function deleteGuild(id: string) {
    guilds.delete(id);
    void syncGuilds();
}

export async function syncGuilds() {
    guilds.clear();

    const me = Stores.UserStore.getCurrentUser().id;
    for (const [id, { name, icon }] of Object.entries<any>(Stores.GuildStore.getGuilds())) {
        if (Stores.GuildMemberStore.isMember(id, me)) {
            guilds.set(id, {
                id,
                name,
                iconURL: icon && `https://cdn.discordapp.com/icons/${id}/${icon}.png`
            });
        }
    }
    await DataStore.set(guildsKey(), guilds);
}

export function getGroup(id: string) {
    return groups.get(id);
}

export function deleteGroup(id: string) {
    groups.delete(id);
    void syncGroups();
}

export async function syncGroups() {
    groups.clear();

    for (const { type, id, name, rawRecipients, icon } of Stores.ChannelStore.getSortedPrivateChannels()) {
        if (type === GROUP_DM) {
            groups.set(id, {
                id,
                name: name || rawRecipients.map((r: any) => r.username).join(", "),
                iconURL: icon && `https://cdn.discordapp.com/channel-icons/${id}/${icon}.png`
            });
        }
    }

    await DataStore.set(groupsKey(), groups);
}

export async function syncFriends() {
    friends.friends = [];
    friends.requests = [];

    const relationships = Stores.RelationshipStore.getMutableRelationships();
    for (const [id, type] of relationships) {
        switch (type) {
            case RelationshipType.FRIEND:
                friends.friends.push(id);
                break;
            case RelationshipType.INCOMING_REQUEST:
                friends.requests.push(id);
                break;
        }
    }

    await DataStore.set(friendsKey(), friends);
}
