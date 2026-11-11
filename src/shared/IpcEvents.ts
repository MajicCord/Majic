/*
 * Majic — IPC channels
 */

export const enum IpcEvents {
    GET_SETTINGS = "MajicGetSettings",
    SET_SETTINGS = "MajicSetSettings",
    GET_QUICK_CSS = "MajicGetQuickCss",
    SET_QUICK_CSS = "MajicSetQuickCss",
    GET_RENDERER_CODE = "MajicGetRendererCode",
    WRITE_MODULE_DUMP = "MajicWriteModuleDump",
    GET_PLUGIN_IPC_METHOD_MAP = "MajicGetPluginIpcMethodMap",
    OPEN_EXTERNAL = "MajicOpenExternal",
    GET_THEMES_LIST = "MajicGetThemesList",
    GET_THEME_DATA = "MajicGetThemeData",
    GET_THEME_SYSTEM_VALUES = "MajicGetThemeSystemValues",
    OPEN_THEMES_FOLDER = "MajicOpenThemesFolder",
    OPEN_SETTINGS_FOLDER = "MajicOpenSettingsFolder",
    OPEN_QUICK_CSS = "MajicOpenQuickCss",
    INIT_FILE_WATCHERS = "MajicInitFileWatchers",
    QUICK_CSS_UPDATE = "MajicQuickCssUpdate",
    THEME_UPDATE = "MajicThemeUpdate",
    SUPPORTS_WINDOWS_MATERIAL = "MajicSupportsWindowsMaterial",
    RELAUNCH = "MajicRelaunch"
}
