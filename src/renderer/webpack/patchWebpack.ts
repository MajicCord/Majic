/*
 * Majic — webpack patcher
 */

import { Logger } from "@utils/logger";
import type { Patch, PatchReplacement } from "@utils/types";

import { _initWebpack, matchExports, moduleListeners, type ModuleFactory, quarantineUnsafeExports, type WebpackRequire, waitForSubscriptions, wreq } from "./webpack";

const logger = new Logger("Webpack", "#8be9fd");

export interface RegisteredPatch extends Omit<Patch, "replacement"> {
    plugin: string;
    replacement: PatchReplacement[];
}

export const patches: RegisteredPatch[] = [];

const ORIGINAL = Symbol.for("majic.webpack.original");
const PATCHED_BY = Symbol.for("majic.webpack.patchedBy");
const IGNORED_BUNDLES = ["sentry", "libdiscore", "fast-connect"];

let mainInstance: WebpackRequire | undefined;

export function reportPendingPatches() {
    const pending = patches.filter(p => !p.all);
    if (!pending.length) return logger.info("All patches applied");
    for (const p of pending) logger.warn(`Patch by ${p.plugin} not applied yet, no module matched: ${p.find}`);
}

function findMatches(code: string, find: string | RegExp) {
    if (typeof find === "string") return code.includes(find);
    find.lastIndex = 0;
    return find.test(code);
}

function toExpression(factorySource: string) {
    if (factorySource.startsWith("(")) return "0," + factorySource;
    return "0,function" + factorySource.slice(factorySource.indexOf("("));
}

function compile(code: string, id: PropertyKey, plugins: Iterable<string>): ModuleFactory {
    const header = `// Webpack module ${String(id)}, patched by ${[...plugins].join(", ")}`;
    return (0, eval)(`${header}\n${code}\n//# sourceURL=MajicPatched/WebpackModule${String(id)}`);
}

function applyReplacements(code: string, patch: RegisteredPatch, id: PropertyKey): string | null {
    let result = code;

    for (const { match, replace, noWarn } of patch.replacement) {
        if (match instanceof RegExp) match.lastIndex = 0;

        let next: string;
        try {
            next = result.replace(match, replace as string);
        } catch (err) {
            logger.error(`Replacement by ${patch.plugin} threw on module ${String(id)}: ${match}`, err);
            if (patch.group) return null;
            continue;
        }

        if (next === result) {
            if (!patch.noWarn && !noWarn) logger.warn(`Replacement by ${patch.plugin} had no effect on module ${String(id)}: ${match}`);
            if (patch.group) return null;
            continue;
        }

        result = next;
    }

    return result === code ? null : result;
}

function patchFactory(id: PropertyKey, original: ModuleFactory): ModuleFactory {
    const source = String(original);
    const matching = patches.filter(p => findMatches(source, p.find));
    if (!matching.length) return original;

    for (const patch of matching) {
        if (!patch.all) patches.splice(patches.indexOf(patch), 1);
    }

    let code = toExpression(source);
    let factory = original;
    const appliedBy: string[] = [];

    for (const patch of matching) {
        const patched = applyReplacements(code, patch, id);
        if (patched == null) {
            if (patch.group) logger.warn(`Patch group by ${patch.plugin} was not applied to module ${String(id)}`);
            continue;
        }

        try {
            factory = compile(patched, id, [...appliedBy, patch.plugin]);
            code = patched;
            appliedBy.push(patch.plugin);
        } catch (err) {
            logger.error(`Patch by ${patch.plugin} produced invalid code for module ${String(id)}, skipping it`, err);
        }
    }

    if (factory === original) return original;

    (original as any)[PATCHED_BY] = appliedBy;
    logger.info(`Module ${String(id)} patched by ${appliedBy.join(", ")}`);
    return factory;
}

