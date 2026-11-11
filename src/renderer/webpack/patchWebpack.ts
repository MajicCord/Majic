/*
 * Majic — webpack patcher
 * Adapted from Vencord, GPL-3.0-or-later
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
const SYM_IS_PROXIED_FACTORY = Symbol("Majic.isProxiedFactory");
const SYM_ORIGINAL_MODULE_FACTORIES = Symbol("Majic.originalModuleFactories");

const IGNORED_INSTANCES = ["sentry", "libdiscore", "fast-connect"];
const allWebpackInstances = new Set<WebpackRequire>();
let wreqFallbackApplied = false;

export function reportPendingPatches() {
    const pending = patches.filter(p => !p.all);
    if (!pending.length) return logger.info("All patches applied");
    for (const p of pending) logger.warn(`Patch by ${p.plugin} not applied yet, no module matched: ${p.find}`);
}

function define(target: object, key: PropertyKey, descriptor: PropertyDescriptor) {
    if (Object.hasOwn(descriptor, "value")) descriptor.writable = true;
    return Reflect.defineProperty(target, key, { configurable: true, enumerable: true, ...descriptor });
}

function defineInWebpackInstances(id: PropertyKey, factory: ModuleFactory) {
    for (const instance of allWebpackInstances) define(instance.m, id, { value: factory });
}

function findMatches(code: string, find: string | RegExp) {
    if (typeof find === "string") return code.includes(find);
    if (find.global) find.lastIndex = 0;
    return find.test(code);
}

function patchFactory(id: PropertyKey, original: ModuleFactory): ModuleFactory {
    const originalCode = String(original);
    const isArrow = originalCode.startsWith("(");

    let code = "0," + (isArrow ? "" : "function") + originalCode.slice(originalCode.indexOf("("));
    let factory = original;
    const patchedBy = new Set<string>();

    for (let i = 0; i < patches.length; i++) {
        const patch = patches[i];
        if (!findMatches(originalCode, patch.find)) continue;

        const previousCode = code;
        const previousFactory = factory;
        let markedAsPatched = false;
        let restorePrevious = false;

        for (const { match, replace, noWarn } of patch.replacement) {
            if (typeof match !== "string" && match.global) match.lastIndex = 0;

            try {
                const newCode = code.replace(match, replace as string);

                if (newCode === code) {
                    if (!patch.noWarn && !noWarn) logger.warn(`Patch by ${patch.plugin} had no effect (module ${String(id)}): ${match}`);
                    if (patch.group) {
                        logger.warn(`Undoing patch group by ${patch.plugin} because ${match} had no effect`);
                        restorePrevious = true;
                        break;
                    }
                    continue;
                }

                const plugins = [...patchedBy];
                if (!patchedBy.has(patch.plugin)) plugins.push(patch.plugin);

                const newFactory = (0, eval)(`// Webpack module ${String(id)} - patched by ${plugins.join(", ")}\n${newCode}\n//# sourceURL=MajicPatched/WebpackModule${String(id)}`);

                if (!patchedBy.has(patch.plugin)) {
                    patchedBy.add(patch.plugin);
                    markedAsPatched = true;
                }
                code = newCode;
                factory = newFactory;
            } catch (err) {
                logger.error(`Patch by ${patch.plugin} errored (module ${String(id)}): ${match}`, err);
                if (patch.group) {
                    logger.warn(`Undoing patch group by ${patch.plugin} because ${match} errored`);
                    restorePrevious = true;
                    break;
                }
            }
        }

        if (restorePrevious) {
            code = previousCode;
            factory = previousFactory;
            if (markedAsPatched) patchedBy.delete(patch.plugin);
        }

        if (!patch.all) patches.splice(i--, 1);
    }

    (factory as any)[SYM_ORIGINAL_FACTORY] = original;
    if (factory !== original) {
        (original as any)[SYM_PATCHED_BY] = patchedBy;
        logger.info(`Module ${String(id)} patched by ${[...patchedBy].join(", ")}`);
    }
    return factory;
}

function notifySubscribers(require: WebpackRequire, exports: any, id: PropertyKey) {
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
        const match = matchExports(exports, filter);
        if (match === undefined) continue;

        waitForSubscriptions.delete(filter);
        try {
            callback(match, id);
        } catch (err) {
            logger.error("Error in a webpack waitFor callback", err);
        }
    }
}

function runFactoryWithWrap(patched: ModuleFactory, id: PropertyKey, thisArg: unknown, args: Parameters<ModuleFactory>) {
    const original: ModuleFactory = (patched as any)[SYM_ORIGINAL_FACTORY] ?? patched;
    if (patched === original) delete (patched as any)[SYM_ORIGINAL_FACTORY];

    const [module, , require] = args;

    defineInWebpackInstances(id, original);

    if (wreq == null && !wreqFallbackApplied) {
        wreqFallbackApplied = true;
        if (typeof require === "function" && require.m != null && require.c != null) {
            logger.warn(`__webpack_require__ was not initialized, falling back to the one passed to module ${String(id)}`);
            _initWebpack(require);
        }
    }

    let result: unknown;
    try {
        result = patched.apply(thisArg, args);
    } catch (err) {
        if (patched === original) throw err;
        logger.error(`Patched module ${String(id)} crashed, running the original instead`, err);
        return original.apply(thisArg, args);
    }

    notifySubscribers(require, module?.exports, id);
    return result;
}

const moduleFactoryHandler: ProxyHandler<ModuleFactory> = {
    apply(target, thisArg, args: Parameters<ModuleFactory>) {
        const id = target.name;
        if ((target as any)[SYM_ORIGINAL_FACTORY] != null) return runFactoryWithWrap(target, id, thisArg, args);
        return runFactoryWithWrap(patchFactory(id, target), id, thisArg, args);
    },

    get(target, key, receiver) {
        if (key === SYM_IS_PROXIED_FACTORY) return true;

        const original = (target as any)[SYM_ORIGINAL_FACTORY] ?? target;
        if (key === "toString" || key === SYM_PATCHED_BY) {
            const value = Reflect.get(original, key, original);
            return key === "toString" ? value.bind(original) : value;
        }
        return Reflect.get(target, key, receiver);
    }
};

function updateExistingFactory(modules: WebpackRequire["m"], id: PropertyKey, factory: ModuleFactory, proxied: ModuleFactory, ignoreExistingInTarget: boolean) {
    let existing: ModuleFactory | undefined;
    for (const instance of allWebpackInstances) {
        const instanceModules = (instance.m as any)[SYM_ORIGINAL_MODULE_FACTORIES] ?? instance.m;
        if (ignoreExistingInTarget && instanceModules === modules) continue;
        if (Object.hasOwn(instance.m, id)) {
            existing = instance.m[id as string];
            break;
        }
    }

    if (existing == null) return false;

    if ((existing as any)[SYM_ORIGINAL_FACTORY] != null) (existing as any)[SYM_ORIGINAL_FACTORY] = factory;
    else defineInWebpackInstances(id, proxied);
    return true;
}

function proxyFactoryAndUpdateExisting(modules: WebpackRequire["m"], id: PropertyKey, factory: ModuleFactory, receiver: unknown, ignoreExistingInTarget = false) {
    for (const listener of factoryListeners) {
        try {
            listener(factory, id);
        } catch (err) {
            logger.error("Error in a webpack factory listener", err);
        }
    }

    const proxied = new Proxy(factory, moduleFactoryHandler);
    if (updateExistingFactory(modules, id, factory, proxied, ignoreExistingInTarget)) return true;
    return Reflect.set(modules, id, proxied, receiver);
}

const moduleFactoriesHandler: ProxyHandler<WebpackRequire["m"]> = {
    get(target, key, receiver) {
        if (key === SYM_ORIGINAL_MODULE_FACTORIES) return target;
        return Reflect.get(target, key, receiver);
    },
    set: proxyFactoryAndUpdateExisting
};

export function initWebpackHook() {
    define(Function.prototype, "m", {
        enumerable: false,

        set(this: WebpackRequire, originalModules: WebpackRequire["m"]) {
            define(this, "m", { value: originalModules });

            const { stack } = new Error();
            if (!stack?.includes("http") || /at \d+? \(/.test(stack) || !String(this).includes("exports:{}")) return;

            const fileName = stack.match(/\/assets\/(.+?\.js)/)?.[1];
            if (IGNORED_INSTANCES.some(name => fileName?.toLowerCase().includes(name))) return;

            const instance = this;

            const patchThisInstance = () => {
                if (allWebpackInstances.has(instance)) return;
                logger.info(`Found webpack module factories${fileName ? ` in ${fileName}` : ""}`);
                allWebpackInstances.add(instance);

                for (const id in originalModules) proxyFactoryAndUpdateExisting(originalModules, id, originalModules[id], originalModules, true);

                define(originalModules, Symbol.toStringTag, { value: "ModuleFactories", enumerable: false });
                define(instance, "m", { value: new Proxy(originalModules, moduleFactoriesHandler) });

                (instance as any).d = function (exports: object, getters?: Record<PropertyKey, () => unknown>, values?: Record<PropertyKey, unknown>) {
                    for (const [definitions, kind] of [[getters, "get"], [values, "value"]] as const) {
                        for (const key in definitions) {
                            if (Object.hasOwn(definitions, key) && !Object.hasOwn(exports, key)) {
                                Object.defineProperty(exports, key, { enumerable: true, configurable: true, [kind]: definitions[key] });
                            }
                        }
                    }
                };
            };

            define(instance, "p", {
                enumerable: false,
                set(bundlePath: string) {
                    define(this, "p", { value: bundlePath });
                    clearTimeout(bundlePathTimeout);

                    if (bundlePath !== "/assets/" || /(?:=>|{return)"[^"]+?"[^=]/.test(String((instance as any).u))) return;

                    if (wreq == null && instance.c != null) {
                        logger.info(`Main webpack instance found${fileName ? ` in ${fileName}` : ""}, initializing internal references`);
                        _initWebpack(instance);
                    }
                    patchThisInstance();
                }
            });

            define(instance, "O", {
                enumerable: false,
                set(onChunksLoaded: any) {
                    define(this, "O", { value: onChunksLoaded });
                    clearTimeout(onChunksLoadedTimeout);

                    define(onChunksLoaded, "j", {
                        enumerable: false,
                        set(j: unknown) {
                            define(this, "j", { value: j });
                            if ((instance as any).p == null) patchThisInstance();
                        }
                    });
                }
            });

            const bundlePathTimeout = setTimeout(() => Reflect.deleteProperty(instance, "p"), 0);
            const onChunksLoadedTimeout = setTimeout(() => Reflect.deleteProperty(instance, "O"), 0);
        }
    });
}
