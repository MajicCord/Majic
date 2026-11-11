/*
 * Majic — translations
 */

import { filters, find } from "@webpack";
import { useEffect, useState } from "@webpack/common";

import en from "./en";
import fr from "./fr";

export type Dictionary = Partial<Record<keyof typeof en, string>>;

const dictionaries: Record<string, Dictionary> = { en, fr };
const listeners = new Set<() => void>();

let currentLocale = "en";
let subscribed = false;
let localeStore: any;

function getLocaleStore() {
    localeStore ??= find(filters.byStoreName("LocaleStore"), { isIndirect: true }) ?? undefined;
    return localeStore;
}

function readDiscordLocale() {
    const raw: string = getLocaleStore()?.locale || document.documentElement?.lang || navigator.language || "en";
    return raw.toLowerCase();
}

function resolveLocale(raw: string) {
    if (dictionaries[raw]) return raw;
    const base = raw.split("-")[0];
    return dictionaries[base] ? base : "en";
}

function refreshLocale() {
    const next = resolveLocale(readDiscordLocale());
    if (next === currentLocale) return;
    currentLocale = next;
    listeners.forEach(listener => listener());
}

function ensureSubscribed() {
    if (subscribed) return;
    const store = getLocaleStore();
    if (!store?.addChangeListener) return;
    store.addChangeListener(refreshLocale);
    subscribed = true;
}

export function getLocale() {
    ensureSubscribed();
    refreshLocale();
    return currentLocale;
}

export function t(key: keyof typeof en, variables?: Record<string, string | number>) {
    const locale = getLocale();
    let text = dictionaries[locale]?.[key] ?? en[key] ?? key;
    if (variables) {
        for (const [name, value] of Object.entries(variables)) text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
}

export function localized<T>(translations: Record<string, T> | undefined, fallback: T): T {
    if (!translations) return fallback;
    const locale = getLocale();
    return translations[locale] ?? fallback;
}

export type PluginStrings = Record<string, string>;

export function createStrings<T extends PluginStrings>(translations: { en: T } & Record<string, Partial<T>>) {
    return (key: keyof T & string, variables?: Record<string, string | number>) => {
        let text: string = translations[getLocale()]?.[key] ?? translations.en[key] ?? key;
        if (variables) {
            for (const [name, value] of Object.entries(variables)) text = text.replaceAll(`{${name}}`, String(value));
        }
        return text;
    };
}

export function useLocale() {
    const [locale, setLocale] = useState(getLocale);

    useEffect(() => {
        const listener = () => setLocale(currentLocale);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);

    return locale;
}
