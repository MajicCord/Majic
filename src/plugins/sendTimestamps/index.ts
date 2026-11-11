/*
 * Majic — SendTimestamps plugin
 */

import { ApplicationCommandOptionType, findOption } from "@api/commands";
import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { showToast } from "@webpack/common";

const FORMATS = [
    { name: "Relative (in 2 hours)", value: "R" },
    { name: "Short time (18:30)", value: "t" },
    { name: "Long time (18:30:00)", value: "T" },
    { name: "Short date (11/11/2026)", value: "d" },
    { name: "Long date (11 November 2026)", value: "D" },
    { name: "Date and time", value: "f" },
    { name: "Full date and time", value: "F" }
];

const settings = definePluginSettings({
    replaceInMessages: {
        type: OptionType.BOOLEAN,
        description: "Turn times written like [18:30] in your messages into timestamps",
        default: true
    }
});

const UNITS: Record<string, number> = { s: 1, sec: 1, second: 1, m: 60, min: 60, minute: 60, h: 3600, hour: 3600, d: 86400, day: 86400, w: 604800, week: 604800 };

function parseWhen(input: string): Date | null {
    const text = input.trim().toLowerCase();

    const relative = /^in\s+(\d+(?:\.\d+)?)\s*([a-z]+?)s?$/.exec(text);
    if (relative && UNITS[relative[2]]) return new Date(Date.now() + Number(relative[1]) * UNITS[relative[2]] * 1000);

    const time = /^(\d{1,2})[:h](\d{2})(?:\s*(am|pm))?$/.exec(text);
    if (time) {
        let hours = Number(time[1]) % 24;
        if (time[3] === "pm" && hours < 12) hours += 12;
        if (time[3] === "am" && hours === 12) hours = 0;
        const date = new Date();
        date.setHours(hours, Number(time[2]), 0, 0);
        if (date.getTime() < Date.now()) date.setDate(date.getDate() + 1);
        return date;
    }

    const parsed = new Date(input);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const toTimestamp = (date: Date, format: string) => `<t:${Math.floor(date.getTime() / 1000)}:${format}>`;

export default definePlugin({
    name: "SendTimestamps",
    description: "Send Discord timestamps that show in everyone's own timezone, with /timestamp or by writing [18:30]",
    authors: [{ name: "SnailyStudios" }],
    settings,

    commands: [
        {
            name: "timestamp",
            description: "Send a time that shows in everyone's own timezone",
            options: [
                { name: "when", description: "18:30, in 2 hours, 2026-12-25 20:00...", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "format", description: "How the time is displayed", type: ApplicationCommandOptionType.STRING, choices: FORMATS }
            ],
            execute(args) {
                const date = parseWhen(findOption<string>(args, "when") ?? "");
                if (!date) {
                    showToast({ text: "Could not understand that time", variant: "critical" });
                    return;
                }
                return { content: toTimestamp(date, findOption<string>(args, "format") ?? "f") };
            }
        }
    ],

    onBeforeMessageSend(_, message) {
        if (!settings.store.replaceInMessages) return;
        message.content = message.content.replace(/\[(\d{1,2}[:h]\d{2}(?:\s*[ap]m)?)\]/gi, (match, time) => {
            const date = parseWhen(time);
            return date ? toTimestamp(date, "t") : match;
        });
    }
});
