/*
 * Majic — MentionAvatars plugin
 */

import { definePluginSettings } from "@api/settings";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, React, Stores, useState } from "@webpack/common";

const settings = definePluginSettings({
    showAtSymbol: {
        type: OptionType.BOOLEAN,
        description: "Show the @ symbol on user mentions",
        default: true
    }
});

const getUsernameString = (username: string) => settings.store.showAtSymbol ? `@${username}` : username;

function DefaultRoleIcon() {
    return (
        <span className="majic-mentionAvatars-icon majic-mentionAvatars-role-icon">
            <DiscordIcon name="GroupIcon" size={16} />
        </span>
    );
}

function Username({ user, username }: { user: any; username: string }) {
    const [isHovering, setIsHovering] = useState(false);

    if (!user) return <>{getUsernameString(username)}</>;

    return (
        <span onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
            <img
                src={user.getAvatarURL(Stores.SelectedGuildStore.getGuildId(), 16, isHovering)}
                className="majic-mentionAvatars-icon"
                style={{ borderRadius: "50%" }}
            />
            {getUsernameString(username)}
        </span>
    );
}

function RoleIcon({ roleId, guildId }: { roleId: string; guildId: string }) {
    if (!roleId) return null;

    const role = Stores.GuildRoleStore.getRole(guildId, roleId);
    if (!role?.icon) return <DefaultRoleIcon />;

    return (
        <img
            className="majic-mentionAvatars-icon majic-mentionAvatars-role-icon"
            src={`${location.protocol}//${(window as any).GLOBAL_ENV.CDN_HOST}/role-icons/${roleId}/${role.icon}.webp?size=24&quality=lossless`}
        />
    );
}

const renderUsername = withErrorBoundary("MentionAvatars", Username);

export default definePlugin({
    name: "MentionAvatars",
    description: "Shows user avatars and role icons inside mentions",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les avatars et les icônes de rôle dans les mentions",
            options: {
                showAtSymbol: "Afficher le symbole @ dans les mentions d'utilisateurs"
            }
        }
    },
    settings,

    css: [
        ".majic-mentionAvatars-icon { vertical-align: middle; width: 1em !important; height: 1em; margin: 0 4px 0.2rem 2px; box-sizing: border-box; display: inline-flex; }",
        ".majic-mentionAvatars-icon svg { width: 1em; height: 1em; }",
        ".majic-mentionAvatars-role-icon { margin: 0 2px 0.2rem 4px; }",
        ".majic-gp-owner .majic-mentionAvatars-icon { display: none; }"
    ].join(" "),

    patches: [
        {
            find: ".USER_MENTION)",
            replacement: {
                match: /children:`@\$\{(\i\?\?\i)\}`(?<=\.useName\((\i)\).+?)/,
                replace: "children:$self.renderUsername({username:$1,user:$2})"
            }
        },
        {
            find: ".ROLE_MENTION)",
            replacement: {
                match: /children:\[\i&&.{0,100}className:\i.\i,background:!1,.{0,50}?,\i(?=\])/,
                replace: "$&,$self.renderRoleIcon(arguments[0])"
            }
        },
        {
            find: '"text":"locked"',
            replacement: {
                match: /null==\i\?`<@\$\{(\i)\}>`:`@\$\{(\i)\}`/,
                replace: "$self.renderUsernameWithId({id:$1,username:$2})"
            }
        }
    ],

    renderUsernameWithId({ id, username }: { id: string; username: string }) {
        try {
            const user = Stores.UserStore.getUser(id);
            return renderUsername({ user, username });
        } catch { }

        return getUsernameString(username);
    },

    renderUsername,

    renderRoleIcon: withErrorBoundary("MentionAvatars", RoleIcon)
});
