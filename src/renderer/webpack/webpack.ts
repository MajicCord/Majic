/*
 * Majic — webpack module lookup
 */

import { makeLazy, proxyLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/lazyReact";
import { Logger } from "@utils/logger";
import { canonicalizeMatch } from "@utils/patches";

const logger = new Logger("Webpack", "#8be9fd");

export type ModuleFactory = (this: unknown, module: any, exports: any, require: WebpackRequire) => void;
export interface WebpackRequire {
    (id: PropertyKey): any;
    c: Record<PropertyKey, { id: PropertyKey; loaded: boolean; exports: any }>;
    m: Record<PropertyKey, ModuleFactory>;
    e(chunkId: PropertyKey): Promise<unknown>;
    u(chunkId: PropertyKey): string;
    p: string;
    f: Partial<Record<string, (...args: any[]) => unknown>>;
}

export type FilterFn = (value: any) => boolean;
export type PropsFilter = string[];
export type CodeFilter = Array<string | RegExp>;
export type CallbackFn = (exports: any, id: PropertyKey) => void;

export let wreq: WebpackRequire;
export let cache: WebpackRequire["c"];

let resolveReady!: () => void;
export const onceReady = new Promise<void>(resolve => resolveReady = resolve);
export const _resolveReady = () => resolveReady();

export const waitForSubscriptions = new Map<FilterFn, CallbackFn>();
export const factoryListeners = new Set<(factory: ModuleFactory, id: PropertyKey) => void>();

export interface LazySearch {
    method: string;
    args: unknown[];
    test(): unknown;
}

export const lazyWebpackSearchHistory: LazySearch[] = [];

function recordSearch(method: string, args: unknown[], test: () => unknown) {
    if (IS_REPORTER || IS_DEV) lazyWebpackSearchHistory.push({ method, args, test });
}
export const moduleListeners = new Set<CallbackFn>();

export function _initWebpack(require: WebpackRequire) {
    wreq = require;
    cache = require.c;
    Reflect.defineProperty(require.c, Symbol.toStringTag, { value: "ModuleCache", configurable: true, writable: true, enumerable: false });
}

export function codeMatches(code: string, filter: CodeFilter) {
    return filter.every(part => {
        if (typeof part === "string") return code.includes(part);
        part.lastIndex = 0;
        return part.test(code);
    });
}

const escapeForRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const classNameRegex = (name: string) => new RegExp(`(?:^|\\s)${escapeForRegex(name)}(?:_\\S*)?(?:$|\\s)`);

function unwrapComponent(value: any): any[] {
    const layers = [];
    for (let layer = value; layer != null; layer = layer.$$typeof ? (layer.type ?? layer.render) : undefined) {
        layers.push(layer);
        if (!layer.$$typeof) break;
    }
    return layers;
}

export const filters = {
    byProps: (...props: PropsFilter): FilterFn => value => props.every(prop => value[prop] !== undefined),

    byCode: (...code: CodeFilter): FilterFn => {
        const parsed = code.map(canonicalizeMatch);
        return value => typeof value === "function" && codeMatches(Function.prototype.toString.call(value), parsed);
    },

    byStoreName: (name: string): FilterFn => value => value.constructor?.displayName === name,

    componentByCode: (...code: CodeFilter): FilterFn => {
        const byCode = filters.byCode(...code);
        return value => unwrapComponent(value).some(byCode);
    },

    byClassNames: (...classes: string[]): FilterFn => {
        const patterns = classes.map(classNameRegex);
        return value => {
            if (typeof value !== "object") return false;
            const strings = Object.values(value).filter((v): v is string => typeof v === "string");
            return patterns.every(pattern => strings.some(s => pattern.test(s)));
        };
    }
};

const CATCH_ALL_PROBE = Symbol.for("majic.catchAllProbe").description!;
const TypedArray = Object.getPrototypeOf(Uint8Array);

function isUnsafeExport(value: any) {
    if (value == null || value === window || value === document || value === document.documentElement) return true;
    if (value instanceof TypedArray) return true;

    const tag = value[Symbol.toStringTag];
    if (tag === "IntlMessagesProxy" || tag === "DOMTokenList") return true;

    if (value[CATCH_ALL_PROBE] !== undefined) {
        Reflect.deleteProperty(value, CATCH_ALL_PROBE);
        return true;
    }
    return false;
}

function hide(target: object, key: PropertyKey) {
    const descriptor = Object.getOwnPropertyDescriptor(target, key);
    if (descriptor?.enumerable) Object.defineProperty(target, key, { ...descriptor, enumerable: false });
}

export function quarantineUnsafeExports(requireCache: WebpackRequire["c"], exports: any, id: PropertyKey) {
    try {
        if (isUnsafeExport(exports)) {
            hide(requireCache, id);
            return true;
        }
        if (typeof exports !== "object") return false;

        let onlyUnsafe = true;
        for (const key in exports) {
            let value: unknown;
            try {
                value = exports[key];
            } catch {
                continue;
            }
            if (isUnsafeExport(value)) hide(exports, key);
            else onlyUnsafe = false;
        }
        return onlyUnsafe;
    } catch (err) {
        logger.error(`Failed to inspect exports of module ${String(id)}`, err);
        return false;
    }
}

function* exportCandidates(exports: any, topLevelOnly: boolean): Generator<any> {
    yield exports;
    if (topLevelOnly || typeof exports !== "object") return;

    for (const key in exports) {
        let value: unknown;
        try {
            value = exports[key];
        } catch {
            continue;
        }
        if (value) yield value;
    }
}

function* loadedModules(): Generator<[id: string, exports: any]> {
    for (const id in cache) {
        const exports = cache[id]?.exports;
        if (exports != null) yield [id, exports];
    }
}

export function matchExports(exports: any, filter: FilterFn, topLevelOnly = false) {
    for (const candidate of exportCandidates(exports, topLevelOnly)) {
        try {
            if (filter(candidate)) return candidate;
        } catch { }
    }
    return undefined;
}

function reportMissing(method: string, args: unknown[]) {
    logger.error(new Error(`webpack.${method} found no module`), ...args);
}

interface FindOptions {
    topLevelOnly?: boolean;
    isIndirect?: boolean;
    isWaitFor?: boolean;
}

export function findExportLocation(filter: FilterFn): { exports: any; key: string } | null {
    for (const [, exports] of loadedModules()) {
        if (typeof exports !== "object") continue;
        for (const key in exports) {
            try {
                if (exports[key] != null && filter(exports[key])) return { exports, key };
            } catch { }
        }
    }
    return null;
}

export function replaceExport(filter: FilterFn, replace: (original: any) => any): (() => void) | null {
    const location = findExportLocation(filter);
    if (!location) return null;

    const { exports, key } = location;
    const descriptor = Object.getOwnPropertyDescriptor(exports, key);
    if (!descriptor?.configurable) {
        logger.error(`Export ${key} is not configurable, cannot replace it`);
        return null;
    }

    const original = exports[key];
    Object.defineProperty(exports, key, { value: replace(original), configurable: true, enumerable: true, writable: true });
    return () => Object.defineProperty(exports, key, descriptor);
}

export function findWithId(filter: FilterFn, { topLevelOnly = false }: FindOptions = {}): [any, string | null] {
    for (const [id, exports] of loadedModules()) {
        const match = matchExports(exports, filter, topLevelOnly);
        if (match !== undefined) return [match, id];
    }
    return [null, null];
}

export function find(filter: FilterFn, options: FindOptions & { isWaitFor: true }): [any, string | null];
export function find(filter: FilterFn, options?: FindOptions): any;
export function find(filter: FilterFn, { isIndirect = false, isWaitFor = false, topLevelOnly = false }: FindOptions = {}) {
    if (typeof filter !== "function") throw new Error(`Invalid filter, expected a function but got ${typeof filter}`);

    const [match, id] = findWithId(filter, { topLevelOnly });
    if (match == null && !isIndirect) reportMissing("find", [filter]);
    return isWaitFor ? [match, id] : match;
}

export function findAll(filter: FilterFn, { topLevelOnly = false }: FindOptions = {}) {
    const results: any[] = [];
    for (const [, exports] of loadedModules()) {
        for (const candidate of exportCandidates(exports, topLevelOnly)) {
            try {
                if (filter(candidate)) results.push(candidate);
            } catch { }
        }
    }
    return results;
}

export function findBulk(...filterFns: FilterFn[]) {
    const results: any[] = new Array(filterFns.length).fill(null);
    const remaining = new Set(filterFns.keys());

    for (const [, exports] of loadedModules()) {
        if (!remaining.size) break;
        for (const index of remaining) {
            const match = matchExports(exports, filterFns[index]);
            if (match === undefined) continue;
            results[index] = match;
            remaining.delete(index);
        }
    }

    if (remaining.size) logger.warn(`findBulk: ${remaining.size} of ${filterFns.length} filters found no module`);
    return results;
}

function findOrReport(method: string, filter: FilterFn, args: unknown[], options: FindOptions = {}) {
    const match = find(filter, { ...options, isIndirect: true });
    if (match == null) reportMissing(method, args);
    return match;
}

export const findLazy = (filter: FilterFn): any => {
    recordSearch("find", [filter], () => find(filter, { isIndirect: true }));
    return proxyLazy(() => find(filter));
};

export const findByProps = (...props: PropsFilter) => findOrReport("findByProps", filters.byProps(...props), props);
export const findByPropsLazy = (...props: PropsFilter): any => {
    recordSearch("findByProps", props, () => find(filters.byProps(...props), { isIndirect: true }));
    return proxyLazy(() => findByProps(...props));
};

export const findByCode = (...code: CodeFilter) => findOrReport("findByCode", filters.byCode(...code), code);
export const findByCodeLazy = (...code: CodeFilter): any => {
    recordSearch("findByCode", code, () => find(filters.byCode(...code), { isIndirect: true }));
    return proxyLazy(() => findByCode(...code));
};

export const findComponentByCode = (...code: CodeFilter) => findOrReport("findComponentByCode", filters.componentByCode(...code), code);
export const findComponentByCodeLazy = <P extends object = any>(...code: CodeFilter) => {
    recordSearch("findComponentByCode", code, () => find(filters.componentByCode(...code), { isIndirect: true }));
    return LazyComponent<P>(() => findComponentByCode(...code));
};
export const findComponentLazy = <P extends object = any>(filter: FilterFn) => {
    recordSearch("findComponent", [filter], () => find(filter, { isIndirect: true }));
    return LazyComponent<P>(() => findOrReport("findComponent", filter, [filter]));
};
export const findExportedComponentLazy = <P extends object = any>(...props: PropsFilter) => {
    recordSearch("findExportedComponent", props, () => find(filters.byProps(...props), { isIndirect: true })?.[props[0]]);
    return LazyComponent<P>(() => findOrReport("findExportedComponent", filters.byProps(...props), props)?.[props[0]]);
};

export const proxyLazyWebpack = <T = any>(factory: () => T, maxTries?: number) => {
    recordSearch("proxyLazyWebpack", [factory], factory);
    return proxyLazy<T>(factory, maxTries);
};
export const LazyComponentWebpack = <P extends object = any>(factory: () => any, maxTries?: number) => {
    recordSearch("LazyComponentWebpack", [factory], factory);
    return LazyComponent<P>(factory, maxTries);
};

const storeCache = new Map<string, any>();

function indexFluxStores() {
    const Flux = find(filters.byProps("connectStores"), { isIndirect: true });
    for (const store of Flux?.Store?.getAll?.() ?? []) storeCache.set(store.getName(), store);
}

export function findStore(name: string) {
    if (!storeCache.has(name)) indexFluxStores();
    if (!storeCache.has(name)) {
        const store = find(filters.byStoreName(name), { isIndirect: true });
        if (store) storeCache.set(name, store);
    }

    const store = storeCache.get(name);
    if (!store) reportMissing("findStore", [name]);
    return store ?? null;
}

export const findStoreLazy = (name: string): any => {
    recordSearch("findStore", [name], () => find(filters.byStoreName(name), { isIndirect: true }));
    return proxyLazy(() => findStore(name));
};

export function mapMangledCssClasses<S extends string>(module: object, classes: readonly S[]) {
    const strings = Object.values(module).filter((v): v is string => typeof v === "string");
    return Object.fromEntries(classes.map(cls => {
        const value = strings.find(s => classNameRegex(cls).test(s));
        if (!value) throw new Error(`mapMangledCssClasses: ${cls} not found in module`);
        return [cls, value];
    })) as Record<S, string>;
}

export function findCssClasses<S extends string>(...classes: S[]): Record<S, string> {
    const module = findOrReport("findCssClasses", filters.byClassNames(...classes), classes, { topLevelOnly: true });
    return module ? mapMangledCssClasses(module, classes) : {} as Record<S, string>;
}

export const findCssClassesLazy = <S extends string>(...classes: S[]) => {
    recordSearch("findCssClasses", classes, () => find(filters.byClassNames(...classes), { isIndirect: true, topLevelOnly: true }));
    return proxyLazy(() => findCssClasses(...classes));
};

export function search(...code: CodeFilter): Record<string, ModuleFactory> {
    if (!wreq) return {};
    const parsed = code.map(canonicalizeMatch);
    return Object.fromEntries(Object.entries(wreq.m).filter(([, factory]) => codeMatches(String(factory), parsed)));
}

export function findModuleId(...code: CodeFilter) {
    const [id] = Object.keys(search(...code));
    if (id == null) logger.warn("findModuleId: no module matches", code);
    return id ?? null;
}

export function findModuleFactory(...code: CodeFilter) {
    const id = findModuleId(...code);
    return id == null ? null : wreq.m[id];
}

function allKeys(object: object, includeHidden: boolean) {
    const keys = new Set<string>();
    for (let current: object | null = object; current; current = Object.getPrototypeOf(current)) {
        for (const key of includeHidden ? Object.getOwnPropertyNames(current) : Object.keys(current)) {
            if (key !== "__esModule") keys.add(key);
        }
    }
    return keys;
}

export function mapMangledModule<S extends string>(code: string | RegExp | CodeFilter, mappers: Record<S, FilterFn>, includeHidden = false) {
    const mapped = {} as Record<S, any>;
    const id = findModuleId(...(Array.isArray(code) ? code : [code]));
    if (id == null) return mapped;

    const module = wreq(id);
    const unmapped = new Set(Object.keys(mappers) as S[]);
    for (const key of allKeys(module, includeHidden)) {
        const value = module[key];
        const name = [...unmapped].find(n => mappers[n](value));
        if (!name) continue;
        mapped[name] = value;
        unmapped.delete(name);
    }
    return mapped;
}

export const mapMangledModuleLazy = <S extends string>(code: string | RegExp | CodeFilter, mappers: Record<S, FilterFn>, includeHidden = false) => {
    recordSearch("mapMangledModule", [code, mappers], () => {
        const mapped = mapMangledModule(code, mappers, includeHidden);
        const missing = Object.keys(mappers).filter(key => mapped[key as S] == null);
        if (missing.length) throw new Error(`missing mappings: ${missing.join(", ")}`);
        return mapped;
    });
    return proxyLazy(() => mapMangledModule(code, mappers, includeHidden));
};

export const DefaultExtractAndLoadChunksRegex = /(?:(?:Promise\.all\(\[)?((?:\i\.e\("?[^)]+?"?\),?)+?)(?:\]\))?|Promise\.resolve\(\))\.then\(\i\.bind\(\i,"?([^)]+?)"?(?:,[^)]+?)?\)\)/;
const ChunkIdsRegex = /\((?:"([^"]+?)"|([\de]+?))\)/g;

