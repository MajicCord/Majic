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
                match: /function (\i)\((\i)\){let{navId:/,
                replace: "function $1($2){$2=$self.patchMenu($2);let{navId:"
            }
        },
        {
            find: 'navId:"',
            all: true,
            noWarn: true,
            replacement: {
                match: /(?<=[{,])navId:(?="[\w-]+")/g,
                replace: 'majicMenuArgs:typeof arguments!=="undefined"?arguments:[],navId:'
            }
        }
    ],

    patchMenu: _patchMenu
});
