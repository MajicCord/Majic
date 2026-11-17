/*
 * Majic — QuestTweaks types
 */

export type Quest = any;
export type QuestUserStatus = any;
export type User = any;

export enum QuestRewardType {
    REWARD_CODE = 1,
    IN_GAME = 2,
    COLLECTIBLE = 3,
    VIRTUAL_CURRENCY = 4,
    FRACTIONAL_PREMIUM = 5
}

export enum QuestTargetedContent {
    QUEST_HOME_DESKTOP = 11
}

export enum QuestTaskType {
    STREAM_ON_DESKTOP = "STREAM_ON_DESKTOP",
    PLAY_ON_DESKTOP = "PLAY_ON_DESKTOP",
    PLAY_ON_XBOX = "PLAY_ON_XBOX",
    PLAY_ON_PLAYSTATION = "PLAY_ON_PLAYSTATION",
    PLAY_ON_DESKTOP_V2 = "PLAY_ON_DESKTOP_V2",
    WATCH_VIDEO = "WATCH_VIDEO",
    WATCH_VIDEO_ON_MOBILE = "WATCH_VIDEO_ON_MOBILE",
    PLAY_ACTIVITY = "PLAY_ACTIVITY",
    ACHIEVEMENT_IN_GAME = "ACHIEVEMENT_IN_GAME",
    ACHIEVEMENT_IN_ACTIVITY = "ACHIEVEMENT_IN_ACTIVITY"
}

export enum QuestTaskJoinOperator {
    AND = "and",
    OR = "or"
}
