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
        logger.debug(`Module ${String(id)} patched by ${[...patchedBy].join(", ")}`);
    }
    return factory;
}

function wrapFactory(id: PropertyKey, original: ModuleFactory): ModuleFactory {
    let patched: ModuleFactory | undefined;

    const wrapped: ModuleFactory = function (this: unknown, module, exports, require) {
        if (!wreq && require?.m) setWreq(require);

        patched ??= patchFactory(id, original);

        try {
            patched.call(this, module, exports, require);
        } catch (err) {
            if (patched === original) throw err;
            logger.error(`Patched module ${String(id)} crashed, running the original instead`, err);
            original.call(this, module, exports, require);
        }

        if (module?.exports == null) return;
        for (const listener of moduleListeners) {
            try {
                listener(module.exports, id);
            } catch (err) {
                logger.error("Error in a module listener", err);
            }
        }
    };

    wrapped.toString = original.toString.bind(original);
    (wrapped as any)[SYM_ORIGINAL_FACTORY] = original;
    return wrapped;
}

type ChunkEntry = [chunkIds: unknown[], modules: Record<PropertyKey, ModuleFactory>, runtime?: (r: WebpackRequire) => void];

const seenChunks = new WeakSet<object>();

function patchChunk(entry: ChunkEntry) {
    if (!Array.isArray(entry) || seenChunks.has(entry)) return;
    seenChunks.add(entry);

    const modules = entry[1];
    if (modules) {
        for (const id in modules) {
            if (!(modules[id] as any)[SYM_ORIGINAL_FACTORY]) modules[id] = wrapFactory(id, modules[id]);
        }
    }

    const runtime = entry[2];
    if (typeof runtime === "function") {
        entry[2] = function (this: unknown, r: WebpackRequire) {
            if (!wreq) setWreq(r);
            return runtime.call(this, r);
        };
    }
}

function hookChunkArray(chunks: unknown[]) {
    if ((chunks as any).$$majic) return;
    Object.defineProperty(chunks, "$$majic", { value: true });

    for (const entry of chunks) patchChunk(entry as ChunkEntry);

    let currentPush: (...items: unknown[]) => number = Array.prototype.push;
    Object.defineProperty(chunks, "push", {
        configurable: true,
        get: () =>
            function (this: unknown[], ...entries: unknown[]) {
                for (const entry of entries) patchChunk(entry as ChunkEntry);
                return currentPush.apply(this, entries);
            },
        set(v) {
            currentPush = v;
        }
    });
}

export function initWebpackHook() {
    let chunks: unknown[] | undefined = window.webpackChunkdiscord_app;
    if (chunks) hookChunkArray(chunks);

    Object.defineProperty(window, "webpackChunkdiscord_app", {
        configurable: true,
        get: () => chunks,
        set(v) {
            if (Array.isArray(v)) hookChunkArray(v);
            chunks = v;
        }
    });
}
