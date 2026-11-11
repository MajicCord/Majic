/*
 * Majic — FixCodeblockGap plugin
 */

import { definePlugin } from "@utils/types";

const CODEBLOCK_RULE = String.raw`/^${"```"}(?:([a-z0-9_+\-.#]+?)\n)?\n*([^\n][^]*?)\n*${"```"}`;

export default definePlugin({
    name: "FixCodeblockGap",
    description: "Removes the gap between code blocks and the text below them",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Supprime l'espace entre les blocs de code et le texte en dessous"
        }
    },

    patches: [
        {
            find: CODEBLOCK_RULE,
            replacement: {
                match: CODEBLOCK_RULE,
                replace: "$&\\n?"
            }
        }
    ]
});
