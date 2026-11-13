/*
 * Majic — FixDiscordCss core plugin
 */

import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";

const logger = new Logger("FixDiscordCss", "#ffb86c");
const SLOW_SELECTOR = ":has(.gameOption_";

let observer: MutationObserver | null = null;

function stopWatching() {
    observer?.disconnect();
    observer = null;
}

function removeSlowRule(sheet: CSSStyleSheet | null) {
    let rules: CSSRuleList;
    try {
        if (!sheet?.cssRules) return;
        rules = sheet.cssRules;
    } catch {
        return;
    }

    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i] as CSSStyleRule;
        if (!rule.selectorText?.includes(SLOW_SELECTOR)) continue;

        logger.info("Removed problematic CSS rule", rule.cssText);
        sheet.deleteRule(i);
        stopWatching();
        return;
    }
}

function onAddedNode(node: Node) {
    if (!(node instanceof HTMLLinkElement) || node.rel !== "stylesheet") return;

    if (node.sheet) removeSlowRule(node.sheet);
    else node.addEventListener("load", () => removeSlowRule(node.sheet), { once: true });
}

export default definePlugin({
    name: "FixDiscordCss",
    description: "Fixes Discord's CSS lag",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Corrige les ralentissements causés par le CSS de Discord"
        }
    },
    required: true,
    startAt: "DOMContentLoaded",

    start() {
        observer = new MutationObserver(mutations => {
            for (const mutation of mutations) mutation.addedNodes.forEach(onAddedNode);
        });
        observer.observe(document.head, { childList: true });
    },

    stop() {
        stopWatching();
    }
});
