/*
 * Majic — build script
 */

import { context, build } from "esbuild";
import { readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PLUGINS_DIR = join(ROOT, "src", "plugins");
const watch = process.argv.includes("--watch");
const dev = watch || process.argv.includes("--dev");

const pluginsGlob = {
    name: "majic-plugins",
    setup(b) {
        b.onResolve({ filter: /^~plugins$/ }, () => ({ path: "~plugins", namespace: "majic-plugins" }));
        b.onLoad({ filter: /.*/, namespace: "majic-plugins" }, () => {
            const dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
                .filter(d => d.isDirectory() && existsSync(join(PLUGINS_DIR, d.name, "index.ts")))
                .map(d => d.name);
            const imports = dirs.map((d, i) => `import p${i} from ${JSON.stringify(join(PLUGINS_DIR, d, "index.ts"))};`);
            return {
                contents: `${imports.join("\n")}\nexport default [${dirs.map((_, i) => `p${i}`).join(", ")}];`,
                resolveDir: PLUGINS_DIR,
                loader: "ts",
                watchDirs: [PLUGINS_DIR]
            };
        });
    }
};

const common = {
    bundle: true,
    sourcemap: dev ? "inline" : false,
    minify: !dev,
    target: "es2022",
    logLevel: "info",
    tsconfig: join(ROOT, "tsconfig.json"),
    legalComments: "none"
};

const configs = [
    {
        ...common,
        entryPoints: [join(ROOT, "src/main/index.ts")],
        outfile: join(ROOT, "dist/patcher.js"),
        platform: "node",
        format: "cjs",
        external: ["electron"]
    },
    {
        ...common,
        entryPoints: [join(ROOT, "src/preload/index.ts")],
        outfile: join(ROOT, "dist/preload.js"),
        platform: "node",
        format: "cjs",
        external: ["electron"]
    },
    {
        ...common,
        entryPoints: [join(ROOT, "src/renderer/index.ts")],
        outfile: join(ROOT, "dist/renderer.js"),
        platform: "browser",
        format: "iife",
        globalName: "Majic",
        plugins: [pluginsGlob]
    }
];

if (watch) {
    const ctxs = await Promise.all(configs.map(c => context(c)));
    await Promise.all(ctxs.map(c => c.watch()));
    console.log("Watching for changes... (Ctrl+C to stop)");
} else {
    await Promise.all(configs.map(c => build(c)));
}
