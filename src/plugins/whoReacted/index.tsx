/*
 * Majic — WhoReacted plugin
 */

import { definePluginSettings } from "@api/settings";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Queue, sleep, useForceUpdater } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { Endpoints, FluxDispatcher, React, RestAPI, Stores, useEffect, useLayoutEffect, UserSummaryItem } from "@webpack/common";

interface ReactionEmoji {
    id?: string;
    name: string;
}

interface ReactionCacheEntry {
    fetched: boolean;
    users: Map<string, unknown>;
}

interface ReactionProps {
    message: any;
    emoji: ReactionEmoji;
    type: number;
}

let Scroll: any = null;
const queue = new Queue();
let reactions: Record<string, ReactionCacheEntry> = {};

const settings = definePluginSettings({
    clickableAvatars: {
        type: OptionType.BOOLEAN,
        description: "Clicking a reacting user's avatar opens their profile instead of adding the reaction",
        default: true,
        restartNeeded: true
    }
});

function fetchReactions(message: any, emoji: ReactionEmoji, type: number) {
    const key = emoji.name + (emoji.id ? `:${emoji.id}` : "");
    return RestAPI.get({
        url: Endpoints.REACTIONS(message.channel_id, message.id, key),
        query: { limit: 100, type },
        oldFormErrors: true
    })
        .then((res: { body: any[] }) => {
            for (const user of res.body) FluxDispatcher.dispatch({ type: "USER_UPDATE", user });

            FluxDispatcher.dispatch({
                type: "MESSAGE_REACTION_ADD_USERS",
                channelId: message.channel_id,
                messageId: message.id,
                users: res.body,
                emoji,
                reactionType: type
            });
        })
        .catch(console.error)
        .finally(() => sleep(250));
}

function getReactionsWithQueue(message: any, emoji: ReactionEmoji, type: number) {
    const key = `${message.id}:${emoji.name}:${emoji.id ?? ""}:${type}`;
    const cache = reactions[key] ??= { fetched: false, users: new Map() };
    if (!cache.fetched) {
        queue.unshift(() => fetchReactions(message, emoji, type));
        cache.fetched = true;
    }
    return cache.users;
}

function stopPropagation(event: React.UIEvent<HTMLElement>) {
    event.stopPropagation();
}

function ReactionUsers({ message, users }: { message: any; users: any[] }) {
    useLayoutEffect(() => {
        if (Scroll?.scrollCounter > 0) Scroll.setAutomaticAnchor(null);
    });

    return (
        <div style={{ marginLeft: "0.5em", transform: "scale(0.9)" }}>
            <div
                onClick={stopPropagation}
                onKeyDown={stopPropagation}
                style={settings.store.clickableAvatars ? {} : { pointerEvents: "none" }}
            >
                <UserSummaryItem
                    users={users}
                    guildId={Stores.ChannelStore.getChannel(message.channel_id)?.guild_id}
                    renderIcon={false}
                    max={5}
                    showDefaultAvatarsForNullUsers
                    showUserPopout
                />
            </div>
        </div>
    );
}

function Reactors({ message, emoji, type }: ReactionProps) {
    const forceUpdate = useForceUpdater();

    useEffect(() => {
        const onUsers = (event: any) => {
            if (event?.messageId === message.id) forceUpdate();
        };
        FluxDispatcher.subscribe("MESSAGE_REACTION_ADD_USERS", onUsers);
        return () => FluxDispatcher.unsubscribe("MESSAGE_REACTION_ADD_USERS", onUsers);
    }, [message.id, forceUpdate]);

    if (message.reactions.length > 10) return null;

    const reactionMap = getReactionsWithQueue(message, emoji, type);
    const users = Array.from(reactionMap, ([id]) => Stores.UserStore.getUser(id)).filter(Boolean);

    return users.length === 0 ? null : <ReactionUsers message={message} users={users} />;
}

export default definePlugin({
    name: "WhoReacted",
    description: "Shows the avatars of users who reacted to a message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les avatars des personnes qui ont réagi à un message",
            options: {
                clickableAvatars: "Cliquer sur l'avatar d'une personne ouvre son profil au lieu d'ajouter la réaction"
            }
        }
    },
    settings,

    patches: [
        {
            find: ",reactionRef:",
            replacement: {
                match: /(\i)\?null:\(0,\i\.jsx\)\(\i\.\i,{className:\i\.reactionCount,.*?}\),(?<=(emoji:\i,message:\i,type:\i).+?)/,
                replace: "$&$1?null:$self.renderUsers({$2}),"
            }
        },
        {
            find: '"MessageReactionsStore"',
            replacement: {
                match: /CONNECTION_OPEN:function\(\){(\i)={}/,
                replace: "$&;$self.reactions=$1;"
            }
        },
        {
            find: "cleanAutomaticAnchor(){",
            replacement: {
                match: /constructor\(\i\)\{(?=.{0,100}(?:automaticAnchor|\.messages\.loadingMore))/,
                replace: "$&$self.setScrollObj(this);"
            }
        }
    ],

    renderUsers: withErrorBoundary("WhoReacted", Reactors),

    setScrollObj(scroll: any) {
        Scroll = scroll;
    },

    set reactions(value: Record<string, ReactionCacheEntry>) {
        reactions = value;
    }
});
