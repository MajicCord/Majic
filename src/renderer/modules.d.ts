/*
 * Majic — virtual module types
 */

declare module "~plugins" {
    const plugins: import("./utils/types").PluginDef[];
    export default plugins;
}
