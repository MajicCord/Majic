/*
 * Majic — ConsoleShortcuts plugin
 */

import { saveSettings, settings } from "@api/settings";
import * as WebpackPatcher from "@renderer/webpack/patchWebpack";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { LAZY_CACHED, LAZY_RESOLVE } from "@utils/lazy";
import { sleep } from "@utils/misc";
import { canonicalizeMatch, canonicalizeReplace, canonicalizeReplacement } from "@utils/patches";
import { definePlugin, type PluginNative } from "@utils/types";
import * as Webpack from "@webpack";
import { extract, filters, findAll, findModuleId, search } from "@webpack";
import * as Common from "@webpack/common";
import type { ComponentType } from "react";

type Shortcut = { getter(): any; preload?: boolean } | ((...args: any[]) => any) | Record<string, any>;

const win = window as any;

const Native = MajicNative.pluginHelpers.ConsoleShortcuts as PluginNative<typeof import("./native")>;

const define: typeof Object.defineProperty = (obj, prop, desc) => {
    if (Object.hasOwn(desc, "value")) desc.writable = true;
    return Object.defineProperty(obj, prop, { configurable: true, enumerable: true, ...desc });
};

const getCurrentChannel = () => Common.Stores.ChannelStore.getChannel(Common.Stores.SelectedChannelStore.getChannelId());
const getCurrentGuild = () => Common.Stores.GuildStore.getGuild(Common.Stores.SelectedGuildStore.getGuildId());

function makeShortcuts(): Record<string, Shortcut> {
    function newFindWrapper(filterFactory: (...props: any[]) => Webpack.FilterFn, topLevelOnly = false) {
        const cache = new Map<string, unknown>();

        return function (...filterProps: unknown[]) {
            const cacheKey = String(filterProps);
            if (cache.has(cacheKey)) return cache.get(cacheKey);

            const matches = findAll(filterFactory(...filterProps), { topLevelOnly });

            let result: unknown;
            switch (matches.length) {
                case 0:
                    result = null;
                    break;
                case 1:
                    result = matches[0];
                    break;
                default: {
                    const uniqueMatches = [...new Set(matches)];
                    if (uniqueMatches.length > 1) console.warn(`Warning: This filter matches ${uniqueMatches.length} exports. Make it more specific!\n`, uniqueMatches);
                    result = matches[0];
                }
            }

            if (result && cacheKey) cache.set(cacheKey, result);
            return result;
        };
    }

    function findStoreWrapper(findStore: typeof Webpack.findStore) {
        const cache = new Map<string, unknown>();

        return function (storeName: string) {
            const cacheKey = String(storeName);
            if (cache.has(cacheKey)) return cache.get(cacheKey);

            let store: unknown;
            try {
                store = findStore(storeName);
            } catch { }
            if (store) cache.set(cacheKey, store);
            return store;
        };
    }

    let fakeRenderWin: WeakRef<Window> | undefined;
    const find = newFindWrapper(f => f);
    const findByProps = newFindWrapper(filters.byProps);

    return {
        ...Object.fromEntries(Object.keys(Common).map(key => [key, { getter: () => (Common as Record<string, any>)[key] }])),
        wp: Webpack,
        wpc: { getter: () => Webpack.cache },
        wreq: { getter: () => Webpack.wreq },
        wpPatcher: { getter: () => WebpackPatcher },
        wpsearch: search,
        wpex: extract,
        wpexs: (code: string) => extract(findModuleId(code)!),
        find,
        findAll,
        findByProps,
        findAllByProps: (...props: string[]) => findAll(filters.byProps(...props)),
        findByCode: newFindWrapper(filters.byCode),
        findCssClasses: newFindWrapper(filters.byClassNames, true),
        findAllByCode: (code: string) => findAll(filters.byCode(code)),
        findComponentByCode: newFindWrapper(filters.componentByCode),
        findAllComponentsByCode: (...code: string[]) => findAll(filters.componentByCode(...code)),
        findExportedComponent: (...props: string[]) => (findByProps(...props) as any)[props[0]],
        findStore: findStoreWrapper(Webpack.findStore),
        PluginsApi: { getter: () => Majic.Plugins },
        plugins: { getter: () => Majic.Plugins.plugins },
        Settings: { getter: () => Majic.settings },
        reload: () => location.reload(),
        restart: () => Native.relaunch(),
        canonicalizeMatch,
        canonicalizeReplace,
        canonicalizeReplacement,
        runtimeHashMessageKey,
        fakeRender: (component: ComponentType, props: any) => {
            const prevWin = fakeRenderWin?.deref();
            const win = prevWin?.closed === false
                ? prevWin
                : window.open("about:blank", "Fake Render", "popup,width=500,height=500")!;
            fakeRenderWin = new WeakRef(win);
            win.focus();

            const doc = win.document;
            doc.body.style.margin = "1em";

            if (!(win as any).prepared) {
                (win as any).prepared = true;

                [...document.querySelectorAll("style"), ...document.querySelectorAll("link[rel=stylesheet]")].forEach(style => {
                    const node = style.cloneNode(true) as HTMLStyleElement | HTMLLinkElement;

                    if (style.parentElement?.tagName === "HEAD") doc.head.append(node);
                    else if (node.dataset?.majicStyle) doc.documentElement.append(node);
                    else doc.body.append(node);
                });
            }

            const root = Common.createRoot(doc.body.appendChild(document.createElement("div")));
            root.render(Common.React.createElement(component, props));

            doc.addEventListener("close", () => root.unmount(), { once: true });
        },

        preEnable: (plugin: string) => {
            (settings.plugins[plugin] ??= { enabled: true }).enabled = true;
            saveSettings();
        },

        channel: { getter: () => getCurrentChannel(), preload: false },
        channelId: { getter: () => Common.Stores.SelectedChannelStore.getChannelId(), preload: false },
        guild: { getter: () => getCurrentGuild(), preload: false },
        guildId: { getter: () => Common.Stores.SelectedGuildStore.getGuildId(), preload: false },
        me: { getter: () => Common.Stores.UserStore.getCurrentUser(), preload: false },
        meId: { getter: () => Common.Stores.UserStore.getCurrentUser().id, preload: false },
        messages: { getter: () => Common.Stores.MessageStore.getMessages(Common.Stores.SelectedChannelStore.getChannelId()), preload: false },
        openModal: { getter: () => Common.openModal },
        openModalLazy: { getter: () => Common.openModalLazy },

        Stores: {
            getter: () => Object.fromEntries(((Common.Flux.Store as any).getAll?.() ?? []).map((store: any) => [store.getName(), store]))
        },

        setExperiment: (id: string, bucket: number) => {
            Common.FluxDispatcher.dispatch({
                type: "EXPERIMENT_OVERRIDE_BUCKET",
                experimentId: id,
                experimentBucket: bucket
            });
        }
    };
}

