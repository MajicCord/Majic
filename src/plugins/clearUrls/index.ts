/*
 * Majic — ClearURLs plugin
 */

import type { MessageObject } from "@api/messageEvents";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";

const logger = new Logger("ClearURLs", "#50fa7b");

const RULES_URL = "https://rules2.clearurls.xyz/data.minify.json";
const FALLBACK_RULES_URL = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";
const URL_PATTERN = /https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s]/g;

interface Provider {
    urlPattern: string;
    rules?: string[];
    rawRules?: string[];
    exceptions?: string[];
}

interface CompiledProvider {
    url: RegExp;
    params: RegExp[];
    raw: RegExp[];
    exceptions: RegExp[];
}

let providers: CompiledProvider[] = [];

const compile = (patterns: string[] | undefined) => (patterns ?? []).map(pattern => new RegExp(pattern, "i"));

async function loadRules() {
    for (const source of [RULES_URL, FALLBACK_RULES_URL]) {
        try {
            const data: { providers: Record<string, Provider> } = await fetch(source).then(res => res.json());
            providers = Object.values(data.providers).map(provider => ({
                url: new RegExp(provider.urlPattern, "i"),
                params: compile(provider.rules),
                raw: compile(provider.rawRules),
                exceptions: compile(provider.exceptions)
            }));
            logger.info(`Loaded ${providers.length} tracking rules`);
            return;
        } catch (err) {
            logger.warn(`Could not load rules from ${source}`, err);
        }
    }
}

export function cleanUrl(link: string) {
    let url: URL;
    try {
        url = new URL(link);
    } catch {
        return link;
    }

    for (const provider of providers) {
        if (!provider.url.test(url.href) || provider.exceptions.some(ex => ex.test(url.href))) continue;

        for (const param of [...url.searchParams.keys()]) {
            if (provider.params.some(rule => rule.test(param))) url.searchParams.delete(param);
        }

        let href = url.href;
        for (const raw of provider.raw) href = href.replace(raw, "");
        try {
            url = new URL(href);
        } catch {
            return link;
        }
    }

    return url.href === link || url.href === `${link}/` ? link : url.href;
}

function cleanMessage(message: MessageObject) {
    if (providers.length && /https?:\/\//.test(message.content)) {
        message.content = message.content.replace(URL_PATTERN, cleanUrl);
    }
}

export default definePlugin({
    name: "ClearURLs",
    description: "Removes tracking parameters from links you send",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Retire les paramètres de pistage des liens que tu envoies"
        }
    },

    start() {
        void loadRules();
    },

    stop() {
        providers = [];
    },

    onBeforeMessageSend(_, message) {
        cleanMessage(message);
    },

    onBeforeMessageEdit(_, __, message) {
        cleanMessage(message);
    }
});
