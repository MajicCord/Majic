/*
 * Majic — CustomCommands plugin
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, type CommandArgument, type CommandContext, findOption, registerCommand, sendBotMessage, unregisterCommand } from "@api/commands";
import { saveSettings, settings as rootSettings } from "@api/settings";
import { sendMessage } from "@utils/discord";
import { definePlugin } from "@utils/types";
import { FluxDispatcher, MessageActions, Stores } from "@webpack/common";

import { openCreateTagModal } from "./CreateTagModal";
import { getTag, getTags, removeTag, s, settings, type Tag } from "./settings";

const CUSTOM_COMMANDS_MARKER = Symbol("CustomCommands");
const ARGUMENT_REGEX = /{{(.+?)}}/g;

export function parseTagArguments(message: string) {
    const args: Array<{ name: string; defaultValue: string | null }> = [];

    for (const [, value] of message.matchAll(ARGUMENT_REGEX)) {
        const [name, defaultValue] = value.split("=").map(part => part.trim());
        if (!name || args.some(arg => arg.name === name)) continue;
        args.push({ name: name.toLowerCase(), defaultValue: defaultValue ?? null });
    }

    return args;
}

export function registerTagCommand(tag: Tag) {
    const tagArguments = parseTagArguments(tag.message);

    registerCommand({
        name: tag.name,
        description: tag.name,
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            ...tagArguments.map(arg => ({
                name: arg.name,
                description: arg.name,
                type: ApplicationCommandOptionType.STRING,
                required: arg.defaultValue === null
            })),
            {
                name: "ephemeral",
                get description() {
                    return s("ephemeral");
                },
                type: ApplicationCommandOptionType.BOOLEAN,
                required: false
            }
        ],

        async execute(args: CommandArgument[], { channel }: CommandContext) {
            const ephemeral = findOption<boolean>(args, "ephemeral", false);

            const response = tag.message
                .replace(ARGUMENT_REGEX, (fullMatch, value: string) => {
                    const [argName, defaultValue] = value.split("=").map(part => part.trim());
                    return findOption<string>(args, argName) ?? defaultValue ?? fullMatch;
                })
                .replaceAll("\\n", "\n");

            const replyOptions = MessageActions.getSendMessageOptionsForReply(Stores.PendingReplyStore.getPendingReply(channel.id));
            if (ephemeral) sendBotMessage(channel.id, { content: response });
            else sendMessage(channel.id, { content: response }, false, replyOptions);
            FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId: channel.id });
        },
        [CUSTOM_COMMANDS_MARKER]: true
    }, "CustomCommands");
}

function migrateLegacyCommands() {
    const stored = rootSettings.plugins.CustomCommands as Record<string, any> | undefined;
    const legacy = stored?.commands as Tag[] | undefined;
    if (!Array.isArray(legacy)) return;

    const tags = settings.store.tagsList as Record<string, Tag>;
    for (const command of legacy) tags[command.name] ??= { name: command.name, message: command.message };
    delete stored!.commands;
    saveSettings();
}

export default definePlugin({
    name: "CustomCommands",
    description: "Allows you to create custom slash commands / tags",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de créer tes propres commandes slash / tags"
        }
    },
    settings,

    css: ".majic-customcommands-card { padding: 0.5em 0.5em 0.5em 1em; display: grid; grid-template-columns: 1fr min-content min-content; align-items: center; gap: 0.25em; } .majic-customcommands-delete:hover { color: var(--status-danger, #da373c); }",

    start() {
        migrateLegacyCommands();
        getTags().forEach(registerTagCommand);
    },

    stop() {
        getTags().forEach(tag => unregisterCommand(tag.name));
    },

    commands: [
        {
            name: "tags",
            get description() {
                return s("manage");
            },
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "create",
                    get description() {
                        return s("create");
                    },
                    type: ApplicationCommandOptionType.SUB_COMMAND
                },
                {
                    name: "list",
                    get description() {
                        return s("list");
                    },
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: []
                },
                {
                    name: "delete",
                    get description() {
                        return s("delete");
                    },
                    type: ApplicationCommandOptionType.SUB_COMMAND,
                    options: [
                        {
                            name: "tag-name",
                            get description() {
                                return s("tagName");
                            },
                            type: ApplicationCommandOptionType.STRING,
                            required: true
                        }
                    ]
                }
            ],

            async execute(args: CommandArgument[], ctx: CommandContext) {
                switch (args[0].name) {
                    case "create":
                        openCreateTagModal();
                        break;

                    case "delete": {
                        const name = findOption<string>(args[0].options ?? [], "tag-name", "")!;
                        if (!getTag(name)) {
                            sendBotMessage(ctx.channel.id, { content: s("notFound", { name }) });
                            return;
                        }

                        removeTag(name);
                        sendBotMessage(ctx.channel.id, { content: s("deleted", { name }) });
                        break;
                    }

                    case "list": {
                        const content = getTags()
                            .map(tag => `\`${tag.name}\`: ${tag.message.slice(0, 72).replaceAll("\\n", " ")}${tag.message.length > 72 ? "..." : ""}`)
                            .join("\n");

                        sendBotMessage(ctx.channel.id, { content: content || s("noTags") });
                        break;
                    }
                }
            }
        }
    ]
});
