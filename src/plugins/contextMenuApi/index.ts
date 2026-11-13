/*
 * Majic — ContextMenuAPI core plugin
 */

import { _patchMenu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "ContextMenuAPI",
    description: "Lets plugins add, remove and change items in Discord's context menus",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter, retirer et modifier des éléments des menus clic droit"
        }
    },
    required: true,

    patches: [
        {
            find: "Menu API only allows Items",
            replacement: {
                match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                replace: "$1=$self.patchMenu($1);"
            }
        },
        {
            find: "navId:",
            all: true,
            noWarn: true,
            replacement: {
                match: /navId:(?=.+?([,}].*?\)))/g,
                replace: (match: string, rest: string) => {
                    if (/}=.+/.test(rest)) return match;
                    return `majicMenuArgs:typeof arguments!=="undefined"?arguments:[],${match}`;
                }
            }
        }
    ],

    patchMenu: _patchMenu
});
