/*
 * Majic — ServerListIndicators plugin
 */

import { addServerListElement, removeServerListElement } from "@api/serverList";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { React, Stores, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { friends: "Only online friend count", servers: "Only server count", both: "Both server and online friend counts", online: "{count} online", serverCount: "{count} servers" },
    fr: { friends: "Seulement le nombre d'amis en ligne", servers: "Seulement le nombre de serveurs", both: "Le nombre de serveurs et d'amis en ligne", online: "{count} en ligne", serverCount: "{count} serveurs" }
});

const IndicatorType = {
    SERVER: 1 << 0,
    FRIEND: 1 << 1,
    BOTH: (1 << 0) | (1 << 1)
} as const;

const UserGuildJoinRequestStore = findStoreLazy("UserGuildJoinRequestStore");

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "Mode",
        options: [
            { get label() { return s("friends"); }, value: IndicatorType.FRIEND, default: true },
            { get label() { return s("servers"); }, value: IndicatorType.SERVER },
            { get label() { return s("both"); }, value: IndicatorType.BOTH }
        ]
    }
});

const indicatorStyle = {
    display: "inline-block",
    width: "100%",
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-default)",
    textTransform: "uppercase",
    textAlign: "center"
} as const;

function FriendsIndicator() {
    const onlineFriendsCount = useStateFromStores([Stores.RelationshipStore, Stores.PresenceStore], () => {
        let count = 0;
        for (const id of Stores.RelationshipStore.getFriendIDs()) {
            const status = Stores.PresenceStore.getStatus(id) ?? "offline";
            if (status !== "offline") count++;
        }
        return count;
    });

    return <span id="majic-friendcount" style={indicatorStyle}>{s("online", { count: onlineFriendsCount })}</span>;
}

function ServersIndicator() {
    const guildCount = useStateFromStores([Stores.GuildStore, UserGuildJoinRequestStore], () => {
        const guildJoinRequests: string[] = UserGuildJoinRequestStore.computeGuildIds();
        const guilds = Stores.GuildStore.getGuilds();
        return Stores.GuildStore.getGuildCount() + guildJoinRequests.filter(id => guilds[id] == null).length;
    });

    return <span id="majic-guildcount" style={indicatorStyle}>{s("serverCount", { count: guildCount })}</span>;
}

function renderIndicator() {
    const mode = Number(settings.store.mode);
    return (
        <ErrorBoundary name="ServerListIndicators">
            <div style={{ marginBottom: "4px" }}>
                {!!(mode & IndicatorType.FRIEND) && <FriendsIndicator />}
                {!!(mode & IndicatorType.SERVER) && <ServersIndicator />}
            </div>
        </ErrorBoundary>
    );
}

export default definePlugin({
    name: "ServerListIndicators",
    description: "Adds the online friend count or server count to the server list",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["ServerListAPI"],
    translations: {
        fr: {
            description: "Ajoute le nombre d'amis en ligne ou de serveurs dans la liste des serveurs",
            options: {
                mode: "Mode"
            }
        }
    },
    settings,

    renderIndicator,

    start() {
        addServerListElement("above", "server-list-indicators", renderIndicator);
    },

    stop() {
        removeServerListElement("above", "server-list-indicators");
    }
});
