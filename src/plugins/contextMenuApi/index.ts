/*
 * Majic — ContextMenuAPI core plugin
 */

import { _patchMenu, _registerMenuItem } from "@api/contextMenu";
import { Logger } from "@utils/logger";
import { canonicalizeMatch } from "@utils/patches";
import { definePlugin } from "@utils/types";

const logger = new Logger("ContextMenuAPI", "#ff79c6");

const COMPONENT_NAMES: Record<string, string> = {
    radio: "MenuRadioItem",
    separator: "MenuSeparator",
    checkbox: "MenuCheckboxItem",
    groupstart: "MenuGroup",
    control: "MenuControlItem",
    compositecontrol: "MenuControlItem",
    item: "MenuItem",
    customitem: "MenuItem"
};

function registerMenuItems(code: string) {
    const typeCheck = canonicalizeMatch(/\(\i\.type===(\i\.\i)\)/g);
    const pushedType = /type:"(\w+)"/g;
    const calls: string[] = [];

    for (let check = typeCheck.exec(code); check; check = typeCheck.exec(code)) {
        pushedType.lastIndex = typeCheck.lastIndex;
        const name = COMPONENT_NAMES[pushedType.exec(code)?.[1] ?? ""];
        if (name) calls.push(`$self.registerMenuItem(${JSON.stringify(name)},${check[1]})`);
    }

    if (calls.length < 6) logger.warn(`Expected to register 6 menu components, only found ${calls.length}`);
    return calls.join(";") + ";";
}

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
            replacement: [
                {
                    match: /(?=let{navId:)(?<=function \i\((\i)\).+?)/,
                    replace: "$1=$self.patchMenu($1);"
                },
                {
                    match: /(?<=(\(\i\.type===(\i\.\i)\).{0,50}?navigable:.+Menu API).+?)}$/s,
                    replace: (_: string, menuApiCode: string) => `${registerMenuItems(menuApiCode)}}`
                }
            ]
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

    patchMenu: _patchMenu,
    registerMenuItem: _registerMenuItem
});
