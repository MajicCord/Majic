/*
 * Majic — webpack patcher
 */

import { Logger } from "@utils/logger";
import type { Patch, PatchReplacement } from "@utils/types";

import { _initWebpack, factoryListeners, matchExports, moduleListeners, type ModuleFactory, quarantineUnsafeExports, type WebpackRequire, waitForSubscriptions, wreq } from "./webpack";

const logger = new Logger("Webpack", "#8be9fd");

export interface RegisteredPatch extends Omit<Patch, "replacement"> {
    plugin: string;
    replacement: PatchReplacement[];
}

export const patches: RegisteredPatch[] = [];

export const SYM_ORIGINAL_FACTORY = Symbol("Majic.originalFactory");
export const SYM_PATCHED_BY = Symbol("Majic.patchedBy");
const SYM_PROXIED = Symbol("Majic.proxiedFactory");
const SYM_RAW_FACTORIES = Symbol("Majic.rawFactories");

const SKIPPED_BUNDLES = ["sentry", "libdiscore", "fast-connect"];

type Factories = WebpackRequire["m"];
type TaggedFactory = ModuleFactory & { [SYM_ORIGINAL_FACTORY]?: ModuleFactory; [SYM_PATCHED_BY]?: Set<string> };

const instances = new Set<WebpackRequire>();
let usedFallbackRequire = false;

export function reportPendingPatches() {
    const pending = patches.filter(patch => !patch.all);
    if (!pending.length) return logger.info("All patches applied");
    for (const patch of pending) logger.warn(`Patch by ${patch.plugin} not applied yet, no module matched: ${patch.find}`);
}

function setOwn(target: object, key: PropertyKey, descriptor: PropertyDescriptor) {
    const writable = "value" in descriptor ? { writable: true } : {};
    return Reflect.defineProperty(target, key, { configurable: true, enumerable: true, ...writable, ...descriptor });
}

function setFactoryEverywhere(id: PropertyKey, factory: ModuleFactory) {
    for (const instance of instances) setOwn(instance.m, id, { value: factory });
}

function sourceMatches(source: string, find: string | RegExp) {
    if (typeof find === "string") return source.includes(find);
    find.lastIndex = 0;
    return find.test(source);
}

function toExpression(source: string) {
    const params = source.slice(source.indexOf("("));
    return source.startsWith("(") ? `0,${source}` : `0,function${params}`;
}

function compile(id: PropertyKey, code: string, plugins: Iterable<string>): ModuleFactory {
    const header = `// Webpack module ${String(id)} - patched by ${[...plugins].join(", ")}`;
    return (0, eval)(`${header}\n${code}\n//# sourceURL=MajicPatched/WebpackModule${String(id)}`);
}

interface PatchState {
    code: string;
    factory: ModuleFactory;
    patchedBy: Set<string>;
}

function applyPatch(id: PropertyKey, patch: RegisteredPatch, state: PatchState) {
    const snapshot = { code: state.code, factory: state.factory, hadPlugin: state.patchedBy.has(patch.plugin) };

    const undo = (reason: string, match: PatchReplacement["match"]) => {
        logger.warn(`Undoing patch group by ${patch.plugin} because ${match} ${reason}`);
        state.code = snapshot.code;
        state.factory = snapshot.factory;
        if (!snapshot.hadPlugin) state.patchedBy.delete(patch.plugin);
    };

    for (const { match, replace, noWarn } of patch.replacement) {
        if (match instanceof RegExp) match.lastIndex = 0;

        let nextCode: string;
        let nextFactory: ModuleFactory;
        try {
            nextCode = state.code.replace(match, replace as string);
            if (nextCode === state.code) {
                if (!patch.noWarn && !noWarn) logger.warn(`Patch by ${patch.plugin} had no effect (module ${String(id)}): ${match}`);
                if (patch.group) return undo("had no effect", match);
                continue;
            }
            nextFactory = compile(id, nextCode, new Set([...state.patchedBy, patch.plugin]));
        } catch (err) {
            logger.error(`Patch by ${patch.plugin} errored (module ${String(id)}): ${match}`, err);
            if (patch.group) return undo("errored", match);
            continue;
        }

        state.code = nextCode;
        state.factory = nextFactory;
        state.patchedBy.add(patch.plugin);
    }
}

