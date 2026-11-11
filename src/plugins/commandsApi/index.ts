/*
 * Majic — CommandsAPI core plugin
 */

import { _installCommands, _uninstallCommands } from "@api/commands";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "CommandsAPI",
    description: "Lets plugins add their own slash commands",
    authors: [{ name: "SnailyStudios" }],
    required: true,

    start: _installCommands,
    stop: _uninstallCommands
});
