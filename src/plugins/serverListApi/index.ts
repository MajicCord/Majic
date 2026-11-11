/*
 * Majic — ServerListAPI core plugin
 */

import { _renderServerListElements } from "@api/serverList";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ServerListAPI",
    description: "Lets plugins add elements to the server list",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des éléments à la liste des serveurs"
        }
    },
    required: true,

    patches: [
        {
            find: "#{intl::DISCODO_DISABLED}",
            replacement: {
                match: /(?<=return)(\(0,\i\.jsxs?\)\("div",\{className:\i\.\i,"data-guilds-bar-home":!0[^]*?)(?=\}function \i\(\))/,
                replace: '[$1].concat($self.render("above"))'
            }
        },
        {
            find: ".setGuildsTree(",
            replacement: {
                match: /(?<=#{intl::SERVERS}\),gap:"xs",children:)(\i\.map\([^]{0,60}?\))(?=\})/,
                replace: '$self.render("in").concat($1)'
            }
        }
    ],

    render: _renderServerListElements
});
