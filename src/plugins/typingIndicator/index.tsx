/*
 * Majic — TypingIndicator plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { getIntlMessage } from "@utils/discord";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { React, Stores, Tooltip, UserSummaryItem, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { both: "Avatars and animated dots", dots: "Animated dots", avatars: "Avatars" },
    fr: { both: "Avatars et points animés", dots: "Points animés", avatars: "Avatars" }
});

const ThreeDots = findComponentByCodeLazy("Math.min(1,Math.max(", "dotRadius:");

const IndicatorMode = {
    Dots: 1 << 0,
    Avatars: 1 << 1
} as const;

const settings = definePluginSettings({
    includeCurrentChannel: {
        type: OptionType.BOOLEAN,
        description: "Show the indicator for the currently selected channel",
        default: true
    },
    includeMutedChannels: {
        type: OptionType.BOOLEAN,
        description: "Show the indicator for muted channels",
        default: false
    },
    includeIgnoredUsers: {
        type: OptionType.BOOLEAN,
        description: "Show the indicator for ignored users",
        default: false
    },
    includeBlockedUsers: {
        type: OptionType.BOOLEAN,
        description: "Show the indicator for blocked users",
        default: false
    },
    indicatorMode: {
        type: OptionType.SELECT,
        description: "How the indicator is displayed",
        options: [
            { get label() { return s("both"); }, value: IndicatorMode.Dots | IndicatorMode.Avatars, default: true },
            { get label() { return s("dots"); }, value: IndicatorMode.Dots },
            { get label() { return s("avatars"); }, value: IndicatorMode.Avatars }
        ]
    }
});

function getDisplayName(guildId: string, userId: string) {
    const user = Stores.UserStore.getUser(userId);
    return Stores.GuildMemberStore.getNick(guildId, userId) ?? user?.globalName ?? user?.username;
}

function getTooltipText(guildId: string, users: string[]) {
    const [a, b, c] = users;
    switch (users.length) {
        case 1: return getIntlMessage("ONE_USER_TYPING", { a: getDisplayName(guildId, a) });
        case 2: return getIntlMessage("TWO_USERS_TYPING", { a: getDisplayName(guildId, a), b: getDisplayName(guildId, b) });
        case 3: return getIntlMessage("THREE_USERS_TYPING", { a: getDisplayName(guildId, a), b: getDisplayName(guildId, b), c: getDisplayName(guildId, c) });
        default: return getIntlMessage("SEVERAL_USERS_TYPING");
    }
}

function TypingIndicator({ channelId, guildId }: { channelId: string; guildId: string }) {
    const typingUsers: Record<string, number> = useStateFromStores(
        [Stores.TypingStore],
        () => ({ ...Stores.TypingStore.getTypingUsers(channelId) }),
        undefined,
        (old, current) => {
            const oldKeys = Object.keys(old);
            const currentKeys = Object.keys(current);
            return oldKeys.length === currentKeys.length && currentKeys.every(key => old[key] != null);
        }
    );
    const currentChannelId = useStateFromStores([Stores.SelectedChannelStore], () => Stores.SelectedChannelStore.getChannelId());

    if (!settings.store.includeMutedChannels && Stores.UserGuildSettingsStore.isChannelMuted(guildId, channelId)) return null;
    if (!settings.store.includeCurrentChannel && currentChannelId === channelId) return null;

    const myId = Stores.UserStore.getCurrentUser()?.id;
    const { RelationshipStore } = Stores;
    const users = Object.keys(typingUsers).filter(id =>
        id !== myId
        && !(RelationshipStore.isBlocked(id) && !settings.store.includeBlockedUsers)
        && !(RelationshipStore.isIgnored?.(id) && !settings.store.includeIgnoredUsers)
    );

    if (!users.length) return null;

    const mode = Number(settings.store.indicatorMode);
    return (
        <Tooltip text={getTooltipText(guildId, users)}>
            {(props: Record<string, unknown>) => (
                <div className="majic-typing-indicator" {...props}>
                    {(mode & IndicatorMode.Avatars) === IndicatorMode.Avatars && (
                        <div
                            onClick={e => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            onKeyPress={e => e.stopPropagation()}
                        >
                            <UserSummaryItem
                                users={users.map(id => Stores.UserStore.getUser(id))}
                                guildId={guildId}
                                renderIcon={false}
                                max={3}
                                showDefaultAvatarsForNullUsers
                                showUserPopout
                                size={16}
                                className="majic-typing-indicator-avatars"
                            />
                        </div>
                    )}
                    {(mode & IndicatorMode.Dots) === IndicatorMode.Dots && (
                        <div className="majic-typing-indicator-dots">
                            <ThreeDots dotRadius={3} themed={true} />
                        </div>
                    )}
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "TypingIndicator",
    description: "Adds an indicator next to channels where someone is typing",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un indicateur à côté des salons où quelqu'un est en train d'écrire",
            options: {
                includeCurrentChannel: "Afficher l'indicateur pour le salon actuellement ouvert",
                includeMutedChannels: "Afficher l'indicateur pour les salons en sourdine",
                includeIgnoredUsers: "Afficher l'indicateur pour les utilisateurs ignorés",
                includeBlockedUsers: "Afficher l'indicateur pour les utilisateurs bloqués",
                indicatorMode: "Forme de l'indicateur"
            }
        }
    },
    settings,

    css: ".majic-typing-indicator { display: flex; align-items: center; height: 20px; } .majic-typing-indicator-avatars { margin-left: 6px; } .majic-typing-indicator-dots { margin-left: 6px; height: 16px; display: flex; align-items: center; z-index: 0; cursor: pointer; }",

    patches: [
        {
            find: "UNREAD_IMPORTANT:",
            replacement: {
                match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                replace: "$&,$self.TypingIndicator($1.id,$1.getGuildId())"
            }
        },
        {
            find: "M0 15H2c0 1.6569",
            replacement: {
                match: /\(\i,\{thread:(\i),countInVoice:.{0,200}?\]\}\)(?=\])/,
                replace: "$&,$self.TypingIndicator($1.id,$1.getGuildId())"
            }
        }
    ],

    TypingIndicator: (channelId: string, guildId: string) => (
        <ErrorBoundary name="TypingIndicator">
            <TypingIndicator channelId={channelId} guildId={guildId} />
        </ErrorBoundary>
    )
});
