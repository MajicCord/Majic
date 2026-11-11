/*
 * Majic — slash commands API
 */

import { Logger } from "@utils/logger";
import { findByCodeLazy } from "@webpack";
import { MessageActions, SnowflakeUtils } from "@webpack/common";

const logger = new Logger("Commands", "#50fa7b");

export const enum ApplicationCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3
}

export const enum ApplicationCommandInputType {
    BUILT_IN = 0,
    BUILT_IN_TEXT = 1,
    BUILT_IN_INTEGRATION = 2,
    BOT = 3,
    PLACEHOLDER = 4
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
    inputType?: ApplicationCommandInputType;
    predicate?(context: CommandContext): boolean;
    execute(args: CommandArgument[], context: CommandContext): CommandReturnValue | void | Promise<CommandReturnValue | void>;
    [key: string]: any;
}

const OPTIONAL_MESSAGE = Symbol("Majic.OptionalMessageOption") as unknown as CommandOption;
const REQUIRED_MESSAGE = Symbol("Majic.RequiredMessageOption") as unknown as CommandOption;

export let OptionalMessageOption: CommandOption = OPTIONAL_MESSAGE;
export let RequiredMessageOption: CommandOption = REQUIRED_MESSAGE;

let builtIn: any[] | undefined;
let nextId = 1;
const registered = new Map<string, any>();

const createBotMessage = findByCodeLazy('username:"Clyde"');

export function sendBotMessage(channelId: string, message: Record<string, unknown>) {
    const botMessage = createBotMessage({ channelId, content: "", embeds: [] });
    MessageActions.receiveMessage(channelId, { ...botMessage, ...message, author: { ...botMessage.author, ...(message.author as object) } });
}

export function findOption<T = string>(args: CommandArgument[], name: string, fallback?: T): T | undefined {
    return (args.find(arg => arg.name === name)?.value as T | undefined) ?? fallback;
}

export function _initCommands(commands: any[]) {
    try {
        builtIn = commands;
        OptionalMessageOption = commands.find(c => (c.untranslatedName ?? c.displayName) === "shrug")?.options?.[0] ?? OptionalMessageOption;
        RequiredMessageOption = commands.find(c => (c.untranslatedName ?? c.displayName) === "me")?.options?.[0] ?? RequiredMessageOption;
        nextId = Math.abs(Math.min(...commands.map(c => Number(c.id)).filter(Number.isFinite))) + 1;
        for (const command of registered.values()) if (!commands.includes(command)) commands.push(command);
    } catch (err) {
        logger.error("Could not read Discord's built-in commands", err);
    }
    return commands;
}

export function _handleCommand(command: any, args: CommandArgument[], context: CommandContext) {
    if (!command.majicPlugin) return command.execute(args, context);

    const report = (err: unknown) => {
        logger.error(`/${command.name} from ${command.majicPlugin} failed`, err);
        const reason = err instanceof Error ? err.stack ?? err.message : String(err);
        sendBotMessage(context.channel.id, {
            content: `/${command.name} failed:\n\`\`\`\n${reason}\n\`\`\``,
            author: { username: "Majic" }
        });
    };

    try {
        const result = command.execute(args, context);
        return result instanceof Promise ? result.catch(report) : result;
    } catch (err) {
        report(err);
    }
}

function prepareOption<O extends CommandOption>(option: O): O {
    option.displayName ??= option.name;
    option.displayDescription ??= option.description;
    option.choices?.forEach(choice => choice.displayName ??= choice.name);
    option.options?.forEach((child, i, list) => {
        if (child === OPTIONAL_MESSAGE) list[i] = OptionalMessageOption;
        else if (child === REQUIRED_MESSAGE) list[i] = RequiredMessageOption;
        if (typeof list[i] === "object") prepareOption(list[i]);
    });
    return option;
}

function registerSubCommands(command: MajicCommand, plugin: string) {
    for (const sub of command.options ?? []) {
        if (sub.type !== ApplicationCommandOptionType.SUB_COMMAND) throw new Error("A command with sub-commands can only have sub-command options");
        const name = `${command.name} ${sub.name}`;
        registerCommand({
            ...command,
            ...sub,
            name,
            displayName: name,
            options: sub.options,
            id: `${sub.name}-${command.id}`,
            type: ApplicationCommandType.CHAT_INPUT,
            subCommandPath: [{ name: sub.name, type: sub.type, displayName: sub.name }],
            rootCommand: command
        } as MajicCommand, plugin);
    }
}

export function registerCommand(command: MajicCommand, plugin: string) {
    if (registered.has(command.name)) throw new Error(`Command /${command.name} is already registered`);

    Object.assign(command, {
        majicPlugin: plugin,
        plugin,
        untranslatedName: command.untranslatedName ?? command.name,
        untranslatedDescription: command.untranslatedDescription ?? command.description,
        id: command.id ?? `-${nextId++}`,
        applicationId: command.applicationId ?? "-1",
        type: command.type ?? ApplicationCommandType.CHAT_INPUT,
        inputType: command.inputType ?? ApplicationCommandInputType.BUILT_IN_TEXT
    });
    prepareOption(command as unknown as CommandOption);

    if (command.options?.[0]?.type === ApplicationCommandOptionType.SUB_COMMAND) {
        registered.set(command.name, command);
        registerSubCommands(command, plugin);
        return;
    }

    registered.set(command.name, command);
    builtIn?.push(command);
}

export function unregisterCommand(name: string) {
    const command = registered.get(name);
    if (!command) return false;
    registered.delete(name);

    for (const sub of [...registered.values()].filter(c => c.rootCommand === command)) unregisterCommand(sub.name);

    const index = builtIn?.indexOf(command) ?? -1;
    if (index !== -1) builtIn!.splice(index, 1);
    return true;
}

export const _generateBotMessageId = () => `-${SnowflakeUtils.fromTimestamp(Date.now())}`;
