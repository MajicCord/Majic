/*
 * Majic — MessageEventsAPI core plugin
 */

import { _installMessageEvents, _uninstallMessageEvents } from "@api/messageEvents";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "MessageEventsAPI",
    description: "Lets plugins change or cancel messages before they are sent or edited, and react to message clicks",
    authors: [{ name: "SnailyStudios" }],
    required: true,

    start: _installMessageEvents,
    stop: _uninstallMessageEvents
});
