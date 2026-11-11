/*
 * Majic — RelationshipNotifier plugin
 */

import { definePlugin } from "@utils/types";

import { onChannelDelete, onGuildDelete, onRelationshipRemove, removeFriend, removeGroup, removeGuild } from "./functions";
import settings from "./settings";
import { syncAndRunChecks, syncFriends, syncGroups, syncGuilds } from "./utils";

export default definePlugin({
    name: "RelationshipNotifier",
    description: "Notifies you when a friend, group chat or server removes you",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Te prévient quand un ami, un groupe ou un serveur te retire",
            options: {
                notices: "Afficher aussi un bandeau en haut de l'écran (pour ne rater aucune notification)",
                offlineRemovals: "Te prévenir au démarrage si tu as été retiré pendant que tu étais hors ligne",
                friends: "Prévenir quand un ami te retire",
                friendRequestCancels: "Prévenir quand une demande d'ami est annulée",
                servers: "Prévenir quand tu es retiré d'un serveur",
                groups: "Prévenir quand tu es retiré d'un groupe"
            }
        }
    },
    settings,

    patches: [
        {
            find: "removeRelationship:(",
            replacement: {
                match: /(removeRelationship:\((\i),\i,\i\)=>)/,
                replace: "$1($self.removeFriend($2),0)||"
            }
        },
        {
            find: "async leaveGuild(",
            replacement: {
                match: /(leaveGuild\((\i)\){)/,
                replace: "$1$self.removeGuild($2);"
            }
        },
        {
            find: "},closePrivateChannel(",
            replacement: {
                match: /(closePrivateChannel\((\i)\){)/,
                replace: "$1$self.removeGroup($2);"
            }
        }
    ],

    flux: {
        GUILD_CREATE: syncGuilds,
        GUILD_DELETE: onGuildDelete,
        CHANNEL_CREATE: syncGroups,
        CHANNEL_DELETE: onChannelDelete,
        RELATIONSHIP_ADD: syncFriends,
        RELATIONSHIP_UPDATE: syncFriends,
        RELATIONSHIP_REMOVE(e: any) {
            void onRelationshipRemove(e);
            void syncFriends();
        },
        CONNECTION_OPEN: syncAndRunChecks
    },

    start() {
        setTimeout(() => void syncAndRunChecks(), 5000);
    },

    removeFriend,
    removeGroup,
    removeGuild
});
