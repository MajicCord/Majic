/*
 * Majic — Unindent plugin
 */

import { definePlugin } from "@utils/types";

function unindent(str: string) {
    str = str.replace(/\t/g, "    ");
    const minIndent = str.match(/^ *(?=\S)/gm)?.reduce((prev, curr) => Math.min(prev, curr.length), Infinity) ?? 0;

    if (!minIndent) return str;
    return str.replace(new RegExp(`^ {${minIndent}}`, "gm"), "");
}

function unindentMessage(message: { content: string }) {
    message.content = message.content.replace(/```(.|\n)*?```/g, m => {
        const lines = m.split("\n");
        if (lines.length < 2) return m;
        let suffix = "";
        if (lines[lines.length - 1] === "```") suffix = lines.pop()!;
        return `${lines[0]}\n${unindent(lines.slice(1).join("\n"))}\n${suffix}`;
    });
}

export default definePlugin({
    name: "Unindent",
    description: "Trims leading indentation from code blocks",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Retire l'indentation en trop au début des blocs de code"
        }
    },

    patches: [
        {
            find: "inQuote:",
            replacement: {
                match: /,content:([^,]+),inQuote/,
                replace: (_: string, content: string) => `,content:$self.unindent(${content}),inQuote`
            }
        }
    ],

    unindent,

    onBeforeMessageSend(_channelId: string, message: { content: string }) {
        unindentMessage(message);
    },

    onBeforeMessageEdit(_channelId: string, _messageId: string, message: { content: string }) {
        unindentMessage(message);
    }
});
