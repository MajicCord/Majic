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
    OPEN_EXTERNAL = "MajicOpenExternal"
}
