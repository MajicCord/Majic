/*
 * Majic — ReadAllNotificationsButton plugin
 */

import { addServerListElement, removeServerListElement } from "@api/serverList";
import { definePlugin } from "@utils/types";
import { createStrings } from "@i18n";
import { FluxDispatcher, React, showToast, Stores } from "@webpack/common";

const s = createStrings({
    en: { button: "Read all", nothing: "Nothing to mark as read", done: "Marked {count} channels as read" },
    fr: { button: "Tout lire", nothing: "Rien à marquer comme lu", done: "{count} salons marqués comme lus" }
});

function unreadChannelsOf(guildId: string) {
    const channels = Stores.GuildChannelStore?.getChannels(guildId) ?? {};
    const threads = Object.values(Stores.ActiveJoinedThreadsStore?.getActiveJoinedThreadsForGuild(guildId) ?? {})
        .flatMap(group => Object.values(group as Record<string, unknown>));

    return [...(channels.SELECTABLE ?? []), ...(channels.VOCAL ?? []), ...threads]
        .map((entry: any) => entry?.channel?.id ?? entry?.id)
        .filter((id: string | undefined): id is string => Boolean(id) && Stores.ReadStateStore.hasUnread(id));
}

function markAllAsRead() {
    const channelIds = Object.keys(Stores.GuildStore.getGuilds()).flatMap(unreadChannelsOf);
    if (!channelIds.length) return showToast({ text: s("nothing") });

    FluxDispatcher.dispatch({
        type: "BULK_ACK",
        context: "APP",
        channels: channelIds.map(channelId => ({ channelId, messageId: Stores.ReadStateStore.lastMessageId(channelId), readStateType: 0 }))
    });
    showToast({ text: s("done", { count: channelIds.length }), variant: "success" });
}

const ReadAllButton = () => (
    <div className="majic-read-all-wrapper">
        <button type="button" className="majic-read-all" onClick={markAllAsRead}>{s("button")}</button>
    </div>
);

export default definePlugin({
    name: "ReadAllNotificationsButton",
    description: "Adds a button to the server list that marks every server as read",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton à la liste des serveurs qui marque tous les serveurs comme lus"
        }
    },

    css: `
.majic-read-all-wrapper {
    display: flex;
    justify-content: center;
    width: 100%;
    box-sizing: border-box;
    padding: 4px 0 8px 8px;
    flex-shrink: 0;
}
.majic-read-all {
    width: 40px;
    padding: 4px 0;
    white-space: nowrap;
    border: none;
    border-radius: 6px;
    background: var(--majic-accent);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    line-height: 12px;
    letter-spacing: -.02em;
    cursor: pointer;
    transition: filter .15s, transform .15s;
}
.majic-read-all:hover { filter: brightness(1.12); }
.majic-read-all:active { transform: scale(.95); }
`,

    start() {
        addServerListElement("above", "read-all", ReadAllButton);
    },

    stop() {
        removeServerListElement("above", "read-all");
    }
});
