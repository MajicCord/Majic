/*
 * Majic — PauseInvitesForever plugin
 */

import { createStrings } from "@i18n";
import { getIntlMessage, hasGuildFeature } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { Endpoints, React, RestAPI, Stores } from "@webpack/common";

const s = createStrings({
    en: { pause: " Pause Indefinitely." },
    fr: { pause: " Suspendre indéfiniment." }
});

function showDisableInvites(guildId: string) {
    const guild = Stores.GuildStore.getGuild(guildId);
    if (!guild) return false;

    return !hasGuildFeature(guild, "INVITES_DISABLED") && Stores.PermissionStore.getGuildPermissionProps(guild).canManageRoles;
}

function disableInvites(guildId: string) {
    const guild = Stores.GuildStore.getGuild(guildId);
    const features = [...guild.features, "INVITES_DISABLED"];
    RestAPI.patch({
        url: Endpoints.GUILD(guildId),
        body: { features }
    });
}

function InvitesLabel({ guildId, setChecked }: { guildId: string; setChecked(checked: boolean): void }) {
    return (
        <div>
            {getIntlMessage("GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION")}
            {showDisableInvites(guildId) && (
                <a
                    role="button"
                    onClick={() => {
                        setChecked(true);
                        disableInvites(guildId);
                    }}
                >
                    {s("pause")}
                </a>
            )}
        </div>
    );
}

export default definePlugin({
    name: "PauseInvitesForever",
    description: "Brings back the option to pause server invites indefinitely",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Remet l'option pour suspendre indéfiniment les invitations d'un serveur"
        }
    },

    patches: [
        {
            find: "#{intl::GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION}",
            group: true,
            replacement: [
                {
                    match: /children:\i\.\i\.string\(\i\.\i#{intl::GUILD_INVITE_DISABLE_ACTION_SHEET_DESCRIPTION}\)/,
                    replace: "children: $self.renderInvitesLabel({guildId:arguments[0].guildId,setChecked})"
                },
                {
                    match: /\.INVITES_DISABLED\)(?=.+?#{intl::INVITES_PERMANENTLY_DISABLED_TIP}.+?checked:(\i)).+?\[\1,(\i)\]=\i.useState\(\i\)/,
                    replace: "$&,setChecked=$2"
                }
            ]
        }
    ],

    renderInvitesLabel: withErrorBoundary("PauseInvitesForever", InvitesLabel)
});
