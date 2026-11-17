/*
 * Majic — QuestTweaks logging
 */

import { showNotification } from "@api/notifications";
import { Logger } from "@utils/logger";
import { NavigationRouter } from "@webpack/common";

import { s } from "../strings";
import type { Quest } from "../types";
import { normalizeQuestName } from "./filtering";
import { QUEST_PAGE } from "./ui";

const LOG = new Logger("QuestTweaks", "#5865f2");

export function getFormattedNow(): string {
    return new Date().toLocaleString(undefined, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    }).replace(",", "");
}

function getLogPrefix(source: string): string {
    return `[${getFormattedNow()}] [${source}]\n`;
}

function emitLog(level: string, source: string, ...args: unknown[]): void {
    const prefix = args.length ? getLogPrefix(source) : getLogPrefix(source).trim();

    switch (level) {
        case "debug":
            LOG.debug(prefix, ...args);

            return;
        case "error":
            LOG.error(prefix, ...args);

            return;
        case "info":
            LOG.info(prefix, ...args);

            return;
        case "warn":
            LOG.warn(prefix, ...args);

            return;
        default:
            LOG.log(prefix, ...args);

            return;
    }
}

export const QL = {
    log(source: string, ...args: unknown[]): void { emitLog("log", source, ...args); },
    info(source: string, ...args: unknown[]): void { emitLog("info", source, ...args); },
    warn(source: string, ...args: unknown[]): void { emitLog("warn", source, ...args); },
    error(source: string, ...args: unknown[]): void { emitLog("error", source, ...args); },
    debug(source: string, ...args: unknown[]): void { emitLog("debug", source, ...args); }
};

export function notifyQuestCompletion(quest?: Quest): void {
    if (!quest) return;

    void showNotification({
        title: s("questCompletedTitle"),
        body: s("questCompletedBody", { name: normalizeQuestName(quest) }),
        onClick: () => NavigationRouter.transitionTo(`${QUEST_PAGE}#${quest.id}`)
    });

    QL.log("NOTIFY_QUEST_COMPLETION", { quest });
}