function loadAndCacheShortcut(key: string, val: { getter(): any; preload?: boolean }, forceLoad: boolean) {
    const currentVal = val.getter();
    if (!currentVal || val.preload === false) return currentVal;

    function unwrapProxy(value: any) {
        if (value[LAZY_RESOLVE]) {
            return forceLoad ? value[LAZY_RESOLVE]() : value[LAZY_CACHED];
        } else if (typeof value.resolveComponent === "function") {
            return forceLoad ? value.resolveComponent() : value;
        }
        return value;
    }

    const value = unwrapProxy(currentVal);
    if (typeof value === "object" && value !== null) {
        const descriptors = Object.getOwnPropertyDescriptors(value);

        for (const propKey in descriptors) {
            if (value[propKey] == null) continue;

            const descriptor = descriptors[propKey];
            if (descriptor.writable === true || descriptor.set != null) {
                const currentValue = value[propKey];
                const newValue = unwrapProxy(currentValue);
                if (newValue != null && currentValue !== newValue) value[propKey] = newValue;
            }
        }
    }

    if (value != null) {
        define(win.shortcutList, key, { value });
        define(win, key, { value });
    }

    return value;
}

const webpackModulesProbablyLoaded = Webpack.onceReady.then(() => sleep(1000));

export default definePlugin({
    name: "ConsoleShortcuts",
    description: "Adds short aliases for many things on the window. Run `shortcutList` for a list.",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute des raccourcis pratiques dans la console. Tape `shortcutList` pour la liste."
        }
    },
    startAt: "Init",

    patches: [
        {
            find: "&&this.initializeIfNeeded()",
            replacement: {
                match: /\i&&this\.initializeIfNeeded\(\)/,
                replace: "$&,Reflect.defineProperty(this,Symbol.toStringTag,{value:this.getName(),configurable:!0,writable:!0,enumerable:!1})"
            }
        }
    ],

    start() {
        const shortcuts = makeShortcuts();
        win.shortcutList = {};

        for (const [key, val] of Object.entries(shortcuts)) {
            if (typeof val === "object" && "getter" in val) {
                define(win.shortcutList, key, { get: () => loadAndCacheShortcut(key, val as { getter(): any; preload?: boolean }, true) });
                define(win, key, { get: () => win.shortcutList[key] });
            } else {
                win.shortcutList[key] = val;
                win[key] = val;
            }
        }

        void this.eagerLoad(false);
        void Native.initDevtoolsOpenEagerLoad();
    },

    async eagerLoad(forceLoad: boolean) {
        await webpackModulesProbablyLoaded;

        for (const [key, val] of Object.entries(makeShortcuts())) {
            if (typeof val !== "object" || !Object.hasOwn(val, "getter") || (val as { preload?: boolean }).preload === false) continue;

            try {
                loadAndCacheShortcut(key, val as { getter(): any; preload?: boolean }, forceLoad);
            } catch { }
        }
    },

    stop() {
        delete win.shortcutList;
        for (const key in makeShortcuts()) delete win[key];
    }
});
