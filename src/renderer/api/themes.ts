/*
 * Majic — themes and Quick CSS
 */

import { saveSettings, settings } from "@api/settings";
import { Stores } from "@webpack/common";

let root: HTMLElement | undefined;
let quickCssStyle: HTMLStyleElement | undefined;
let themesStyle: HTMLStyleElement | undefined;
let watchersStarted = false;

const themeChangeListeners = new Set<() => void>();

function getRoot() {
    if (root?.isConnected) return root;
    root ??= document.createElement("majic-root");
    document.documentElement.append(root);
    return root;
}

function createStyle(id: string) {
    const style = document.createElement("style");
    style.id = id;
    getRoot().append(style);
    return style;
}

function activeTheme(): "light" | "dark" | undefined {
    const theme = Stores.ThemeStore?.theme;
    if (theme == null) return undefined;
    return theme === "light" ? "light" : "dark";
}

export function applyThemes() {
    themesStyle ??= createStyle("majic-themes");
    if (!themesStyle.isConnected) getRoot().append(themesStyle);

    const mode = activeTheme();
    const links = settings.themeLinks
        .map(rawLink => {
            const match = /^@(light|dark) (.*)/.exec(rawLink);
            if (!match) return rawLink;
            const [, linkMode, link] = match;
            return linkMode === mode ? link : null;
        })
        .filter((link): link is string => !!link?.trim());

    links.push(...settings.enabledThemes.map(theme => `majic:///themes/${theme}?v=${Date.now()}`));

    themesStyle.textContent = links.map(link => `@import url("${link.trim()}");`).join("\n");
    themeChangeListeners.forEach(listener => listener());
}

async function applyQuickCss(css?: string) {
    quickCssStyle ??= createStyle("majic-quickcss");
    if (!quickCssStyle.isConnected) getRoot().append(quickCssStyle);

    quickCssStyle.textContent = css ?? await MajicNative.getQuickCss();
    quickCssStyle.disabled = !settings.useQuickCss;
}

export function setQuickCssEnabled(enabled: boolean) {
    settings.useQuickCss = enabled;
    saveSettings();
    void applyQuickCss();
}

export function setQuickCss(css: string) {
    void applyQuickCss(css);
}

export function setEnabledThemes(themes: string[]) {
    settings.enabledThemes = themes;
    saveSettings();
    applyThemes();
}

export function setThemeLinks(links: string[]) {
    settings.themeLinks = links;
    saveSettings();
    applyThemes();
}

export const addThemeChangeListener = (listener: () => void) => void themeChangeListeners.add(listener);
export const removeThemeChangeListener = (listener: () => void) => void themeChangeListeners.delete(listener);

export function initThemes() {
    applyThemes();
    void applyQuickCss();

    if (watchersStarted) return;
    watchersStarted = true;

    MajicNative.quickCss.addChangeListener(css => void applyQuickCss(css));
    MajicNative.quickCss.addThemeChangeListener(applyThemes);
    void MajicNative.quickCss.initFileWatchers();
}

export function initThemeStoreListener() {
    const store = Stores.ThemeStore;
    if (!store) return;

    let currentTheme = store.theme;
    applyThemes();
    store.addChangeListener(() => {
        if (currentTheme === store.theme) return;
        currentTheme = store.theme;
        applyThemes();
    });
}
