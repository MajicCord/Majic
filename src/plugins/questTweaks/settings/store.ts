/*
 * Majic — QuestTweaks settings
 */

import { definePluginSettings, saveSettings, settings as majicSettings } from "@api/settings";
import { OptionType } from "@utils/types";

import { defaultAcknowledgedNotices, defaultAllowChangingDangerousSettings, defaultAutoCompleteQuests, defaultAutoCompleteQuestsSimultaneously, defaultAutoCompleteQuestTypes, defaultAutoEnrollQuests, defaultClaimedSubsort, defaultCompleteVideoQuestsQuicker, defaultDisableAccountPanelPromo, defaultDisableAccountPanelQuestProgress, defaultDisableFriendsListPromo, defaultDisableMembersListPromo, defaultDisableOrbsAndQuestsBadges, defaultDisableQuestsEverything, defaultDisableRelocationNotices, defaultDisableSponsoredBanner, defaultExpiredSubsort, defaultHiddenQuestStatuses, defaultHideNonAutoCompletableQuests, defaultIgnoredQuestIDs, defaultIgnoredSubsort, defaultIsOnQuestsPage, defaultLastQuestPageFilters, defaultLastQuestPageSort, defaultLeftClickAction, defaultMakeMobileVideoQuestsDesktopCompatible, defaultMiddleClickAction, defaultNewExcludedQuestAlertSound, defaultNewExcludedQuestAlertVolume, defaultNewQuestAlertSound, defaultNewQuestAlertVolume, defaultNotifyOnNewExcludedQuests, defaultNotifyOnNewQuests, defaultNotifyOnQuestComplete, defaultPreventVideoQuestsPausing, defaultQuestButtonBadgeColor, defaultQuestButtonBadgeCount, defaultQuestButtonDisplay, defaultQuestButtonIncludedTypes, defaultQuestButtonIndicator, defaultQuestCompletedAlertSound, defaultQuestCompletedAlertVolume, defaultQuestFetchInterval, defaultQuestOrder, defaultQuestTileClaimedColorSetting, defaultQuestTileExpiredColorSetting, defaultQuestTileGradient, defaultQuestTileIgnoredColorSetting, defaultQuestTilePreload, defaultQuestTileUnclaimedColorSetting, defaultRememberQuestPageFilters, defaultRememberQuestPageSort, defaultResumeInterruptedQuests, defaultResumeQuestIDs, defaultRightClickAction, defaultUnclaimedSubsort, type QuestButtonAction, type QuestButtonDisplayMode, type QuestButtonIncludedTypes, type QuestButtonIndicatorMode, type QuestOrderStatus } from "./def";

export const PLUGIN_NAME = "QuestTweaks";

const MIGRATION_TARGET = 1;
const CURRENT_SETTINGS = majicSettings.plugins[PLUGIN_NAME];

if (CURRENT_SETTINGS) {
    let migrationVersion = (CURRENT_SETTINGS.migrationVersion as number | undefined) ?? 0;

    if (migrationVersion === 0) {
        majicSettings.plugins[PLUGIN_NAME] = { enabled: CURRENT_SETTINGS.enabled, migrationVersion: 1 };
        migrationVersion = 1;
    }

    if (migrationVersion !== CURRENT_SETTINGS.migrationVersion) {
        saveSettings();
    }
}

const hidden = () => true;

