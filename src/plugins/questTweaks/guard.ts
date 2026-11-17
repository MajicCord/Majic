/*
 * Majic — QuestTweaks account session guard
 */

import { getCurrentUserId } from "./settings/access";

let accountSessionGeneration = 0;

export function bumpAccountSessionGeneration(): void {
    accountSessionGeneration++;
}

export function createQuestEnrollmentGuard(): () => boolean {
    const userId = getCurrentUserId();
    const generation = accountSessionGeneration;

    return () => userId !== null && getCurrentUserId() === userId && accountSessionGeneration === generation;
}
