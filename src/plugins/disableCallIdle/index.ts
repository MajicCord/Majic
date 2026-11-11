/*
 * Majic — DisableCallIdle plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "DisableCallIdle",
    description: "Stops getting kicked from a DM voice call after 3 minutes and being moved to an AFK voice channel",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Empêche d'être éjecté d'un appel vocal en MP après 3 minutes et d'être déplacé dans un salon AFK"
        }
    },

    patches: [
        {
            find: "this.idleTimeout.start(",
            replacement: {
                match: /this\.idleTimeout\.(start|stop)/g,
                replace: "$self.noop"
            }
        },
        {
            find: "handleIdleUpdate(){",
            replacement: {
                match: "handleIdleUpdate(){",
                replace: "handleIdleUpdate(){return;"
            }
        }
    ],

    noop() { }
});
