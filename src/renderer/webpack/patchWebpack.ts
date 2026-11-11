/*
 * Majic — webpack patcher
 * Adapted from Vencord, GPL-3.0-or-later
 */

import { Logger } from "@utils/logger";
import type { Patch, PatchReplacement } from "@utils/types";

const logger = new Logger("Webpack", "#8be9fd");

export type ModuleFactory = (this: unknown, module: any, exports: any, require: WebpackRequire) => void;
export interface WebpackRequire {
    (id: PropertyKey): any;
    c: Record<PropertyKey, { id: PropertyKey; loaded: boolean; exports: any }>;
    m: Record<PropertyKey, ModuleFactory>;
}

export interface RegisteredPatch extends Omit<Patch, "replacement"> {
    plugin: string;
    replacement: PatchReplacement[];
}

export const patches: RegisteredPatch[] = [];

export let wreq: WebpackRequire | undefined;
const wreqListeners = new Set<(wreq: WebpackRequire) => void>();
export function onWreqReady(cb: (wreq: WebpackRequire) => void) {
    if (wreq) cb(wreq);
    else wreqListeners.add(cb);
}

function setWreq(require: WebpackRequire) {
    wreq = require;
    logger.info("Got __webpack_require__");
    for (const cb of wreqListeners) cb(require);
    wreqListeners.clear();
}

export const moduleListeners = new Set<(exports: any, id: PropertyKey) => void>();

export function reportPendingPatches() {
    const pending = patches.filter(p => !p.all);
    if (!pending.length) return logger.info("All patches applied");
    for (const p of pending) logger.warn(`Patch by ${p.plugin} not applied yet, no module matched: ${p.find}`);
}

export const SYM_ORIGINAL_FACTORY = Symbol("Majic.originalFactory");
export const SYM_PATCHED_BY = Symbol("Majic.patchedBy");

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
        const wasPatchedBy = patchedBy.has(patch.plugin);
        let failed = false;

        for (const { match, replace, noWarn } of patch.replacement) {
            if (typeof match !== "string" && match.global) match.lastIndex = 0;

            let newCode: string;
            try {
                newCode = code.replace(match, replace as string);
            } catch (err) {
                logger.error(`Patch by ${patch.plugin} threw (module ${String(id)}): ${match}`, err);
                failed = true;
                if (patch.group) break;
                continue;
            }

            if (newCode === code) {
                if (!patch.noWarn && !noWarn) {
                    logger.warn(`Patch by ${patch.plugin} had no effect (module ${String(id)}): ${match}`);
                }
                failed = true;
                if (patch.group) break;
                continue;
            }

            try {
                const plugins = [...patchedBy, patch.plugin].filter((p, idx, arr) => arr.indexOf(p) === idx);
                factory = (0, eval)(
                    `// Webpack module ${String(id)} - patched by ${plugins.join(", ")}\n${newCode}\n//# sourceURL=MajicPatched/WebpackModule${String(id)}`
                );
                code = newCode;
                patchedBy.add(patch.plugin);
            } catch (err) {
                logger.error(`Patch by ${patch.plugin} produced invalid code (module ${String(id)}): ${match}`, err);
                failed = true;
                if (patch.group) break;
            }
        }

        if (patch.group && failed) {
            logger.warn(`Undoing patch group by ${patch.plugin} on module ${String(id)}`);
            code = previousCode;
            factory = previousFactory;
            if (!wasPatchedBy) patchedBy.delete(patch.plugin);
        }

        if (!patch.all) patches.splice(i--, 1);
    }

    if (factory !== original) {
        (factory as any)[SYM_ORIGINAL_FACTORY] = original;
        (original as any)[SYM_PATCHED_BY] = patchedBy;
        logger.info(`Module ${String(id)} patched by ${[...patchedBy].join(", ")}`);
    }
    return factory;
}

const SYM_IS_PROXIED_FACTORY = Symbol("Majic.isProxiedFactory");
const SYM_ORIGINAL_MODULE_FACTORIES = Symbol("Majic.originalModuleFactories");

const allWebpackInstances = new Set<WebpackRequire>();
let wreqFallbackApplied = false;

function define(target: object, key: PropertyKey, descriptor: PropertyDescriptor) {
    if (Object.hasOwn(descriptor, "value")) descriptor.writable = true;
    return Reflect.defineProperty(target, key, { configurable: true, enumerable: true, ...descriptor });
}

