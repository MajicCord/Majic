/*
 * Majic — settings
 */

import { type DefinedSettings, OptionType, type PluginSettingDef, type SettingsDefinition } from "@utils/types";

export interface PluginSettings {
    enabled: boolean;
    [key: string]: unknown;
}

export interface Settings {
    plugins: Record<string, PluginSettings>;
    useQuickCss: boolean;
}

const DEFAULTS: Settings = {
    plugins: {},
    useQuickCss: true
};

function load(): Settings {
    try {
        return { ...DEFAULTS, ...JSON.parse(MajicNative.getSettings()) };
    } catch {
        return structuredClone(DEFAULTS);
    }
}

export const settings: Settings = load();

let saveTimeout: ReturnType<typeof setTimeout> | undefined;
export function saveSettings() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => MajicNative.setSettings(JSON.stringify(settings, null, 4)), 300);
}

export function getPluginSettings(name: string, enabledByDefault: boolean): PluginSettings {
    return (settings.plugins[name] ??= { enabled: enabledByDefault });
}

export function getDefaultValue(def: PluginSettingDef): unknown {
    if (def.type === OptionType.SELECT) return def.options.find(o => o.default)?.value;
    return def.default;
}

export function definePluginSettings<D extends SettingsDefinition>(def: D): DefinedSettings<D> {
    let storeProxy: any;

    const defined: DefinedSettings<D> = {
        def,
        pluginName: "",
        get store() {
            if (!defined.pluginName) throw new Error("Cannot access plugin settings before the plugin is initialized");
            const target = settings.plugins[defined.pluginName];
            if (storeProxy?.target !== target) {
                storeProxy = {
                    target,
                    proxy: new Proxy(target, {
                        set(obj, key, value) {
                            obj[key as string] = value;
                            saveSettings();
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
        if (value !== undefined) stored[key] = value;
    }
}
