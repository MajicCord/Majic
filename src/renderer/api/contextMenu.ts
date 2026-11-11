/*
 * Majic — context menu API
 */

import { Logger } from "@utils/logger";
import { React } from "@webpack/common";
import { search, wreq } from "@webpack";

const logger = new Logger("ContextMenu", "#ff79c6");

export type MenuChildren = Array<any>;
export type ContextMenuPatch = (children: MenuChildren, ...args: any[]) => void;
export type GlobalContextMenuPatch = (navId: string, children: MenuChildren, ...args: any[]) => void;

const patchesByNavId = new Map<string, Set<ContextMenuPatch>>();
const globalPatches = new Set<GlobalContextMenuPatch>();

export function addContextMenuPatch(navId: string | string[], patch: ContextMenuPatch) {
    for (const id of [navId].flat()) {
        if (!patchesByNavId.has(id)) patchesByNavId.set(id, new Set());
        patchesByNavId.get(id)!.add(patch);
    }
}

export function removeContextMenuPatch(navId: string | string[], patch: ContextMenuPatch) {
    for (const id of [navId].flat()) patchesByNavId.get(id)?.delete(patch);
}

export const addGlobalContextMenuPatch = (patch: GlobalContextMenuPatch) => void globalPatches.add(patch);
export const removeGlobalContextMenuPatch = (patch: GlobalContextMenuPatch) => void globalPatches.delete(patch);

const MENU_TYPES: Record<string, string> = {
    separator: "MenuSeparator",
    group: "MenuGroup",
    item: "MenuItem",
    customitem: "MenuItem",
    checkbox: "MenuCheckboxItem",
    radio: "MenuRadioItem",
    switch: "MenuSwitchItem",
    textinput: "MenuTextInput",
    control: "MenuControlItem",
    compositecontrol: "MenuControlItem"
};

export const Menu: Record<string, any> = {};

let menuResolved = false;

function resolveMenuComponents() {
    if (menuResolved) return Object.keys(Menu).length > 0;
    menuResolved = true;

    const [source] = Object.values(search("Menu API only allows Items")).map(String);
    if (!source) return false;

    const namespace = /\.type===([\w$]+)\.[\w$]+\)/.exec(source)?.[1];
    const moduleId = namespace && new RegExp(`[,;\\s]${namespace.replace("$", "\\$")}=[\\w$]+\\((\\d+)\\)`).exec(source)?.[1];
    if (!moduleId) {
        logger.error("Could not locate the menu components module");
        return false;
    }

    const components = wreq(moduleId);
    const typeChecks = new RegExp(`\\.type===${namespace.replace("$", "\\$")}\\.([\\w$]+)\\)(?:return [\\w$]+\\.push\\((?:[^{]*?)\\{type:"(\\w+)"|\\{let)`, "g");

    for (const [, key, type] of source.matchAll(typeChecks)) {
        const name = MENU_TYPES[type ?? "group"];
        if (name && !Menu[name] && components[key]) Menu[name] = components[key];
    }

    logger.info(`Menu components found: ${Object.keys(Menu).join(", ")}`);
    return true;
}

function cloneChildren(children: any): any {
    if (Array.isArray(children)) return children.map(cloneChildren);
    if (!React.isValidElement(children)) return children;

    const element = children as any;
    const clone = React.cloneElement(element);
    if (element.props?.children && (element.type !== Menu.MenuControlItem || element.props.control != null)) {
        clone.props.children = cloneChildren(element.props.children);
    }
    return clone;
}

export function _patchMenu(props: { navId: string; children: any; majicMenuArgs?: ArrayLike<unknown> }) {
    try {
        if (!resolveMenuComponents()) return props;

        const navPatches = patchesByNavId.get(props.navId);
        if (!navPatches?.size && !globalPatches.size) return props;

        const children = cloneChildren(props.children);
        const list: MenuChildren = Array.isArray(children) ? children : [children];
        const args = Array.from(props.majicMenuArgs ?? []);

        for (const patch of navPatches ?? []) {
            try {
                patch(list, ...args);
            } catch (err) {
                logger.error(`A patch for menu ${props.navId} failed`, err);
            }
        }
        for (const patch of globalPatches) {
            try {
                patch(props.navId, list, ...args);
            } catch (err) {
                logger.error("A global context menu patch failed", err);
            }
        }

        return { ...props, children: list };
    } catch (err) {
        logger.error("Context menu patching failed", err);
        return props;
    }
}

export function findGroupChildrenByChildId(id: string | string[], children: MenuChildren, matchSubstring = false): MenuChildren | null {
    const ids = [id].flat();
    const matches = (childId: unknown) =>
        typeof childId === "string" && ids.some(wanted => (matchSubstring ? childId.includes(wanted) : childId === wanted));

    for (const child of children) {
        if (child == null) continue;
        if (Array.isArray(child)) {
            const found = findGroupChildrenByChildId(id, child, matchSubstring);
            if (found) return found;
            continue;
        }
        if (matches(child.props?.id)) return children;

        const nested = child.props?.children;
        if (nested == null) continue;
        if (!Array.isArray(nested)) child.props.children = [nested];

        const found = findGroupChildrenByChildId(id, child.props.children, matchSubstring);
        if (found) return found;
    }
    return null;
}
