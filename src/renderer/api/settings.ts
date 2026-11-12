/*
 * Majic — settings
 */

import { useEffect, useReducer } from "@webpack/common";
import { type DefinedSettings, OptionType, type PluginSettingDef, type SettingsDefinition } from "@utils/types";

export interface PluginSettings {
    enabled: boolean;
    [key: string]: unknown;
}

export interface Settings {
    plugins: Record<string, PluginSettings>;
    useQuickCss: boolean;
    enabledThemes: string[];
    autoUpdate: boolean;
    autoUpdateNotification: boolean;
    nativeTitleBar: boolean;
    transparent: boolean;
    disableMinSize: boolean;
    winCtrlQ: boolean;
    windowsMaterial: "none" | "mica" | "tabbed" | "acrylic";
    macosVibrancyStyle?: string;
    themeLinks: string[];
    notifications: {
        useNative: "always" | "not-focused" | "never";
        timeout: number;
    };
}

const DEFAULTS: Settings = {
    plugins: {},
    useQuickCss: true,
    enabledThemes: [],
    autoUpdate: true,
    autoUpdateNotification: true,
    nativeTitleBar: false,
    transparent: false,
    disableMinSize: false,
    winCtrlQ: false,
    windowsMaterial: "none",
    themeLinks: [],
    notifications: {
        useNative: "not-focused",
        timeout: 5000
    }
};

function load(): Settings {
    let stored: Partial<Settings> = {};
    try {
        stored = JSON.parse(MajicNative.getSettings());
    } catch { }

    return {
        ...DEFAULTS,
        ...stored,
        notifications: { ...DEFAULTS.notifications, ...stored.notifications }
    };
}

export const settings: Settings = load();

let saveTimeout: ReturnType<typeof setTimeout> | undefined;
export function saveSettings() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => MajicNative.setSettings(JSON.stringify(settings, null, 4)), 300);
}

const changeListeners = new Map<string, Set<() => void>>();

function addChangeListener(path: string, listener: () => void) {
    let listeners = changeListeners.get(path);
    if (!listeners) changeListeners.set(path, listeners = new Set());
    listeners.add(listener);
}

function removeChangeListener(path: string, listener: () => void) {
    changeListeners.get(path)?.delete(listener);
}

function notifyChange(pluginName: string, key: string) {
    for (const path of [`plugins.${pluginName}.${key}`, `plugins.${pluginName}.*`]) {
        changeListeners.get(path)?.forEach(listener => listener());
    }
}

export function useSettings(paths: string[]) {
    const [, forceUpdate] = useReducer(() => ({}), {});
    const key = paths.join("|");

    useEffect(() => {
        paths.forEach(path => addChangeListener(path, forceUpdate));
        return () => paths.forEach(path => removeChangeListener(path, forceUpdate));
    }, [key]);

    return settings;
}

export function getPluginSettings(name: string, enabledByDefault: boolean): PluginSettings {
    return (settings.plugins[name] ??= { enabled: enabledByDefault });
}

export function getDefaultValue(def: PluginSettingDef): unknown {
    if (def.type === OptionType.SELECT) return def.options.find(o => o.default)?.value;
    return def.default;
}

const nestedProxies = new WeakMap<object, any>();

function makeNestedProxy(target: object, onChange: () => void): any {
    const cached = nestedProxies.get(target);
    if (cached) return cached;

    const proxy = new Proxy(target, {
        get(obj, key, receiver) {
            const value = Reflect.get(obj, key, receiver);
            return typeof value === "object" && value !== null ? makeNestedProxy(value, onChange) : value;
        },
        set(obj, key, value, receiver) {
            const result = Reflect.set(obj, key, value, receiver);
            onChange();
            return result;
        },
        deleteProperty(obj, key) {
            const result = Reflect.deleteProperty(obj, key);
            onChange();
            return result;
        }
    });
    nestedProxies.set(target, proxy);
    return proxy;
}

export function definePluginSettings<D extends SettingsDefinition>(def: D): DefinedSettings<D> {
    let storeProxy: any;

    const defined: DefinedSettings<D> = {
        def,
        pluginName: "",
        use(keys) {
            const paths = keys ? keys.map(name => `plugins.${defined.pluginName}.${String(name)}`) : [`plugins.${defined.pluginName}.*`];
            useSettings(paths);
            return defined.store;
        },
        get store() {
            if (!defined.pluginName) throw new Error("Cannot access plugin settings before the plugin is initialized");
            const target = settings.plugins[defined.pluginName];
            if (storeProxy?.target !== target) {
                storeProxy = {
                    target,
                    proxy: new Proxy(target, {
                        get(obj, key, receiver) {
                            const value = Reflect.get(obj, key, receiver);
                            if (typeof value !== "object" || value === null || typeof key !== "string") return value;
                            return makeNestedProxy(value, () => {
                                saveSettings();
                                notifyChange(defined.pluginName, key);
                            });
                        },
                        set(obj, key, value) {
                            obj[key as string] = value;
                            saveSettings();
                            notifyChange(defined.pluginName, key as string);
                            (def[key as string] as PluginSettingDef | undefined)?.onChange?.(value);
                            return true;
                        }
                    })
                };
            }
            return storeProxy.proxy;
        }
    };

    return defined;
}

export function initPluginSettings(name: string, enabledByDefault: boolean, defined?: DefinedSettings<any>) {
    const stored = getPluginSettings(name, enabledByDefault);
    if (!defined) return;

    defined.pluginName = name;
    for (const [key, def] of Object.entries<PluginSettingDef>(defined.def)) {
        if (stored[key] !== undefined) continue;
        const value = getDefaultValue(def);
        if (value !== undefined) stored[key] = typeof value === "object" && value !== null ? structuredClone(value) : value;
    }
}