function patchFactory(id: PropertyKey, original: ModuleFactory): TaggedFactory {
    const source = String(original);
    const state: PatchState = { code: toExpression(source), factory: original, patchedBy: new Set() };

    for (const patch of [...patches]) {
        if (!sourceMatches(source, patch.find)) continue;
        applyPatch(id, patch, state);
        if (!patch.all) patches.splice(patches.indexOf(patch), 1);
    }

    const result = state.factory as TaggedFactory;
    result[SYM_ORIGINAL_FACTORY] = original;

    if (result !== original) {
        (original as TaggedFactory)[SYM_PATCHED_BY] = state.patchedBy;
        logger.info(`Module ${String(id)} patched by ${[...state.patchedBy].join(", ")}`);
    }
    return result;
}

function notifyModuleLoaded(require: WebpackRequire, exports: any, id: PropertyKey) {
    if (typeof require === "function" && require.c && quarantineUnsafeExports(require.c, exports, id)) return;
    if (exports == null) return;

    for (const listener of moduleListeners) {
        try {
            listener(exports, id);
        } catch (err) {
            logger.error("Error in a webpack module listener", err);
        }
    }

    for (const [filter, callback] of waitForSubscriptions) {
        const found = matchExports(exports, filter);
        if (found === undefined) continue;

        waitForSubscriptions.delete(filter);
        try {
            callback(found, id);
        } catch (err) {
            logger.error("Error in a webpack waitFor callback", err);
        }
    }
}

function ensureRequire(require: WebpackRequire, id: PropertyKey) {
    if (wreq != null || usedFallbackRequire) return;
    usedFallbackRequire = true;

    if (typeof require === "function" && require.m != null && require.c != null) {
        logger.warn(`__webpack_require__ was not initialized, falling back to the one passed to module ${String(id)}`);
        _initWebpack(require);
    }
}

function executeFactory(factory: TaggedFactory, id: PropertyKey, thisArg: unknown, args: Parameters<ModuleFactory>) {
    const original = factory[SYM_ORIGINAL_FACTORY] ?? factory;
    if (factory === original) delete factory[SYM_ORIGINAL_FACTORY];

    const [module, , require] = args;

    setFactoryEverywhere(id, original);
    ensureRequire(require, id);

    let returned: unknown;
    try {
        returned = factory.apply(thisArg, args);
    } catch (err) {
        if (factory === original) throw err;
        logger.error(`Patched module ${String(id)} crashed, running the original instead`, err);
        return original.apply(thisArg, args);
    }

    notifyModuleLoaded(require, module?.exports, id);
    return returned;
}

const factoryProxyHandler: ProxyHandler<TaggedFactory> = {
    apply(target, thisArg, args: Parameters<ModuleFactory>) {
        const id = target.name;
        const runnable = target[SYM_ORIGINAL_FACTORY] != null ? target : patchFactory(id, target);
        return executeFactory(runnable, id, thisArg, args);
    },

    get(target, key, receiver) {
        if (key === SYM_PROXIED) return true;

        if (key === "toString" || key === SYM_PATCHED_BY) {
            const original = target[SYM_ORIGINAL_FACTORY] ?? target;
            const value = Reflect.get(original, key, original);
            return key === "toString" ? value.bind(original) : value;
        }

        return Reflect.get(target, key, receiver);
    }
};

function findDuplicate(factories: Factories, id: PropertyKey, skipOwnInstance: boolean) {
    for (const instance of instances) {
        const raw = (instance.m as any)[SYM_RAW_FACTORIES] ?? instance.m;
        if (skipOwnInstance && raw === factories) continue;
        if (Object.hasOwn(instance.m, id)) return instance.m[id as string] as TaggedFactory;
    }
    return undefined;
}