export function parseChunkIds(rawChunkIds: string): Array<string | number> {
    return Array.from(rawChunkIds.matchAll(ChunkIdsRegex), m => m[1] ?? Number(m[2]));
}

export async function extractAndLoadChunks(code: CodeFilter, matcher: RegExp = DefaultExtractAndLoadChunksRegex) {
    const factory = findModuleFactory(...code);
    if (!factory) {
        logger.warn("extractAndLoadChunks: couldn't find module factory", code, matcher);
        return false;
    }

    const match = String(factory).match(canonicalizeMatch(matcher));
    if (!match) {
        logger.warn("extractAndLoadChunks: couldn't find chunk loading in module factory code", code, matcher);
        return false;
    }

    const [, rawChunkIds, entryPointId] = match;
    if (entryPointId == null) {
        logger.warn("extractAndLoadChunks: matcher didn't return the entry point id", code, matcher);
        return false;
    }

    const numEntryPoint = Number(entryPointId);
    const entryPoint = Number.isNaN(numEntryPoint) ? entryPointId : String(numEntryPoint);

    if (rawChunkIds) await Promise.all(parseChunkIds(rawChunkIds).map(id => wreq.e(id)));

    if (wreq.m[entryPoint] == null) {
        logger.warn("extractAndLoadChunks: entry point is not loaded, a chunk may have failed to load", code, matcher);
        return false;
    }

    wreq(entryPoint);
    return true;
}