function notifySubscribers(exports: any, id: PropertyKey) {
    for (const listener of moduleListeners) {
        try {
            listener(exports, id);
        } catch (err) {
            logger.error("Error in a module listener", err);
        }
    }

    for (const [filter, callback] of waitForSubscriptions) {
        const match = matchExports(exports, filter);
        if (match === undefined) continue;

        waitForSubscriptions.delete(filter);
        try {
            callback(match, id);
        } catch (err) {
            logger.error("Error in a waitFor callback", err);
        }
    }
}

function claimMainInstance(require: WebpackRequire) {
    if (wreq != null || typeof require !== "function" || !require.c) return;
    if (mainInstance && require !== mainInstance) return;

    _initWebpack(require);
    logger.info("Got __webpack_require__");
}

function wrapFactory(id: PropertyKey, original: ModuleFactory): ModuleFactory {
    let runnable: ModuleFactory | undefined;

    const wrapper = {
        [String(id)](this: unknown, module: any, exports: any, require: WebpackRequire) {
            claimMainInstance(require);
            runnable ??= patchFactory(id, original);

            try {
                runnable.call(this, module, exports, require);
            } catch (err) {
                if (runnable === original) throw err;
                logger.error(`Patched module ${String(id)} crashed, running the original instead`, err);
                runnable = original;
                original.call(this, module, exports, require);
            }

            const moduleExports = module?.exports;
            if (moduleExports == null) return;
            if (require?.c && quarantineUnsafeExports(require.c, moduleExports, id)) return;
            notifySubscribers(moduleExports, id);
        }
    }[String(id)] as ModuleFactory;

    Object.defineProperty(wrapper, ORIGINAL, { value: original });
    wrapper.toString = () => original.toString();
    return wrapper;
}

const isWrapped = (factory: unknown): factory is ModuleFactory => typeof factory === "function" && ORIGINAL in factory;

function setOwn(target: object, key: PropertyKey, value: unknown) {
    Object.defineProperty(target, key, { value, configurable: true, writable: true, enumerable: true });
}

function configurableExportsDefiner(exports: object, getters?: Record<string, () => unknown>, values?: Record<string, unknown>) {
    for (const [definitions, kind] of [[getters, "get"], [values, "value"]] as const) {
        for (const key in definitions) {
            if (!Object.hasOwn(definitions, key) || Object.hasOwn(exports, key)) continue;
            Object.defineProperty(exports, key, { enumerable: true, configurable: true, [kind]: definitions[key] });
        }
    }
}

function bundleNameFromStack() {
    return /\/assets\/([^/:?#\s]+\.js)/.exec(new Error().stack ?? "")?.[1];
}

function interceptInstance(instance: WebpackRequire, modules: WebpackRequire["m"], bundle: string) {
    for (const id in modules) {
        if (!isWrapped(modules[id])) modules[id] = wrapFactory(id, modules[id]);
    }

    setOwn(instance, "m", new Proxy(modules, {
        set(target, id, factory) {
            target[id as string] = isWrapped(factory) ? factory : wrapFactory(id, factory as ModuleFactory);
            return true;
        }
    }));

    Object.defineProperty(instance, "d", {
        configurable: true,
        enumerable: false,
        set() {
            setOwn(instance, "d", configurableExportsDefiner);
        }
    });

    if (!mainInstance && bundle.startsWith("web.")) mainInstance = instance;
    logger.info(`Intercepting webpack instance ${bundle}`);
}

export function initWebpackHook() {
    Object.defineProperty(Function.prototype, "m", {
        configurable: true,
        enumerable: false,
        set(this: WebpackRequire, modules: WebpackRequire["m"]) {
            setOwn(this, "m", modules);
            if (!String(this).includes("exports:{}")) return;

            const bundle = bundleNameFromStack();
            if (!bundle || IGNORED_BUNDLES.some(name => bundle.toLowerCase().includes(name))) return;

            interceptInstance(this, modules, bundle);
        }
    });
}