export const settings = definePluginSettings({
    migrationVersion: {
        type: OptionType.NUMBER,
        description: "The current migration version of the settings.",
        default: MIGRATION_TARGET,
        hidden
    },
    acknowledgedNotices: {
        type: OptionType.CUSTOM,
        description: "One-time notices that the user has acknowledged.",
        default: { ...defaultAcknowledgedNotices },
        hidden
    },
    disableQuestsEverything: {
        type: OptionType.BOOLEAN,
        description: "Disable all Quest features.",
        default: defaultDisableQuestsEverything,
        restartNeeded: true,
        hidden
    },
    disableRelocationNotices: {
        type: OptionType.BOOLEAN,
        description: "Disable Quest relocation notices in the Discovery page.",
        default: defaultDisableRelocationNotices,
        restartNeeded: true,
        hidden
    },
    disableSponsoredBanner: {
        type: OptionType.BOOLEAN,
        description: "Disable the sponsored banner on the Quest page.",
        default: defaultDisableSponsoredBanner,
        restartNeeded: true,
        hidden
    },
    disableAccountPanelPromo: {
        type: OptionType.BOOLEAN,
        description: "Disable the promoted Quest popup above your account panel.",
        default: defaultDisableAccountPanelPromo,
        restartNeeded: true,
        hidden
    },
    disableAccountPanelQuestProgress: {
        type: OptionType.BOOLEAN,
        description: "Disable active and completed Quest progress above your account panel.",
        default: defaultDisableAccountPanelQuestProgress,
        restartNeeded: true,
        hidden
    },
    disableOrbsAndQuestsBadges: {
        type: OptionType.BOOLEAN,
        description: "Disable the Quest badge on user profiles.",
        default: defaultDisableOrbsAndQuestsBadges,
        restartNeeded: true,
        hidden
    },
    disableFriendsListPromo: {
        type: OptionType.BOOLEAN,
        description: "Disable the promotion of Quests for games played by friends.",
        default: defaultDisableFriendsListPromo,
        restartNeeded: true,
        hidden
    },
    disableMembersListPromo: {
        type: OptionType.BOOLEAN,
        description: "Disable the actively playing icon in members list items.",
        default: defaultDisableMembersListPromo,
        restartNeeded: true,
        hidden
    },
    allowChangingDangerousSettings: {
        type: OptionType.BOOLEAN,
        description: "Allow changing dangerous settings.",
        default: defaultAllowChangingDangerousSettings,
        hidden
    },
    resumeInterruptedQuests: {
        type: OptionType.BOOLEAN,
        description: "Resume auto-completing Quests after a reload or restart.",
        default: defaultResumeInterruptedQuests,
        restartNeeded: true,
        hidden
    },
    makeMobileVideoQuestsDesktopCompatible: {
        type: OptionType.BOOLEAN,
        description: "Make mobile-only Video Quests compatible with desktop.",
        default: defaultMakeMobileVideoQuestsDesktopCompatible,
        restartNeeded: true,
        hidden
    },
    hideNonAutoCompletableQuests: {
        type: OptionType.BOOLEAN,
        description: "Hide incomplete Quests without a supported and enabled auto-complete task.",
        default: defaultHideNonAutoCompletableQuests,
        hidden
    },
    autoEnrollQuests: {
        type: OptionType.BOOLEAN,
        description: "Automatically enroll in eligible available Quests on successful fetches while Discord is running.",
        default: defaultAutoEnrollQuests,
        hidden
    },
    autoCompleteQuests: {
        type: OptionType.BOOLEAN,
        description: "Automatically enroll in and complete eligible available Quests with supported and enabled task types on successful fetches while Discord is running.",
        default: defaultAutoCompleteQuests,
        hidden
    },
    autoCompleteQuestsSimultaneously: {
        type: OptionType.BOOLEAN,
        description: "Complete Quests simultaneously rather than sequentially.",
        default: defaultAutoCompleteQuestsSimultaneously,
        restartNeeded: true,
        hidden
    },
    completeVideoQuestsQuicker: {
        type: OptionType.BOOLEAN,
        description: "Use Discord's progress leeway and elapsed enrollment time for Video Quest auto-completion.",
        default: defaultCompleteVideoQuestsQuicker,
        restartNeeded: true,
        hidden
    },
    preventVideoQuestsPausing: {
        type: OptionType.BOOLEAN,
        description: "Prevent pausing the video when the Quest modal loses focus.",
        default: defaultPreventVideoQuestsPausing,
        restartNeeded: true,
        hidden
    },
    autoCompleteQuestTypes: {
        type: OptionType.CUSTOM,
        description: "Which types of Quests to auto-complete in the background.",
        default: defaultAutoCompleteQuestTypes,
        restartNeeded: true,
        hidden
    },
    questButtonDisplay: {
        type: OptionType.CUSTOM,
        description: "Which display type to use for the Quest button in the server list.",
        default: defaultQuestButtonDisplay as QuestButtonDisplayMode,
        restartNeeded: true,
        hidden
    },
    questButtonIncludedTypes: {
        type: OptionType.CUSTOM,
        description: "Which reward types and Quest types to include when displaying Quest counts on the Quest button.",
        default: defaultQuestButtonIncludedTypes as QuestButtonIncludedTypes,
        hidden
    },
    questButtonIndicator: {
        type: OptionType.CUSTOM,
        description: "Which display type to use for the unclaimed indicator on the Quest button in the server list.",
        default: defaultQuestButtonIndicator as QuestButtonIndicatorMode,
        hidden
    },
    questButtonBadgeCount: {
        type: OptionType.NUMBER,
        description: "The current number of relevant unclaimed Quests.",
        default: defaultQuestButtonBadgeCount,
        hidden
    },
    questButtonBadgeColor: {
        type: OptionType.CUSTOM,
        description: "The color of the Quest button badge in the server list.",
        default: defaultQuestButtonBadgeColor as number | null,
        hidden
    },
    questButtonLeftClickAction: {
        type: OptionType.CUSTOM,
        description: "The action to perform when left-clicking the Quest button in the server list.",
        default: defaultLeftClickAction as QuestButtonAction,
        hidden
    },
    questButtonMiddleClickAction: {
        type: OptionType.CUSTOM,
        description: "The action to perform when middle-clicking the Quest button in the server list.",
        default: defaultMiddleClickAction as QuestButtonAction,
        hidden
    },
    questButtonRightClickAction: {
        type: OptionType.CUSTOM,
        description: "The action to perform when right-clicking the Quest button in the server list.",
        default: defaultRightClickAction as QuestButtonAction,
        hidden
    },
    notifyOnQuestComplete: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when a Quest is completed.",
        default: defaultNotifyOnQuestComplete,
        hidden
    },
    notifyOnNewQuests: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when new Quests are detected.",
        default: defaultNotifyOnNewQuests,
        hidden
    },
    notifyOnNewExcludedQuests: {
        type: OptionType.BOOLEAN,
        description: "Show a notification when new excluded Quests are detected.",
        default: defaultNotifyOnNewExcludedQuests,
        hidden
    },
    questCompletedAlertSound: {
        type: OptionType.CUSTOM,
        description: "The sound to play when a Quest is completed.",
        default: defaultQuestCompletedAlertSound as string | null,
        hidden
    },
    questCompletedAlertVolume: {
        type: OptionType.NUMBER,
        description: "The volume for the Quest completed alert sound.",
        default: defaultQuestCompletedAlertVolume,
        hidden
    },
    questFetchInterval: {
        type: OptionType.NUMBER,
        description: "The interval in seconds to fetch Quests from Discord.",
        default: defaultQuestFetchInterval,
        hidden
    },
    newQuestAlertSound: {
        type: OptionType.CUSTOM,
        description: "The sound to play when new Quests are detected.",
        default: defaultNewQuestAlertSound as string | null,
        hidden
    },
    newQuestAlertVolume: {
        type: OptionType.NUMBER,
        description: "The volume for the new Quest alert sound.",
        default: defaultNewQuestAlertVolume,
        hidden
    },
    newExcludedQuestAlertSound: {
        type: OptionType.CUSTOM,
        description: "The sound to play when new excluded Quests are detected.",
        default: defaultNewExcludedQuestAlertSound as string | null,
        hidden
    },
    newExcludedQuestAlertVolume: {
        type: OptionType.NUMBER,
        description: "The volume for the new excluded Quest alert sound.",
        default: defaultNewExcludedQuestAlertVolume,
        hidden
    },
    questTileUnclaimedColor: {
        type: OptionType.CUSTOM,
        description: "The color of unclaimed Quest tiles in the Quests page.",
        default: { ...defaultQuestTileUnclaimedColorSetting },
        hidden
    },
    questTileClaimedColor: {
        type: OptionType.CUSTOM,
        description: "The color of claimed Quest tiles in the Quests page.",
        default: { ...defaultQuestTileClaimedColorSetting },
        hidden
    },
    questTileIgnoredColor: {
        type: OptionType.CUSTOM,
        description: "The color of ignored Quest tiles in the Quests page.",
        default: { ...defaultQuestTileIgnoredColorSetting },
        hidden
    },
    questTileExpiredColor: {
        type: OptionType.CUSTOM,
        description: "The color of expired Quest tiles in the Quests page.",
        default: { ...defaultQuestTileExpiredColorSetting },
        hidden
    },
    questTileGradient: {
        type: OptionType.STRING,
        description: "Style of the gradient used in the Quest tiles.",
        default: defaultQuestTileGradient as string,
        hidden
    },
    questTilePreload: {
        type: OptionType.BOOLEAN,
        description: "Attempt to preload the assets for the Quest tiles.",
        default: defaultQuestTilePreload,
        hidden
    },
    questOrder: {
        type: OptionType.CUSTOM,
        description: "Sort order for Quest status groups.",
        default: Array.from(defaultQuestOrder) as QuestOrderStatus[],
        hidden
    },
    hiddenQuestStatuses: {
        type: OptionType.CUSTOM,
        description: "Quest status groups to hide.",
        default: Array.from(defaultHiddenQuestStatuses),
        hidden
    },
    unclaimedSubsort: {
        type: OptionType.STRING,
        description: "Subsort method for unclaimed Quests.",
        default: defaultUnclaimedSubsort as string,
        hidden
    },
    claimedSubsort: {
        type: OptionType.STRING,
        description: "Subsort method for claimed Quests.",
        default: defaultClaimedSubsort as string,
        hidden
    },
    ignoredSubsort: {
        type: OptionType.STRING,
        description: "Subsort method for ignored Quests.",
        default: defaultIgnoredSubsort as string,
        hidden
    },
    expiredSubsort: {
        type: OptionType.STRING,
        description: "Subsort method for expired Quests.",
        default: defaultExpiredSubsort as string,
        hidden
    },
    isOnQuestsPage: {
        type: OptionType.BOOLEAN,
        description: "Whether the user is currently on the Quests page.",
        default: defaultIsOnQuestsPage,
        hidden
    },
    rememberQuestPageSort: {
        type: OptionType.BOOLEAN,
        description: "Remember the last used sort on the Quests page.",
        default: defaultRememberQuestPageSort,
        hidden
    },
    rememberQuestPageFilters: {
        type: OptionType.BOOLEAN,
        description: "Remember the last used filters on the Quests page.",
        default: defaultRememberQuestPageFilters,
        hidden
    },
    lastQuestPageSort: {
        type: OptionType.STRING,
        description: "Remember the last used sort on the Quests page.",
        default: defaultLastQuestPageSort as string,
        hidden
    },
    lastQuestPageFilters: {
        type: OptionType.CUSTOM,
        description: "Remember the last used filters on the Quests page.",
        default: defaultLastQuestPageFilters,
        hidden
    },
    ignoredQuestIDs: {
        type: OptionType.CUSTOM,
        description: "An array of Quest IDs that are ignored.",
        default: defaultIgnoredQuestIDs,
        hidden
    },
    resumeQuestIDs: {
        type: OptionType.CUSTOM,
        description: "An array of Quest IDs that are being or are queued to be auto-completed in the background.",
        default: defaultResumeQuestIDs,
        hidden
    }
});
