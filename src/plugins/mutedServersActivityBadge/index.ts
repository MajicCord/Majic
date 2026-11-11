/*
 * Majic — MutedServersActivityBadge plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MutedServersActivityBadge",
    description: "Keeps the server activity badge visible even when the server is muted",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Garde le badge d'activité des serveurs visible même quand le serveur est en sourdine"
        }
    },

    patches: [
        {
            find: '"GuildMediaStateStore"',
            replacement: {
                match: /=\i\.\i\.isMuted\(\i\)/,
                replace: "=false"
            }
        }
    ]
});
