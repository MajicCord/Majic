/*
 * Majic — build script
 */

import { context, build, transform } from "esbuild";
import { execSync } from "node:child_process";
import { readdirSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PLUGINS_DIR = join(ROOT, "src", "plugins");
const watch = process.argv.includes("--watch");
const dev = watch || process.argv.includes("--dev");
const reporter = process.argv.includes("--reporter");

function git(args, fallback) {
    try {
        return execSync(`git ${args}`, { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
        return fallback;
    }
}

const gitHash = process.env.MAJIC_HASH || git("rev-parse --short HEAD", "unknown");
const gitRemote = (process.env.MAJIC_REMOTE || git("remote get-url origin", "MajicCord/Majic"))
    .replace(/^.*github\.com[:/]/, "")
    .replace(/\.git$/, "");

const pluginsGlob = {
    name: "majic-plugins",
    setup(b) {
        b.onResolve({ filter: /^~plugins$/ }, () => ({ path: "~plugins", namespace: "majic-plugins" }));
        b.onLoad({ filter: /.*/, namespace: "majic-plugins" }, () => {
            const entries = readdirSync(PLUGINS_DIR, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => ["index.ts", "index.tsx"].map(file => join(PLUGINS_DIR, d.name, file)).find(existsSync))
                .filter(Boolean);
            const imports = entries.map((file, i) => `import p${i} from ${JSON.stringify(file)};`);
            return {
                contents: `${imports.join("\n")}\nexport default [${entries.map((_, i) => `p${i}`).join(", ")}];`,
                resolveDir: PLUGINS_DIR,
                loader: "ts",
                watchDirs: [PLUGINS_DIR]
            };
        });
    }
};

const PLUGIN_NAME_MATCHER = /definePlugin\(\{\s*name:\s*["'`](.+?)["'`]/;

function resolvePluginName(dir) {
    const entry = ["index.ts", "index.tsx"].map(file => join(dir, file)).find(existsSync);
    const name = entry && PLUGIN_NAME_MATCHER.exec(readFileSync(entry, "utf-8"))?.[1];
    if (!name) throw new Error(`Invalid plugin ${dir}: definePlugin must start with a string name`);
    return name;
}

const pluginNativesGlob = {
    name: "majic-plugin-natives",
    setup(b) {
        b.onResolve({ filter: /^~pluginNatives$/ }, () => ({ path: "~pluginNatives", namespace: "majic-plugin-natives" }));
        b.onLoad({ filter: /.*/, namespace: "majic-plugin-natives" }, () => {
            const natives = readdirSync(PLUGINS_DIR, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => {
                    const dir = join(PLUGINS_DIR, d.name);
                    const file = [join(dir, "native.ts"), join(dir, "native", "index.ts")].find(existsSync);
                    return file && { file, name: resolvePluginName(dir) };
                })
                .filter(Boolean);
            const imports = natives.map(({ file }, i) => `import * as n${i} from ${JSON.stringify(file)};`);
            const entries = natives.map(({ name }, i) => `${JSON.stringify(name)}: n${i}`);
            return {
                contents: `${imports.join("\n")}\nexport default { ${entries.join(", ")} };`,
                resolveDir: PLUGINS_DIR,
                loader: "ts",
                watchDirs: [PLUGINS_DIR]
            };
        });
    }
};

const fileUris = {
    name: "majic-file-uris",
    setup(b) {
        b.onResolve({ filter: /^file:\/\/.+/ }, args => ({
            namespace: "majic-file-uri",
            path: join(args.resolveDir, args.path.slice("file://".length).split("?")[0]),
            pluginData: { uri: args.path }
        }));
        b.onLoad({ filter: /.*/, namespace: "majic-file-uri" }, async ({ path, pluginData: { uri } }) => {
            const { searchParams } = new URL(uri);
            const base64 = searchParams.has("base64");
            let content = readFileSync(path, base64 ? "base64" : "utf-8");
            if (searchParams.has("minify") && /\.[cm]?[jt]s$/.test(path)) {
                content = (await transform(content, { minify: true, loader: path.endsWith("ts") ? "ts" : "js" })).code;
            } else if (searchParams.get("trim") !== "false") {
                content = content.trimEnd();
            }
            return { contents: `export default ${JSON.stringify(content)};` };
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
    legalComments: "none",
    define: {
        IS_DEV: JSON.stringify(dev),
        IS_REPORTER: JSON.stringify(reporter),
        MAJIC_GIT_HASH: JSON.stringify(gitHash),
        MAJIC_GIT_REMOTE: JSON.stringify(gitRemote)
    }
};

const rendererConfig = {
    ...common,
    entryPoints: [join(ROOT, "src/renderer/index.ts")],
    platform: "browser",
    format: "iife",
    globalName: "Majic",
    plugins: [pluginsGlob, fileUris]
};

const configs = reporter ? [
    { ...rendererConfig, outfile: join(ROOT, "dist/reporter.js"), minify: false }
] : [
    {
        ...common,
        entryPoints: [join(ROOT, "src/main/index.ts")],
        outfile: join(ROOT, "dist/patcher.js"),
        platform: "node",
        format: "cjs",
        external: ["electron", "original-fs"],
        plugins: [pluginNativesGlob, fileUris]
    },
    {
        ...common,
        entryPoints: [join(ROOT, "src/preload/index.ts")],
        outfile: join(ROOT, "dist/preload.js"),
        platform: "node",
        format: "cjs",
        external: ["electron", "original-fs"]
    },
    { ...rendererConfig, outfile: join(ROOT, "dist/renderer.js") }
];

if (watch) {
    const ctxs = await Promise.all(configs.map(c => context(c)));
    await Promise.all(ctxs.map(c => c.watch()));
    console.log("Watching for changes... (Ctrl+C to stop)");
} else {
    await Promise.all(configs.map(c => build(c)));
}
