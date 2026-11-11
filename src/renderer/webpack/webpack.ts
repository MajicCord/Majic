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
export const moduleListeners = new Set<CallbackFn>();

export function _initWebpack(require: WebpackRequire) {
    wreq = require;
    cache = require.c;
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
    silent?: boolean;
}

export function findWithId(filter: FilterFn, { topLevelOnly = false }: FindOptions = {}): [any, string | null] {
    for (const [id, exports] of loadedModules()) {
        const match = matchExports(exports, filter, topLevelOnly);
        if (match !== undefined) return [match, id];
    }
    return [null, null];
}

export function find(filter: FilterFn, options: FindOptions = {}) {
    const [match] = findWithId(filter, options);
    if (match == null && !options.silent) reportMissing("find", [filter]);
    return match;
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
    const match = find(filter, { ...options, silent: true });
    if (match == null) reportMissing(method, args);
    return match;
}

export const findLazy = (filter: FilterFn): any => proxyLazy(() => find(filter));

export const findByProps = (...props: PropsFilter) => findOrReport("findByProps", filters.byProps(...props), props);
export const findByPropsLazy = (...props: PropsFilter): any => proxyLazy(() => findByProps(...props));

export const findByCode = (...code: CodeFilter) => findOrReport("findByCode", filters.byCode(...code), code);
export const findByCodeLazy = (...code: CodeFilter): any => proxyLazy(() => findByCode(...code));

export const findComponentByCode = (...code: CodeFilter) => findOrReport("findComponentByCode", filters.componentByCode(...code), code);
export const findComponentByCodeLazy = <P extends object = any>(...code: CodeFilter) => LazyComponent<P>(() => findComponentByCode(...code));
export const findComponentLazy = <P extends object = any>(filter: FilterFn) => LazyComponent<P>(() => findOrReport("findComponent", filter, [filter]));
export const findExportedComponentLazy = <P extends object = any>(...props: PropsFilter) =>
    LazyComponent<P>(() => findOrReport("findExportedComponent", filters.byProps(...props), props)?.[props[0]]);

export const proxyLazyWebpack = <T = any>(factory: () => T, maxTries?: number) => proxyLazy<T>(factory, maxTries);
export const LazyComponentWebpack = <P extends object = any>(factory: () => any, maxTries?: number) => LazyComponent<P>(factory, maxTries);

const storeCache = new Map<string, any>();

function indexFluxStores() {
    const Flux = find(filters.byProps("connectStores"), { silent: true });
    for (const store of Flux?.Store?.getAll?.() ?? []) storeCache.set(store.getName(), store);
}

export function findStore(name: string) {
    if (!storeCache.has(name)) indexFluxStores();
    if (!storeCache.has(name)) {
        const store = find(filters.byStoreName(name), { silent: true });
        if (store) storeCache.set(name, store);
    }

    const store = storeCache.get(name);
    if (!store) reportMissing("findStore", [name]);
    return store ?? null;
}

export const findStoreLazy = (name: string): any => proxyLazy(() => findStore(name));

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

export const findCssClassesLazy = <S extends string>(...classes: S[]) => proxyLazy(() => findCssClasses(...classes));

export function search(...code: CodeFilter) {
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

export const mapMangledModuleLazy = <S extends string>(code: string | RegExp | CodeFilter, mappers: Record<S, FilterFn>, includeHidden = false) =>
    proxyLazy(() => mapMangledModule(code, mappers, includeHidden));

const ENTRY_POINT = canonicalizeMatch(/\.then\(\i\.bind\(\i,"?([\w$]+)"?/);
const CHUNK_LOAD = canonicalizeMatch(/\i\.e\("?([\w$]+)"?\)/g);

export async function extractAndLoadChunks(code: CodeFilter, entryPointMatcher: RegExp = ENTRY_POINT) {
    const factory = findModuleFactory(...code);
    if (!factory) {
        logger.warn("extractAndLoadChunks: module not found", code);
        return false;
    }

    const source = String(factory);
    const match = canonicalizeMatch(entryPointMatcher).exec(source);
    if (!match?.[1]) {
        logger.warn("extractAndLoadChunks: no lazy import found in module", code);
        return false;
    }

    const statementStart = source.lastIndexOf(";", match.index) + 1;
    const loader = source.slice(statementStart, match.index);
    const chunkIds = Array.from(loader.matchAll(CHUNK_LOAD), m => (/^\d+$/.test(m[1]) ? Number(m[1]) : m[1]));

    await Promise.all(chunkIds.map(id => wreq.e(id)));

    const entryPoint = match[1];
    if (wreq.m[entryPoint] == null) {
        logger.warn("extractAndLoadChunks: entry point not loaded", entryPoint);
        return false;
    }

    wreq(entryPoint);
    return true;
}

export const extractAndLoadChunksLazy = (code: CodeFilter, entryPointMatcher?: RegExp) =>
    makeLazy(() => extractAndLoadChunks(code, entryPointMatcher));

export function waitFor(filter: string | PropsFilter | FilterFn, callback: CallbackFn) {
    const fn = typeof filter === "function" ? filter : filters.byProps(...(Array.isArray(filter) ? filter : [filter]));

    if (cache) {
        const [match, id] = findWithId(fn);
        if (match != null) return void callback(match, id!);
    }
    waitForSubscriptions.set(fn, callback);
}

export function extract(moduleId: PropertyKey) {
    const factory = wreq.m[moduleId as string];
    if (!factory) return null;

    const source = String(factory);
    const body = source.startsWith("(") ? source : "function" + source.slice(source.indexOf("("));
    return (0, eval)(`0,${body}\n//# sourceURL=MajicExtracted/WebpackModule${String(moduleId)}`) as ModuleFactory;
}