export const extractAndLoadChunksLazy = (code: CodeFilter, entryPointMatcher?: RegExp) => {
    recordSearch("extractAndLoadChunks", [code, entryPointMatcher], async () => (await extractAndLoadChunks(code, entryPointMatcher)) || null);
    return makeLazy(() => extractAndLoadChunks(code, entryPointMatcher));
};

export function waitFor(filter: string | PropsFilter | FilterFn, callback: CallbackFn) {
    if (typeof filter === "string") filter = filters.byProps(filter);
    else if (Array.isArray(filter)) filter = filters.byProps(...filter);
    else if (typeof filter !== "function") throw new Error(`Invalid filter, expected a string, string[] or function but got ${typeof filter}`);
    const fn = filter;

    if (cache != null) {
        const [match, id] = find(fn, { isIndirect: true, isWaitFor: true });
        if (match) return void callback(match, id!);
    }
    waitForSubscriptions.set(fn, callback);
}

export function requireModuleByCode(...code: CodeFilter) {
    const [id] = Object.keys(search(...code));
    return id == null ? null : wreq(id);
}

export async function dumpModule(moduleId: PropertyKey) {
    const factory = wreq.m[moduleId as string];
    if (!factory) throw new Error(`Module ${String(moduleId)} is not loaded`);

    const file = await MajicNative.writeModuleDump(String(moduleId), String(factory));
    logger.info(`Module ${String(moduleId)} written to ${file}`);
    return file;
}

export function extract(moduleId: PropertyKey) {
    const factory = wreq.m[moduleId as string];
    if (!factory) return null;

    const source = String(factory);
    const body = source.startsWith("(") ? source : "function" + source.slice(source.indexOf("("));
    return (0, eval)(`0,${body}\n//# sourceURL=MajicExtracted/WebpackModule${String(moduleId)}`) as ModuleFactory;
}
