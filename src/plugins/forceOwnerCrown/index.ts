/*
 * Majic — ForceOwnerCrown plugin
 */

import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";

export default definePlugin({
    name: "ForceOwnerCrown",
    description: "Always shows the owner crown next to usernames, even in large servers",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche toujours la couronne du propriétaire à côté des pseudos, même dans les grands serveurs"
        }
    },

    patches: [
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /(?<=decorators:.{0,200}?isOwner:)\i/,
                replace: "$self.isGuildOwner(arguments[0])"
            }
        }
    ],

    isGuildOwner(props: { user?: { id: string }; channel?: { type: number; guild_id?: string }; isOwner: boolean; guildId?: string }) {
        if (!props?.user?.id) return props.isOwner;
        if (props.channel?.type === 3) return props.isOwner;

        const guildId = props.guildId ?? props.channel?.guild_id;
        return Stores.GuildStore.getGuild(guildId)?.ownerId === props.user.id;
    }
});
