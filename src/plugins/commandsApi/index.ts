/*
 * Majic — CommandsAPI core plugin
 */

import { _handleCommand, _initCommands } from "@api/commands";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "CommandsAPI",
    description: "Lets plugins add their own slash commands",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter leurs propres commandes slash"
        }
    },
    required: true,

    patches: [
        {
            find: ',"tableflip","unflip"',
            replacement: {
                match: /(?<=\w=)(\w)(\.filter\(.{0,60}tableflip)/,
                replace: "$self.init($1)$2"
            }
        },
        {
            find: "Unexpected value for option",
            replacement: {
                match: /,(\i)\.execute\((\i),(\i)\)/,
                replace: ",$self.handle($1,$2,$3)"
            }
        },
        {
            find: "#{intl::COMMANDS_OPTIONAL_COUNT}",
            replacement: {
                match: /children:(?=\i\?\?\i\?\.name)(?<=command:(\i),.+?)/,
                replace: "children:$1.plugin??"
            }
        }
    ],

    init: _initCommands,
    handle: _handleCommand
});
