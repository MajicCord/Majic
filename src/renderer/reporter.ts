/*
 * Majic — patch and lookup reporter
 */

import { Logger } from "@utils/logger";

import { patches } from "./webpack/patchWebpack";
import { factoryListeners, lazyWebpackSearchHistory, type ModuleFactory, parseChunkIds, wreq } from "./webpack/webpack";

const logger = new Logger("Reporter", "#ffb86c");

export interface ReporterResult {
    pendingPatches: Array<{ plugin: string; find: string }>;
    failedSearches: Array<{ method: string; args: string; error?: string }>;
    loadedChunks: number;
    duration: number;
}

const LAZY_IMPORT = /(?:Promise\.all\(\[((?:[\w$]+\.e\((?:"[^"]+"|[\de]+)\),?)+)\]\)|([\w$]+\.e\((?:"[^"]+"|[\de]+)\)))\.then\([\w$]+(?:\.[\w$]+)?\.bind\([\w$]+,"?([^)",]+)"?/g;
const DATA_ONLY_CHUNK = /^[^{]*\{[^{]*\{[\w$]+\.exports=JSON\.parse\('/;
const WORKER_CHUNK = /importScripts\(|self\.postMessage/;

class ChunkLoader {
    private readonly loads = new Map<PropertyKey, Promise<unknown>>();
    private readonly fileNames = new Map<PropertyKey, string>();
    readonly entryPoints = new Set<string>();
    readonly seenChunks = new Set<PropertyKey>();

    fileName(id: PropertyKey) {
        if (!this.fileNames.has(id)) this.fileNames.set(id, wreq.u(id));
        return this.fileNames.get(id)!;
    }

    load(id: PropertyKey) {
        if (!this.loads.has(id)) this.loads.set(id, wreq.e(id).catch(() => undefined));
        return this.loads.get(id)!;
    }

    get count() {
        return this.loads.size;
    }

    async scan(code: string) {
        const pending: Array<Promise<unknown>> = [];

        for (const match of code.matchAll(LAZY_IMPORT)) {
            const [, group, single, entry] = match;
            const ids = parseChunkIds(group ?? single ?? "");
            if (!ids.length) continue;

            for (const id of ids) {
                const name = this.fileName(id);
                if (name && name !== "undefined.js") this.seenChunks.add(id);
                pending.push(this.load(id));
            }

            this.entryPoints.add(String(Number.isNaN(Number(entry)) ? entry : Number(entry)));
        }

        await Promise.all(pending);
    }
}

function readChunkMap(): Record<PropertyKey, string> {
    const probe = Symbol("majicChunkMap");
    let map: Record<PropertyKey, string> | undefined;

    Object.defineProperty(Object.prototype, probe, {
        configurable: true,
        get() {
            map = this;
            return "";
        }
    });

    try {
        wreq.u(probe);
    } finally {
        delete (Object.prototype as any)[probe];
    }

    if (!map) throw new Error("Could not read the chunk map");
    return map;
}

async function inBatches<T>(items: T[], size: number, worker: (item: T) => Promise<unknown>) {
    for (let i = 0; i < items.length; i += size) {
        await Promise.all(items.slice(i, i + size).map(worker));
    }
}

let allChunksLoaded = false;

export async function loadAllChunks() {
    if (allChunksLoaded) return 0;

    const loader = new ChunkLoader();
    let running = 0;
    let finish!: () => void;
    const finished = new Promise<void>(resolve => finish = resolve);

    const onFactory = (factory: ModuleFactory) => {
        running++;
        loader.scan(String(factory)).finally(() => {
            if (--running === 0) finish();
        });
    };

    factoryListeners.add(onFactory);
    for (const id in wreq.m) onFactory(wreq.m[id]);
    if (running === 0) finish();

    await finished;
    factoryListeners.delete(onFactory);

    const remaining = Object.keys(readChunkMap()).filter(id => !loader.seenChunks.has(id));
    await inBatches(remaining, 50, async id => {
        const code = await fetch(wreq.p + loader.fileName(id)).then(res => res.text()).catch(() => "");
        if (code && !DATA_ONLY_CHUNK.test(code) && !WORKER_CHUNK.test(code)) await loader.load(id);
    });

    for (const entry of loader.entryPoints) {
        if (!wreq.m[entry]) continue;
        try {
            wreq(entry);
        } catch { }
    }

    allChunksLoaded = true;
    return loader.count;
}

function formatArgs(method: string, args: unknown[]) {
    if (method === "mapMangledModule") {
        const [code, mappers] = args as [unknown, Record<string, unknown>];
        return `${String(code)}, { ${Object.keys(mappers).join(", ")} }`;
    }
    return args
        .map(arg => typeof arg === "function" ? `${String(arg).slice(0, 120)}...` : JSON.stringify(arg) ?? String(arg))
        .join(", ");
}

async function testSearches() {
    const failed: ReporterResult["failedSearches"] = [];

    for (const { method, args, test } of lazyWebpackSearchHistory) {
        let error: string | undefined;
        try {
            if (await test() == null) error = "not found";
        } catch (err) {
            error = err instanceof Error ? err.message : String(err);
        }
        if (!error) continue;

        const entry = { method, args: formatArgs(method, args), error };
        failed.push(entry);
        logger.warn(`Lookup failed: ${entry.method}(${entry.args}) ${error}`);
    }

    return failed;
}

export async function run(): Promise<ReporterResult> {
    const startedAt = performance.now();
    logger.info("Loading every Discord chunk...");

    const cssLoader = wreq.f?.css;
    if (cssLoader) wreq.f.css = () => { };

    let loadedChunks = 0;
    try {
        loadedChunks = await loadAllChunks();
    } finally {
        if (cssLoader) wreq.f.css = cssLoader;
    }

    for (const id of Object.keys(wreq.m)) {
        try {
            wreq(id);
        } catch { }
    }

    const pendingPatches = patches.filter(patch => !patch.all).map(patch => ({ plugin: patch.plugin, find: String(patch.find) }));
    for (const patch of pendingPatches) logger.warn(`Patch by ${patch.plugin} found no module: ${patch.find}`);

    const failedSearches = await testSearches();

    const duration = Math.round(performance.now() - startedAt);
    logger.info(`Done in ${duration}ms: ${pendingPatches.length} patch(es) without module, ${failedSearches.length} failed lookup(s)`);

    return { pendingPatches, failedSearches, loadedChunks, duration };
}
