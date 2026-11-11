/*
 * Majic — ImplicitRelationships plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { mapMangledModuleLazy } from "@webpack";
import { FluxDispatcher, SnowflakeUtils, Stores } from "@webpack/common";

const s = createStrings({
    en: { implicit: "Implicit" },
    fr: { implicit: "Implicites" }
});

const logger = new Logger("ImplicitRelationships", "#bd93f9");

const Constants = mapMangledModuleLazy('ME:"/users/@me"', {
    FriendsSections: (m: any) => m.PENDING === "PENDING" && m.ADD_FRIEND
});

const settings = definePluginSettings({
    sortByAffinity: {
        type: OptionType.BOOLEAN,
        description: "Sort implicit relationships by their affinity to you",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "ImplicitRelationships",
    description: "Shows your implicit relationships in the Friends tab",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche tes relations implicites dans l'onglet Amis",
            options: {
                sortByAffinity: "Trier les relations implicites selon leur affinité avec toi"
            }
        }
    },
    settings,

    get implicitLabel() {
        return s("implicit");
    },

    patches: [
        {
            find: "#{intl::FRIENDS_ALL_HEADER}",
            replacement: {
                match: /toString\(\)\}\);case (\i\.\i)\.PENDING/,
                replace: 'toString()});case $1.IMPLICIT:return $self.implicitLabel+" — "+arguments[1];case $1.BLOCKED'
            }
        },
        {
            find: "FriendsEmptyState: Invalid empty state",
            replacement: {
                match: /case (\i\.\i)\.ONLINE:(?=return (\i)\.SECTION_ONLINE)/,
                replace: "case $1.ONLINE:case $1.IMPLICIT:"
            }
        },
        {
            find: "#{intl::FRIENDS_SECTION_ONLINE}),className:",
            replacement: {
                match: /,{id:(\i\.\i)\.PENDING,show:.+?className:(\i\.\i)(?=\},\{id:)/,
                replace: (rest: string, relationshipTypes: string, className: string) =>
                    `,{id:${relationshipTypes}.IMPLICIT,show:true,className:${className},content:$self.implicitLabel}${rest}`
            }
        },
        {
            find: '"FriendsStore"',
            replacement: {
                match: /(?<=case (\i\.\i)\.SUGGESTIONS:return \d+===(\i)\.type)/,
                replace: ";case $1.IMPLICIT:return $2.type===5"
            }
        },
        {
            find: '"FriendsStore',
            replacement: {
                match: /(\i\.\i)\.fetchRelationships\(\)/,
                replace: "$1.fetchRelationships(),$self.fetchImplicitRelationships()"
            }
        },
        {
            find: "getRelationshipCounts(){",
            replacement: {
                predicate: () => settings.store.sortByAffinity,
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
            }
        },
        {
            find: ".REQUEST_GUILD_MEMBERS,",
            replacement: {
                match: /\.REQUEST_GUILD_MEMBERS,{/,
                replace: "$&nonce:arguments[1]?.nonce,"
            }
        },
        {
            find: "GUILD_MEMBERS_REQUEST:",
            replacement: {
                match: /presences:!!(\i)\.presences/,
                replace: "$&,nonce:$1.nonce"
            }
        },
        {
            find: ".not_found",
            replacement: {
                match: /notFound:(\i)\.not_found/,
                replace: "$&,nonce:$1.nonce"
            }
        }
    ],

    wrapSort(comparator: (row: any) => unknown, row: any) {
        return row.type === 5
            ? (Stores.UserAffinitiesV2Store.getUserAffinity(row.user.id)?.communicationRank ?? 0)
            : comparator(row);
    },

    async fetchImplicitRelationships() {
        const { RelationshipStore, UserAffinitiesV2Store, UserStore, GuildStore } = Stores;

        const userAffinities: Array<Record<string, any>> = UserAffinitiesV2Store.getUserAffinities();
        const relationships = RelationshipStore.getMutableRelationships();
        const nonFriendAffinities = userAffinities.filter(a => !RelationshipStore.getRelationshipType(a.otherUserId));
        nonFriendAffinities.forEach(a => relationships.set(a.otherUserId, 5));
        RelationshipStore.emitChange();

        const toRequest = nonFriendAffinities.filter(a => !UserStore.getUser(a.otherUserId));
        const allGuildIds = Object.keys(GuildStore.getGuilds());
        const sentNonce = SnowflakeUtils.fromTimestamp(Date.now());
        let count = allGuildIds.length * Math.ceil(toRequest.length / 100);

        const callback = ({ chunks }: { chunks: Array<{ nonce?: string }> }) => {
            try {
                const chunkCount = chunks.filter(chunk => chunk.nonce === sentNonce).length;
                if (chunkCount === 0) return;

                count -= chunkCount;
                RelationshipStore.emitChange();
                if (count <= 0) FluxDispatcher.unsubscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
            } catch (err) {
                logger.error("Error in GUILD_MEMBERS_CHUNK_BATCH handler", err);
            }
        };

        FluxDispatcher.subscribe("GUILD_MEMBERS_CHUNK_BATCH", callback);
        for (let i = 0; i < toRequest.length; i += 100) {
            FluxDispatcher.dispatch({
                type: "GUILD_MEMBERS_REQUEST",
                guildIds: allGuildIds,
                userIds: toRequest.slice(i, i + 100).map(e => e.otherUserId),
                presences: true,
                nonce: sentNonce
            });
        }
    },

    start() {
        Constants.FriendsSections.IMPLICIT = "IMPLICIT";
    }
});