function registerFactory(factories: Factories, id: PropertyKey, factory: ModuleFactory, receiver: unknown, skipOwnInstance = false) {
    for (const listener of factoryListeners) {
        try {
            listener(factory, id);
        } catch (err) {
            logger.error("Error in a webpack factory listener", err);
        }
    }

    const proxied = new Proxy(factory as TaggedFactory, factoryProxyHandler);
    const duplicate = findDuplicate(factories, id, skipOwnInstance);

    if (duplicate == null) return Reflect.set(factories, id, proxied, receiver);

    if (duplicate[SYM_ORIGINAL_FACTORY] != null) duplicate[SYM_ORIGINAL_FACTORY] = factory;
    else setFactoryEverywhere(id, proxied);
    return true;
}

const factoriesProxyHandler: ProxyHandler<Factories> = {
    get(target, key, receiver) {
        return key === SYM_RAW_FACTORIES ? target : Reflect.get(target, key, receiver);
    },
    set: registerFactory
};

function configurableDefine(exports: object, getters?: Record<PropertyKey, () => unknown>, values?: Record<PropertyKey, unknown>) {
    const defineEach = (definitions: Record<PropertyKey, unknown> | undefined, kind: "get" | "value") => {
        if (!definitions) return;
        for (const key of Object.keys(definitions)) {
            if (Object.hasOwn(exports, key)) continue;
            Object.defineProperty(exports, key, { enumerable: true, configurable: true, [kind]: definitions[key] });
        }
    };
    defineEach(getters, "get");
    defineEach(values, "value");
}

function hookInstance(instance: WebpackRequire, factories: Factories, bundle: string | undefined) {
    if (instances.has(instance)) return;
    logger.info(`Found webpack module factories${bundle ? ` in ${bundle}` : ""}`);
    instances.add(instance);

    for (const id in factories) registerFactory(factories, id, factories[id], factories, true);

    setOwn(factories, Symbol.toStringTag, { value: "ModuleFactories", enumerable: false });
    setOwn(instance, "m", { value: new Proxy(factories, factoriesProxyHandler) });
    (instance as any).d = configurableDefine;
}

function isDiscordInstance(instance: WebpackRequire, stack: string | undefined) {
    if (!stack?.includes("http") || /at \d+? \(/.test(stack)) return false;
    return String(instance).includes("exports:{}");
}

function watchInstanceSetup(instance: WebpackRequire, factories: Factories, bundle: string | undefined) {
    const hook = () => hookInstance(instance, factories, bundle);

    const bundlePathTimeout = setTimeout(() => Reflect.deleteProperty(instance, "p"), 0);
    const chunkLoaderTimeout = setTimeout(() => Reflect.deleteProperty(instance, "O"), 0);

    setOwn(instance, "p", {
        enumerable: false,
        set(bundlePath: string) {
            setOwn(this, "p", { value: bundlePath });
            clearTimeout(bundlePathTimeout);

            const fixedChunkName = /(?:=>|{return)"[^"]+?"[^=]/.test(String((instance as any).u));
            if (bundlePath !== "/assets/" || fixedChunkName) return;

            if (wreq == null && instance.c != null) {
                logger.info(`Main webpack instance found${bundle ? ` in ${bundle}` : ""}, initializing internal references`);
                _initWebpack(instance);
            }
            hook();
        }
    });

    setOwn(instance, "O", {
        enumerable: false,
        set(onChunksLoaded: any) {
            setOwn(this, "O", { value: onChunksLoaded });
            clearTimeout(chunkLoaderTimeout);

            setOwn(onChunksLoaded, "j", {
                enumerable: false,
                set(chunkJsonp: unknown) {
                    setOwn(this, "j", { value: chunkJsonp });
                    if ((instance as any).p == null) hook();
                }
            });
        }
    });
}

export function initWebpackHook() {
    setOwn(Function.prototype, "m", {
        enumerable: false,
        set(this: WebpackRequire, factories: Factories) {
            setOwn(this, "m", { value: factories });

            const { stack } = new Error();
            if (!isDiscordInstance(this, stack)) return;

            const bundle = stack!.match(/\/assets\/(.+?\.js)/)?.[1];
            if (SKIPPED_BUNDLES.some(name => bundle?.toLowerCase().includes(name))) return;

            watchInstanceSetup(this, factories, bundle);
        }
    });
}