function defineInWebpackInstances(id: PropertyKey, factory: ModuleFactory) {
    for (const instance of allWebpackInstances) define(instance.m, id, { value: factory });
}

function notifyModuleListeners(exports: any, id: PropertyKey) {
    if (exports == null) return;
    for (const listener of moduleListeners) {
        try {
            listener(exports, id);
        } catch (err) {
            logger.error("Error in a module listener", err);
        }
    }
}

function runFactoryWithWrap(patched: ModuleFactory, id: PropertyKey, thisArg: unknown, args: Parameters<ModuleFactory>) {
    const original: ModuleFactory = (patched as any)[SYM_ORIGINAL_FACTORY] ?? patched;
    const [module, exports, require] = args;

    defineInWebpackInstances(id, original);

    if (wreq == null && !wreqFallbackApplied) {
        wreqFallbackApplied = true;
        if (typeof require === "function" && require.m != null && require.c != null) {
            logger.warn(`__webpack_require__ was not initialized, falling back to the one passed to module ${String(id)}`);
            setWreq(require);
        }
    }

    let result: unknown;
    try {
        result = patched.apply(thisArg, args);
    } catch (err) {
        if (patched === original) throw err;
        logger.error(`Patched module ${String(id)} crashed, running the original instead`, err);
        return original.apply(thisArg, [module, exports, require]);
    }

    notifyModuleListeners(module?.exports, id);
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
        if (key === "toString") return original.toString.bind(original);
        return Reflect.get(target, key, receiver);
    }
};

function proxyFactory(modules: WebpackRequire["m"], id: PropertyKey, factory: ModuleFactory, receiver: unknown, ignoreExistingInTarget = false) {
    if ((factory as any)?.[SYM_IS_PROXIED_FACTORY]) return Reflect.set(modules, id, factory, receiver);

    const proxied = new Proxy(factory, moduleFactoryHandler);

    for (const instance of allWebpackInstances) {
        const instanceModules = (instance.m as any)[SYM_ORIGINAL_MODULE_FACTORIES] ?? instance.m;
        if (ignoreExistingInTarget && instanceModules === modules) continue;
        if (!Object.hasOwn(instance.m, id)) continue;

        const existing = instance.m[id as string];
        if ((existing as any)[SYM_ORIGINAL_FACTORY] != null) (existing as any)[SYM_ORIGINAL_FACTORY] = factory;
        else defineInWebpackInstances(id, proxied);
        return true;
    }

    return Reflect.set(modules, id, proxied, receiver);
}

const moduleFactoriesHandler: ProxyHandler<WebpackRequire["m"]> = {
    get(target, key, receiver) {
        if (key === SYM_ORIGINAL_MODULE_FACTORIES) return target;
        return Reflect.get(target, key, receiver);
    },
    set: proxyFactory
};

const IGNORED_INSTANCES = ["sentry", "libdiscore", "fast-connect"];

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

                for (const id in originalModules) proxyFactory(originalModules, id, originalModules[id], originalModules, true);
                define(instance, "m", { value: new Proxy(originalModules, moduleFactoriesHandler) });

                (instance as any).d = function (exports: object, getters?: Record<PropertyKey, () => unknown>, values?: Record<PropertyKey, unknown>) {
                    const defineAll = (defs: Record<PropertyKey, unknown> | undefined, kind: "get" | "value") => {
                        for (const key in defs) {
                            if (Object.hasOwn(defs, key) && !Object.hasOwn(exports, key)) {
                                Object.defineProperty(exports, key, { enumerable: true, configurable: true, [kind]: defs[key] });
                            }
                        }
                    };
                    defineAll(getters, "get");
                    defineAll(values, "value");
                };
            };

            define(instance, "p", {
                enumerable: false,
                set(bundlePath: string) {
                    define(this, "p", { value: bundlePath });
                    clearTimeout(bundlePathTimeout);

                    if (bundlePath !== "/assets/" || /(?:=>|{return)"[^"]+?"[^=]/.test(String((instance as any).u))) return;

                    if (wreq == null && instance.c != null) {
                        logger.info(`Main webpack instance found${fileName ? ` in ${fileName}` : ""}`);
                        setWreq(instance);
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
