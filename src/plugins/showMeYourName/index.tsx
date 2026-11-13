/*
 * Majic — ShowMeYourName plugin
 */

import { definePluginSettings } from "@api/settings";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { React, Stores } from "@webpack/common";

interface UsernameProps {
    author: { nick: string; authorId: string };
    channel: { isPrivate(): boolean };
    message: { author: { username: string; globalName?: string } };
    withMentionPrefix?: boolean;
    isRepliedMessage: boolean;
    userOverride?: { username: string; globalName?: string };
}

const settings = definePluginSettings({
    mode: {
        type: OptionType.SELECT,
        description: "How to show usernames and nicknames",
        options: [
            { label: "Username then nickname", value: "user-nick", default: true },
            { label: "Nickname then username", value: "nick-user" },
            { label: "Username only", value: "user" },
            { label: "Nickname only", value: "nick" }
        ]
    },
    friendNicknames: {
        type: OptionType.SELECT,
        description: "When to use your friend nicknames instead of server nicknames",
        options: [
            { label: "Only in direct messages", value: "dms", default: true },
            { label: "Always prefer friend nicknames", value: "always" },
            { label: "Only when there is no server nickname", value: "fallback" }
        ]
    },
    displayNames: {
        type: OptionType.BOOLEAN,
        description: "Use display names instead of usernames",
        default: false
    },
    inReplies: {
        type: OptionType.BOOLEAN,
        description: "Also apply to reply previews",
        default: false
    }
});

function Username(props: UsernameProps) {
    try {
        return renderName(props);
    } catch {
        return <>{props.author?.nick}</>;
    }
}

function renderName({ author, channel, message, isRepliedMessage, withMentionPrefix, userOverride }: UsernameProps) {
    const { mode, friendNicknames, displayNames, inReplies } = settings.store;
    const user = userOverride ?? message.author;

    let username = Stores.StreamerModeStore?.enabled ? `${user.username[0]}…` : user.username;
    if (displayNames) username = user.globalName || username;

    let nick = author.nick;
    const friendNickname = Stores.RelationshipStore?.getNickname(author.authorId);
    if (friendNickname) {
        const useFriendNickname = friendNicknames === "always"
            || (friendNicknames === "dms" && channel.isPrivate())
            || (friendNicknames === "fallback" && !nick);
        if (useFriendNickname) nick = friendNickname;
    }

    const prefix = withMentionPrefix ? "@" : "";
    if ((isRepliedMessage && !inReplies) || (username.toLowerCase() === nick.toLowerCase() && mode !== "user")) return <>{prefix}{nick}</>;
    if (mode === "user-nick") return <>{prefix}{username} <span className="majic-smyn-suffix">{nick}</span></>;
    if (mode === "nick-user") return <>{prefix}{nick} <span className="majic-smyn-suffix">{username}</span></>;
    if (mode === "nick") return <>{prefix}{nick}</>;
    return <>{prefix}{username}</>;
}

export default definePlugin({
    name: "ShowMeYourName",
    description: "Shows usernames next to nicknames in chat, or instead of them",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les noms d'utilisateur à côté des pseudos dans le chat, ou à leur place",
            options: {
                mode: "Comment afficher les noms d'utilisateur et les pseudos",
                friendNicknames: "Quand utiliser tes surnoms d'amis à la place des pseudos de serveur",
                displayNames: "Utiliser les noms d'affichage au lieu des noms d'utilisateur",
                inReplies: "Appliquer aussi aux aperçus de réponse"
            }
        }
    },
    settings,

    css: `
.majic-smyn-suffix { color: var(--text-muted); -webkit-text-fill-color: initial; isolation: isolate; }
.majic-smyn-suffix::before { content: "("; }
.majic-smyn-suffix::after { content: ")"; }
`,

    patches: [
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /(?<=onContextMenu:\i,children:)\i\?(?=.{0,100}?user[Nn]ame:)/,
                replace: "$self.renderUsername(arguments[0]),_majicOldChildren:$&"
            }
        }
    ],

    renderUsername: withErrorBoundary("ShowMeYourName", Username)
});
