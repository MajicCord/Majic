/*
 * Majic — context menu API
 */

import { Logger } from "@utils/logger";
import { React } from "@webpack/common";
import { filters, waitFor } from "@webpack";

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

export const Menu: Record<string, any> = {};

export function _registerMenuItem(name: string, component: any) {
    Object.defineProperty(component, "name", { value: name });
    Menu[name] = component;
}

waitFor(filters.componentByCode('path:["empty"]'), component => Menu.Menu = component);
waitFor(filters.componentByCode(".SLIDER", "renderValue"), component => Menu.MenuSliderControl = component);
waitFor(filters.componentByCode(".SEARCH)", ".focus()", "query:"), component => Menu.MenuSearchControl = component);

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
