/*
 * Majic — browser environment for the reporter build
 */

const noop = () => { };
const resolved = <T>(value: T) => () => Promise.resolve(value);

const pluginHelpers = new Proxy({}, {
    get: () => new Proxy({}, { get: () => resolved(undefined) })
});

if (IS_REPORTER && typeof (globalThis as any).MajicNative === "undefined") {
    (globalThis as any).MajicNative = {
        pluginHelpers,
        getSettings: () => "{}",
        setSettings: resolved(undefined),
        getQuickCss: resolved(""),
        setQuickCss: resolved(undefined),
        writeModuleDump: resolved(""),
        openExternal: resolved(undefined),
        relaunch: resolved(undefined),
        supportsWindowsMaterial: () => false,
        platform: "linux",
        openSettingsFolder: resolved(undefined),
        themes: {
            getThemesList: resolved([]),
            getThemeData: resolved(undefined),
            getSystemValues: resolved({}),
            openFolder: resolved(undefined)
        },
        quickCss: {
            openFile: resolved(undefined),
            initFileWatchers: resolved(undefined),
            addChangeListener: noop,
            addThemeChangeListener: noop
        }
    };
}

export { };
