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
                match: /(?<=#{intl::DISCODO_DISABLED}.+?return)(\(.{0,150}?tutorialId:"friends-list".+?}\))(?=}function)/,
                replace: '[$1].concat($self.render("above"))'
            }
        },
        {
            find: ".setGuildsTree(",
            replacement: {
                match: /(?<=#{intl::SERVERS}\),gap:"xs",children:)\i\.map\(.{0,50}\.length\)/,
                replace: '$self.render("in").concat($&)'
            }
        }
    ],

    render: _renderServerListElements
});
