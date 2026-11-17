/*
 * Majic — QuestTweaks dangerous settings reset
 */

import { getQuestTweaksSettings } from "./access";
import { defaultAllowChangingDangerousSettings, defaultAutoCompleteQuests, defaultAutoCompleteQuestsSimultaneously, defaultAutoCompleteQuestTypes, defaultAutoEnrollQuests, defaultCompleteVideoQuestsQuicker, defaultHideNonAutoCompletableQuests, defaultMakeMobileVideoQuestsDesktopCompatible, defaultPreventVideoQuestsPausing, defaultResumeInterruptedQuests } from "./def";
import { validateIgnoredQuests } from "./ignoredQuests";

export function resetDangerousSettings(): void {
    const settings = getQuestTweaksSettings();

    settings.allowChangingDangerousSettings = defaultAllowChangingDangerousSettings;
    settings.autoEnrollQuests = defaultAutoEnrollQuests;
    settings.autoCompleteQuests = defaultAutoCompleteQuests;
    settings.autoCompleteQuestsSimultaneously = defaultAutoCompleteQuestsSimultaneously;
    settings.completeVideoQuestsQuicker = defaultCompleteVideoQuestsQuicker;
    settings.hideNonAutoCompletableQuests = defaultHideNonAutoCompletableQuests;
    settings.makeMobileVideoQuestsDesktopCompatible = defaultMakeMobileVideoQuestsDesktopCompatible;
    settings.preventVideoQuestsPausing = defaultPreventVideoQuestsPausing;
    settings.resumeInterruptedQuests = defaultResumeInterruptedQuests;
    settings.autoCompleteQuestTypes = { ...defaultAutoCompleteQuestTypes };

    validateIgnoredQuests();
}
