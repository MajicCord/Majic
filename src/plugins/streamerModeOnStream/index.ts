/*
 * Majic — StreamerModeOnStream plugin
 */

import { definePlugin } from "@utils/types";
import { FluxDispatcher, Stores } from "@webpack/common";

function setStreamerMode(streamKey: string, enabled: boolean) {
    const myId = Stores.UserStore?.getCurrentUser()?.id;
    if (!myId || !streamKey?.endsWith(myId)) return;
    FluxDispatcher.dispatch({ type: "STREAMER_MODE_UPDATE", key: "enabled", value: enabled });
}

export default definePlugin({
    name: "StreamerModeOnStream",
    description: "Turns streamer mode on while you are streaming, and off when you stop",
    authors: [{ name: "SnailyStudios" }],

    flux: {
        STREAM_CREATE: ({ streamKey }: { streamKey: string }) => setStreamerMode(streamKey, true),
        STREAM_DELETE: ({ streamKey }: { streamKey: string }) => setStreamerMode(streamKey, false)
    }
});
