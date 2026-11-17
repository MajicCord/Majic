/*
 * Majic — QuestTweaks settings access
 */

import { Stores } from "@webpack/common";

import { settings } from "./store";

interface QuestTweaksSettingsOverrides {
    usedKonamiCode?: boolean;
    autoEnrollQuestsUnpaused?: boolean;
    autoCompleteQuestsUnpaused?: boolean;
    enrollmentRateLimitBlockedUntil?: Record<string, number>;
    ignoredQuestIDs: Record<string, string[]>;
    resumeQuestIDs: Record<string, { timestamp: number; questIDs: string[]; automaticQuestIDs?: string[] }>;
}

export type QuestTweaksSettings = Omit<typeof settings.store, keyof QuestTweaksSettingsOverrides> & QuestTweaksSettingsOverrides;

export function getQuestTweaksSettings(): QuestTweaksSettings {
    return settings.store as unknown as QuestTweaksSettings;
}

export function useQuestTweaksSettings<K extends keyof QuestTweaksSettings & string>(keys: readonly K[]): Pick<QuestTweaksSettings, K> {
    return settings.use(keys as any) as unknown as Pick<QuestTweaksSettings, K>;
}

export function getCurrentUserId(userId?: string): string | null {
    return userId ?? Stores.UserStore.getCurrentUser()?.id ?? null;
}
