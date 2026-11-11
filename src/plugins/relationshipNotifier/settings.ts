/*
 * Majic — RelationshipNotifier settings
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { OptionType } from "@utils/types";

export const s = createStrings({
    en: {
        title: "Relationship Notifier",
        ok: "OK",
        friendRemoved: "{name} removed you as a friend.",
        requestRemoved: "A friend request from {name} has been removed.",
        removedFromServer: "You were removed from the server {name}.",
        removedFromGroup: "You were removed from the group {name}.",
        noLongerInGroup: "You are no longer in the group {name}.",
        noLongerInServer: "You are no longer in the server {name}.",
        noLongerFriends: "You are no longer friends with {name}.",
        requestRevoked: "Friend request from {name} has been revoked."
    },
    fr: {
        title: "Relationship Notifier",
        ok: "OK",
        friendRemoved: "{name} t'a retiré de ses amis.",
        requestRemoved: "La demande d'ami de {name} a été retirée.",
        removedFromServer: "Tu as été retiré du serveur {name}.",
        removedFromGroup: "Tu as été retiré du groupe {name}.",
        noLongerInGroup: "Tu n'es plus dans le groupe {name}.",
        noLongerInServer: "Tu n'es plus dans le serveur {name}.",
        noLongerFriends: "Tu n'es plus ami avec {name}.",
        requestRevoked: "La demande d'ami de {name} a été annulée."
    }
});

export const RelationshipType = {
    NONE: 0,
    FRIEND: 1,
    BLOCKED: 2,
    INCOMING_REQUEST: 3,
    OUTGOING_REQUEST: 4
} as const;

export const GROUP_DM = 3;

export default definePluginSettings({
    notices: {
        type: OptionType.BOOLEAN,
        description: "Also show a notice at the top of your screen when removed (so you don't miss any notification)",
        default: false
    },
    offlineRemovals: {
        type: OptionType.BOOLEAN,
        description: "Notify you on startup if you were removed while offline",
        default: true
    },
    friends: {
        type: OptionType.BOOLEAN,
        description: "Notify when a friend removes you",
        default: true
    },
    friendRequestCancels: {
        type: OptionType.BOOLEAN,
        description: "Notify when a friend request is cancelled",
        default: true
    },
    servers: {
        type: OptionType.BOOLEAN,
        description: "Notify when removed from a server",
        default: true
    },
    groups: {
        type: OptionType.BOOLEAN,
        description: "Notify when removed from a group chat",
        default: true
    }
});
