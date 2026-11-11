/*
 * Majic — TypingTweaks plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { openUserProfile } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { Avatar, React, Stores, useStateFromStores } from "@webpack/common";
import type { ReactNode } from "react";

const s = createStrings({
    en: { others: "and {count} others are typing..." },
    fr: { others: "et {count} autres sont en train d'écrire..." }
});

const logger = new Logger("TypingTweaks", "#ff79c6");

const settings = definePluginSettings({
    showAvatars: {
        type: OptionType.BOOLEAN,
        description: "Show avatars in the typing indicator",
        default: true
    },
    showRoleColors: {
        type: OptionType.BOOLEAN,
        description: "Show role colors in the typing indicator",
        default: true
    },
    alternativeFormatting: {
        type: OptionType.BOOLEAN,
        description: "Show a more useful message when several users are typing",
        default: true
    }
});

function isBlockedOrIgnored(id: string) {
    const { RelationshipStore } = Stores;
    return RelationshipStore.isBlockedOrIgnored?.(id) ?? (RelationshipStore.isBlocked(id) || RelationshipStore.isIgnored?.(id));
}

function TypingUserComponent({ user, guildId }: { user: any; guildId: string }) {
    return (
        <strong
            className="majic-typing-tweaks-user"
            role="button"
            onClick={() => void openUserProfile(user.id)}
            style={{
                color: settings.store.showRoleColors ? Stores.GuildMemberStore.getMember(guildId, user.id)?.colorString : undefined
            }}
        >
            {settings.store.showAvatars && (
                <Avatar
                    className="majic-typing-tweaks-avatar"
                    size="SIZE_16"
                    src={user.getAvatarURL(guildId, 128)}
                />
            )}
            {Stores.GuildMemberStore.getNick(guildId, user.id)
                || (!guildId && Stores.RelationshipStore.getNickname(user.id))
                || user.globalName
                || user.username}
        </strong>
    );
}

const TypingUser = withErrorBoundary("TypingTweaks", TypingUserComponent);

function SeveralUsers({ users, count, guildId }: { users: any[]; count: number; guildId: string }) {
    return (
        <>
            {users.slice(0, count).map(user => (
                <React.Fragment key={user.id}>
                    <TypingUser user={user} guildId={guildId} />
                    {", "}
                </React.Fragment>
            ))}
            {s("others", { count })}
        </>
    );
}

export const buildSeveralUsers = withErrorBoundary("TypingTweaks", SeveralUsers);

function TypingUsers({ guildId, users, children }: { guildId: string; users: any[]; children?: ReactNode }) {
    try {
        if (!Array.isArray(children)) return <>{children}</>;

        let element = 0;
        return (
            <>
                {children.map(c => {
                    if (c.type !== "strong" && !(typeof c !== "string" && !React.isValidElement(c))) return c;

                    const user = users[element++];
                    return <TypingUser key={user.id} guildId={guildId} user={user} />;
                })}
            </>
        );
    } catch (err) {
        logger.error("Failed to render typing users:", err);
    }

    return <>{children}</>;
}

export default definePlugin({
    name: "TypingTweaks",
    description: "Shows avatars and role colors in the typing indicator",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les avatars et les couleurs de rôle dans l'indicateur « en train d'écrire »",
            options: {
                showAvatars: "Afficher les avatars dans l'indicateur",
                showRoleColors: "Afficher les couleurs de rôle dans l'indicateur",
                alternativeFormatting: "Afficher un message plus utile quand plusieurs personnes écrivent"
            }
        }
    },
    settings,

    css: ".majic-typing-tweaks-user { cursor: pointer; } .majic-typing-tweaks-user [class*=\"wrapper\"] { display: inline-block; margin-right: 0.25em; vertical-align: -4px; }",

    patches: [
        {
            find: "#{intl::SEVERAL_USERS_TYPING_STRONG}",
            group: true,
            replacement: [
                {
                    match: /(?<="aria-hidden":!0,children:)\i/,
                    replace: "$self.renderTypingUsers({ users: arguments[0]?.typingUserObjects, guildId: arguments[0]?.channel?.guild_id, children: $& })"
                },
                {
                    match: /(?<=function \i\(\i\)\{)(?=[^}]+?\{channel:\i,isThreadCreation:\i=!1,\.\.\.\i\})/,
                    replace: "let typingUserObjects = $self.useTypingUsers(arguments[0]?.channel);"
                },
                {
                    match: /typingUsers:(\i)\?\[\]:\i,/,
                    replace: "$&typingUserObjects: $1 || typeof typingUserObjects === 'undefined' ? [] : typingUserObjects,"
                },
                {
                    match: /(&&\(\i=)\i\.\i\.format\(\i\.\i#{intl::SEVERAL_USERS_TYPING_STRONG},\{\}\)/,
                    replace: "$1$self.buildSeveralUsers({ users: arguments[0]?.typingUserObjects, count: arguments[0]?.typingUserObjects?.length - 2, guildId: arguments[0]?.channel?.guild_id })",
                    predicate: () => settings.store.alternativeFormatting
                }
            ]
        }
    ],

    useTypingUsers(channel: { id: string } | undefined): any[] {
        try {
            if (!channel) throw new Error("No channel");

            const typingUsers = useStateFromStores([Stores.TypingStore], () => Stores.TypingStore.getTypingUsers(channel.id));
            const myId = useStateFromStores([Stores.AuthenticationStore], () => Stores.AuthenticationStore.getId());

            return Object.keys(typingUsers)
                .filter(id => id && id !== myId && !isBlockedOrIgnored(id))
                .map(id => Stores.UserStore.getUser(id))
                .filter(user => user != null);
        } catch (err) {
            logger.error("Failed to get typing users:", err);
            return [];
        }
    },

    buildSeveralUsers,

    renderTypingUsers: withErrorBoundary("TypingTweaks", TypingUsers)
});
