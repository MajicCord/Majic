/*
 * Majic — QuestTweaks ignored Quests
 */

import { Stores } from "@webpack/common";

import type { Quest } from "../types";
import type { QuestIncludedTypes } from "../utils/filtering";
import { countIncludedUnclaimedQuests, getQuestStatus, QuestStatus } from "../utils/questState";
import { getQuestTweaksSettings } from "./access";
import { ignoredQuestIDsKey } from "./def";
import { rerenderQuests } from "./rerender";

function validateQuestBadgeCount(): void {
    const settings = getQuestTweaksSettings();
    const questButtonIncludedTypes = settings.questButtonIncludedTypes as QuestIncludedTypes;
    const quests = Array.from(Stores.QuestStore.quests.values()) as Quest[];
    const ignoredQuestIds = getIgnoredQuestIDs();
    const count = countIncludedUnclaimedQuests(quests, ignoredQuestIds, questButtonIncludedTypes);

    settings.questButtonBadgeCount = count;
}

export function getIgnoredQuestIDs(): string[] {
    const { ignoredQuestIDs } = getQuestTweaksSettings();
    const ignoredQuestIDsForKey = Array.from(ignoredQuestIDs[ignoredQuestIDsKey] ?? []);
    return ignoredQuestIDsForKey;
}

function setIgnoredQuestIDs(questIDs: string[]): void {
    getQuestTweaksSettings().ignoredQuestIDs[ignoredQuestIDsKey] = questIDs;
}

export function validateIgnoredQuests(qs?: Quest[]): void {
    const currentlyIgnoredQuests = getIgnoredQuestIDs();
    const quests: Quest[] = qs ?? Array.from(Stores.QuestStore.quests.values());
    const excludedQuests: Quest[] = Array.from(Stores.QuestStore.excludedQuests.values());
    const validIgnored = Array.from(new Set<string>(currentlyIgnoredQuests.filter(id => quests.some(quest => quest.id === id) || excludedQuests.some(quest => quest.id === id))));

    setIgnoredQuestIDs(validIgnored);
    validateQuestBadgeCount();
    rerenderQuests();
}

export function resetIgnoredQuests(): void {
    setIgnoredQuestIDs([]);
    validateIgnoredQuests();
}

export function addIgnoredQuest(questId: string): void {
    setIgnoredQuestIDs(Array.from(new Set([...getIgnoredQuestIDs(), questId])));
    validateIgnoredQuests();
}

export function removeIgnoredQuest(questId: string): void {
    setIgnoredQuestIDs(getIgnoredQuestIDs().filter(id => id !== questId));
    validateIgnoredQuests();
}

export function questIsIgnored(questId: string): boolean {
    return getIgnoredQuestIDs().includes(questId);
}

export function ignoreAllQuests(): void {
    const currentlyIgnored = new Set(getIgnoredQuestIDs());
    const ignoredQuests = new Set<string>();

    for (const quest of Stores.QuestStore.quests.values() as Iterable<Quest>) {
        if (
            currentlyIgnored.has(quest.id)
            || getQuestStatus(quest, Array.from(currentlyIgnored), false) === QuestStatus.Unclaimed
        ) {
            ignoredQuests.add(quest.id);
        }
    }

    for (const quest of Stores.QuestStore.excludedQuests.values() as Iterable<Quest>) {
        if (currentlyIgnored.has(quest.id)) {
            ignoredQuests.add(quest.id);
        }
    }

    setIgnoredQuestIDs(Array.from(ignoredQuests));
    validateIgnoredQuests();
}
