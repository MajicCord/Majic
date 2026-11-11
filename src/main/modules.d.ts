/*
 * Majic — main process virtual module types
 */

declare module "~pluginNatives" {
    const pluginNatives: Record<string, Record<string, unknown>>;
    export default pluginNatives;
}

declare module "file://*" {
    const content: string;
    export default content;
}
