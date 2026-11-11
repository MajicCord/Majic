/*
 * Majic — webpack module lookup
 */

import { proxyLazy } from "@utils/lazy";
import { moduleListeners, onWreqReady, wreq } from "./patchWebpack";

export { wreq, onWreqReady } from "./patchWebpack";

export type Filter = (exports: any) => boolean;

export const filters = {
    byProps: (...props: string[]): Filter => m => props.every(p => m?.[p] !== undefined),
    byCode: (...code: string[]): Filter => m => {
        if (typeof m !== "function") return false;
        const src = Function.prototype.toString.call(m);
        return code.every(c => src.includes(c));
    },
    byDisplayName: (name: string): Filter => m => m?.displayName === name
};

function testExports(exports: any, filter: Filter): any {
    if (exports == null) return undefined;
    try {
        if (filter(exports)) return exports;
        if (typeof exports === "object") {
            for (const key in exports) {
                const v = exports[key];
                if (v != null && filter(v)) return v;
            }
        }
    } catch {
    }
    return undefined;
}

export function find(filter: Filter): any {
    if (!wreq) return undefined;
    for (const id in wreq.c) {
        const found = testExports(wreq.c[id]?.exports, filter);
        if (found) return found;
    }
    return undefined;
}

export const findByProps = (...props: string[]) => find(filters.byProps(...props));
export const findByCode = (...code: string[]) => find(filters.byCode(...code));

export const findByPropsLazy = (...props: string[]): any =>
    proxyLazy(() => findByProps(...props), () => `Webpack module not found: findByProps(${props.join(", ")})`);
export const findByCodeLazy = (...code: string[]): any =>
    proxyLazy(() => findByCode(...code), () => `Webpack module not found: findByCode(${code.join(", ")})`);

export function waitFor(filter: Filter, cb: (exports: any) => void) {
    onWreqReady(() => {
        const existing = find(filter);
        if (existing) return cb(existing);

        const listener = (exports: any) => {
            const found = testExports(exports, filter);
            if (found) {
                moduleListeners.delete(listener);
                cb(found);
            }
        };
        moduleListeners.add(listener);
    });
}

export const findLazy = (filter: Filter) => new Promise<any>(resolve => waitFor(filter, resolve));
