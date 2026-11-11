/*
 * Majic — slash commands API
 */

import { Logger } from "@utils/logger";
import { filters, replaceExport, waitFor } from "@webpack";
import { showToast } from "@webpack/common";

const logger = new Logger("Commands", "#50fa7b");

export const enum ApplicationCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3
}

export const enum ApplicationCommandInputType {
    BUILT_IN = 0,
    BUILT_IN_TEXT = 1,
    BUILT_IN_INTEGRATION = 2
}

export const enum ApplicationCommandOptionType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10,
    ATTACHMENT = 11
}

export interface CommandArgument {
    type: ApplicationCommandOptionType;
    name: string;
    value: string;
    focused?: boolean;
    options?: CommandArgument[];
}

export interface CommandContext {
    channel: any;
    guild?: any;
}

export interface CommandOption {
    name: string;
    description: string;
    type: ApplicationCommandOptionType;
    required?: boolean;
    choices?: Array<{ name: string; value: string | number; displayName?: string }>;
    options?: CommandOption[];
    displayName?: string;
    displayDescription?: string;
}

export interface CommandReturnValue {
    content: string;
}

export interface MajicCommand {
    name: string;
    description: string;
    options?: CommandOption[];
    predicate?(context: CommandContext): boolean;
    execute(args: CommandArgument[], context: CommandContext): CommandReturnValue | void | Promise<CommandReturnValue | void>;
}

const commands = new Map<string, any>();
let nextId = 1;
let restore: (() => void) | null = null;

function toDiscordOption(option: CommandOption): any {
    return {
        ...option,
        displayName: option.displayName ?? option.name,
        displayDescription: option.displayDescription ?? option.description,
        choices: option.choices?.map(choice => ({ ...choice, displayName: choice.displayName ?? choice.name })),
        options: option.options?.map(toDiscordOption)
    };
}

function guardedExecute(command: MajicCommand, plugin: string) {
    const report = (err: unknown) => {
        logger.error(`/${command.name} from ${plugin} failed`, err);
        showToast({ text: `/${command.name} failed: ${err instanceof Error ? err.message : String(err)}`, variant: "critical" });
    };

    return (args: CommandArgument[], context: CommandContext) => {
        try {
            const result = command.execute(args, context);
            return result instanceof Promise ? result.catch(report) : result;
        } catch (err) {
            report(err);
        }
    };
}

export function registerCommand(command: MajicCommand, plugin: string) {
    if (commands.has(command.name)) throw new Error(`Command /${command.name} is already registered`);

    commands.set(command.name, {
        ...toDiscordOption({ ...command, type: ApplicationCommandOptionType.SUB_COMMAND }),
        id: `-majic-${nextId++}`,
        applicationId: "-1",
        type: ApplicationCommandType.CHAT_INPUT,
        inputType: ApplicationCommandInputType.BUILT_IN_TEXT,
        untranslatedName: command.name,
        untranslatedDescription: command.description,
        plugin,
        predicate: command.predicate,
        execute: guardedExecute(command, plugin)
    });
}

export function unregisterCommand(name: string) {
    return commands.delete(name);
}

export function findOption<T = string>(args: CommandArgument[], name: string, fallback?: T): T | undefined {
    const arg = args.find(a => a.name === name);
    return (arg?.value as T | undefined) ?? fallback;
}

const BUILT_IN_COMMANDS = filters.byCode('location:"getBuiltInCommands"');

export function _installCommands() {
    waitFor(BUILT_IN_COMMANDS, () => hookBuiltInCommands());
}

function hookBuiltInCommands() {
    if (restore) return;
    restore = replaceExport(BUILT_IN_COMMANDS, original =>
        function (this: unknown, types: number[], ...rest: unknown[]) {
            const builtIn = original.call(this, types, ...rest);
            const ours = [...commands.values()].filter(command => types.includes(command.type));
            return [...builtIn, ...ours];
        }
    );

    if (restore) logger.info("Slash commands ready");
    else logger.error("Could not find Discord's built-in commands, plugin commands will not show up");
}

export function _uninstallCommands() {
    restore?.();
    restore = null;
}
