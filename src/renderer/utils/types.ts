/*
 * Majic — plugin, patch and settings types
 */

export interface PatchReplacement {
    match: string | RegExp;
    replace: string | ((substring: string, ...groups: string[]) => string);
    noWarn?: boolean;
    predicate?(): boolean;
}

export interface Patch {
    find: string | RegExp;
    replacement: PatchReplacement | PatchReplacement[];
    noWarn?: boolean;
    all?: boolean;
    group?: boolean;
    predicate?(): boolean;
}

export type StartAt = "Init" | "DOMContentLoaded" | "WebpackReady";

export interface PluginAuthor {
    name: string;
    id?: string;
}

export const OptionType = {
    STRING: 0,
    NUMBER: 1,
    BIGINT: 2,
    BOOLEAN: 3,
    SELECT: 4,
    SLIDER: 5,
    COMPONENT: 6,
    CUSTOM: 7
} as const;

export type OptionType = typeof OptionType[keyof typeof OptionType];

interface OptionBase {
    description: string;
    restartNeeded?: boolean;
    hidden?(this: DefinedSettings): boolean;
    disabled?(this: DefinedSettings): boolean;
    onChange?(newValue: any): void;
}

export interface SelectOption {
    label: string;
    value: string | number | boolean;
    default?: boolean;
}

export type PluginSettingDef =
    | OptionBase & { type: typeof OptionType.STRING; default?: string; placeholder?: string; isValid?(value: string): boolean | string }
    | OptionBase & { type: typeof OptionType.NUMBER; default?: number; placeholder?: string; isValid?(value: number): boolean | string }
    | OptionBase & { type: typeof OptionType.BIGINT; default?: bigint; placeholder?: string; isValid?(value: bigint): boolean | string }
    | OptionBase & { type: typeof OptionType.BOOLEAN; default?: boolean }
    | OptionBase & { type: typeof OptionType.SELECT; options: readonly SelectOption[] }
    | OptionBase & { type: typeof OptionType.SLIDER; markers: number[]; default: number; stickToMarkers?: boolean }
    | OptionBase & { type: typeof OptionType.COMPONENT; component(props: { setValue(value: any): void; option: PluginSettingDef }): unknown; default?: unknown }
    | OptionBase & { type: typeof OptionType.CUSTOM; default?: unknown };

export type SettingsDefinition = Record<string, PluginSettingDef>;

export type SettingValue<D extends PluginSettingDef> =
    D extends { type: typeof OptionType.STRING } ? string :
    D extends { type: typeof OptionType.NUMBER | typeof OptionType.SLIDER } ? number :
    D extends { type: typeof OptionType.BIGINT } ? bigint :
    D extends { type: typeof OptionType.BOOLEAN } ? boolean :
    D extends { type: typeof OptionType.SELECT; options: readonly (infer O)[] } ? O extends SelectOption ? O["value"] : never :
    D extends { default: infer T } ? T :
    unknown;

export type SettingsStore<D extends SettingsDefinition> = { [K in keyof D]: SettingValue<D[K]> } & { enabled: boolean };

export interface DefinedSettings<D extends SettingsDefinition = SettingsDefinition> {
    def: D;
    pluginName: string;
    readonly store: SettingsStore<D>;
}

export interface PluginDef {
    name: string;
    description: string;
    authors: PluginAuthor[];
    patches?: Patch[];
    required?: boolean;
    enabledByDefault?: boolean;
    css?: string;
    startAt?: StartAt;
    dependencies?: string[];
    requiresRestart?: boolean;
    settings?: DefinedSettings<any>;
    flux?: Record<string, (event: any) => void>;
    contextMenus?: Record<string, (children: any[], ...args: any[]) => void>;
    onBeforeMessageSend?(channelId: string, message: { content: string; [key: string]: unknown }, options: Record<string, any>): void | { cancel: boolean } | Promise<void | { cancel: boolean }>;
    onBeforeMessageEdit?(channelId: string, messageId: string, message: { content: string; [key: string]: unknown }): void | { cancel: boolean } | Promise<void | { cancel: boolean }>;
    onMessageClick?(message: any, channel: any, event: MouseEvent): void;
    commands?: import("@api/commands").MajicCommand[];
    chatBarButtons?: Record<string, import("@api/chatButtons").ChatBarButtonRenderer>;
    messagePopoverButtons?: Record<string, import("@api/messagePopover").MessagePopoverButtonFactory>;
    messageAccessories?: Record<string, import("@api/messageDecorations").MessageAccessory>;
    messageDecorations?: Record<string, import("@api/messageDecorations").MessageDecoration>;
    memberListDecorators?: Record<string, import("@api/memberListDecorators").MemberListDecorator>;
    userProfileBadge?: import("@api/badges").ProfileBadge;
    translations?: Record<string, { description?: string; options?: Record<string, string> }>;
    start?(): void;
    stop?(): void;
    [key: string]: unknown;
}

export type Plugin = PluginDef & { started: boolean };

export function definePlugin<P extends PluginDef>(plugin: P & ThisType<P>): P {
    return plugin;
}
