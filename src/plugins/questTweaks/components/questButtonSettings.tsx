/*
 * Majic — QuestTweaks Quest button settings
 */

import { React } from "@webpack/common";
import type { JSX } from "react";

import { enabledOnStartup } from "../startup";
import { getQuestTweaksSettings, useQuestTweaksSettings } from "../settings/access";
import { type QuestButtonAction, type QuestButtonDisplayMode, type QuestButtonIncludedTypes, type QuestButtonIndicatorMode } from "../settings/def";
import { startAutoFetchingQuests } from "../settings/fetching";
import { validateIgnoredQuests } from "../settings/ignoredQuests";
import { s } from "../strings";
import { QuestRewardType, QuestTaskType } from "../types";
import { canShowBadge, canShowButton, canShowPill } from "../utils/ui";
import { DummyQuestButton } from "./questButton";
import { type ManaSelectOption, SettingsCard, SettingsColorPicker, SettingsDescription, SettingsHeader, SettingsRow, SettingsRowItem, SettingsSelect, SettingsSubheader } from "./shared";

interface QuestButtonIncludedTypeOption {
    label: Parameters<typeof s>[0];
    value: QuestTaskType | QuestRewardType;
}

const questButtonDisplayOptions = [
    { label: "always", value: "always" },
    { label: "unclaimed", value: "unclaimed" },
    { label: "never", value: "never" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestButtonDisplayMode }[];

const questButtonIndicatorOptions = [
    { label: "pill", value: "pill" },
    { label: "badge", value: "badge" },
    { label: "both", value: "both" },
    { label: "none", value: "none" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestButtonIndicatorMode }[];

const questButtonClickOptions = [
    { label: "openQuests", value: "open-quests" },
    { label: "contextMenu", value: "context-menu" },
    { label: "pluginSettings", value: "plugin-settings" },
    { label: "nothing", value: "nothing" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestButtonAction }[];

const questButtonRewardTypeOptions = [
    { label: "orbs", value: QuestRewardType.VIRTUAL_CURRENCY },
    { label: "nitroCodes", value: QuestRewardType.FRACTIONAL_PREMIUM },
    { label: "rewardCodes", value: QuestRewardType.REWARD_CODE },
    { label: "inGameItems", value: QuestRewardType.IN_GAME },
    { label: "profileCollectibles", value: QuestRewardType.COLLECTIBLE },
] as const satisfies readonly QuestButtonIncludedTypeOption[];

const questButtonQuestTypeOptions = [
    { label: "watchVideo", value: QuestTaskType.WATCH_VIDEO },
    { label: "watchVideoOnMobile", value: QuestTaskType.WATCH_VIDEO_ON_MOBILE },
    { label: "achievementInActivity", value: QuestTaskType.ACHIEVEMENT_IN_ACTIVITY },
    { label: "achievementInGame", value: QuestTaskType.ACHIEVEMENT_IN_GAME },
    { label: "playActivity", value: QuestTaskType.PLAY_ACTIVITY },
    { label: "playOnDesktop", value: QuestTaskType.PLAY_ON_DESKTOP },
    { label: "playOnDesktopV2", value: QuestTaskType.PLAY_ON_DESKTOP_V2 },
    { label: "streamOnDesktop", value: QuestTaskType.STREAM_ON_DESKTOP },
    { label: "playOnPlayStation", value: QuestTaskType.PLAY_ON_PLAYSTATION },
    { label: "playOnXbox", value: QuestTaskType.PLAY_ON_XBOX },
] as const satisfies readonly QuestButtonIncludedTypeOption[];

function toManaOptions<T extends string | number>(options: readonly { label: Parameters<typeof s>[0]; value: T }[]): ManaSelectOption[] {
    return options.map(({ label, value }) => ({
        id: String(value),
        label: s(label),
        value: String(value),
    }));
}

export function QuestButtonSetting(): JSX.Element {
    const questButton = useQuestTweaksSettings([
        "disableQuestsEverything",
        "questButtonDisplay",
        "questButtonIncludedTypes",
        "questButtonIndicator",
        "questButtonBadgeCount",
        "questButtonBadgeColor",
        "questButtonLeftClickAction",
        "questButtonMiddleClickAction",
        "questButtonRightClickAction",
    ]);

    const disabled = questButton.disableQuestsEverything;
    const questButtonDisplayManaOptions = toManaOptions(questButtonDisplayOptions);
    const questButtonIndicatorManaOptions = toManaOptions(questButtonIndicatorOptions);
    const questButtonClickManaOptions = toManaOptions(questButtonClickOptions);
    const questButtonRewardTypeManaOptions = toManaOptions(questButtonRewardTypeOptions);
    const questButtonQuestTypeManaOptions = toManaOptions(questButtonQuestTypeOptions);
    const includedTypes = questButton.questButtonIncludedTypes as QuestButtonIncludedTypes;

    const selectedRewardTypes = questButtonRewardTypeOptions
        .filter(({ value }) => includedTypes[value])
        .map(({ value }) => String(value));

    const selectedQuestTypes = questButtonQuestTypeOptions
        .filter(({ value }) => includedTypes[value])
        .map(({ value }) => String(value));

    function updateQuestButtonDisplay(value: string | string[] | null) {
        if (typeof value !== "string") return;

        getQuestTweaksSettings().questButtonDisplay = value as QuestButtonDisplayMode;
        startAutoFetchingQuests(true);
    }

    function updateQuestButtonIndicator(value: string | string[] | null) {
        if (typeof value !== "string") return;

        getQuestTweaksSettings().questButtonIndicator = value as QuestButtonIndicatorMode;
        startAutoFetchingQuests(true);
    }

    function updateQuestButtonAction(key: "questButtonLeftClickAction" | "questButtonMiddleClickAction" | "questButtonRightClickAction", value: string | string[] | null) {
        if (typeof value !== "string") return;

        getQuestTweaksSettings()[key] = value as QuestButtonAction;
    }

    function updateBadgeColor(value: number | null) {
        getQuestTweaksSettings().questButtonBadgeColor = value;
    }

    function updateIncludedTypes(options: readonly QuestButtonIncludedTypeOption[], value: string | string[] | null) {
        const selectedValues = new Set(Array.isArray(value) ? value : value ? [value] : []);
        const nextIncludedTypes = { ...getQuestTweaksSettings().questButtonIncludedTypes };

        for (const option of options) {
            nextIncludedTypes[option.value] = selectedValues.has(String(option.value));
        }

        getQuestTweaksSettings().questButtonIncludedTypes = nextIncludedTypes;
        validateIgnoredQuests();
    }

    return (
        <SettingsCard>
            <SettingsRow>
                <SettingsRowItem>
                    <SettingsHeader>{s("buttonHeader")}</SettingsHeader>
                    <SettingsDescription>{s("buttonDescription")}</SettingsDescription>
                </SettingsRowItem>
                {enabledOnStartup && <SettingsRowItem width="content">
                    <DummyQuestButton
                        badgeColor={questButton.questButtonBadgeColor}
                        leftClickAction={questButton.questButtonLeftClickAction}
                        middleClickAction={questButton.questButtonMiddleClickAction}
                        rightClickAction={questButton.questButtonRightClickAction}
                        showBadge={canShowBadge(questButton.questButtonIndicator)}
                        showPill={canShowPill(questButton.questButtonIndicator)}
                        visible={canShowButton(questButton.questButtonDisplay)}
                    />
                </SettingsRowItem>}
            </SettingsRow>
            <SettingsSubheader className="no-top-margin">{s("buttonBehavior")}</SettingsSubheader>
            <SettingsRow>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("leftClick")}
                        options={questButtonClickManaOptions}
                        value={questButton.questButtonLeftClickAction}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        onSelectionChange={value => updateQuestButtonAction("questButtonLeftClickAction", value)}
                    />
                </SettingsRowItem>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("middleClick")}
                        options={questButtonClickManaOptions}
                        value={questButton.questButtonMiddleClickAction}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        onSelectionChange={value => updateQuestButtonAction("questButtonMiddleClickAction", value)}
                    />
                </SettingsRowItem>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("rightClick")}
                        options={questButtonClickManaOptions}
                        value={questButton.questButtonRightClickAction}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        onSelectionChange={value => updateQuestButtonAction("questButtonRightClickAction", value)}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsRow>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("buttonVisibility")}
                        options={questButtonDisplayManaOptions}
                        value={questButton.questButtonDisplay}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        onSelectionChange={updateQuestButtonDisplay}
                        tooltip={{
                            position: "top",
                            text: s("buttonVisibilityTooltip")
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("unclaimedIndicator")}
                        options={questButtonIndicatorManaOptions}
                        value={questButton.questButtonIndicator}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        onSelectionChange={updateQuestButtonIndicator}
                        tooltip={{
                            position: "top",
                            text: s("unclaimedIndicatorTooltip")
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem>
                    <SettingsColorPicker
                        label={s("badgeColor")}
                        className="quest-button-color-picker"
                        color={questButton.questButtonBadgeColor}
                        disabled={disabled}
                        onChange={updateBadgeColor}
                        showEyeDropper={true}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsSubheader>{s("questRelevancy")}</SettingsSubheader>
            <SettingsSelect
                label={s("includedRewardTypes")}
                wrapTags={true}
                options={questButtonRewardTypeManaOptions}
                value={selectedRewardTypes}
                closeOnSelect={false}
                maxOptionsVisible={questButtonRewardTypeManaOptions.length}
                selectionMode="multiple"
                disabled={disabled}
                fullWidth={true}
                onSelectionChange={value => updateIncludedTypes(questButtonRewardTypeOptions, value)}
                tooltip={{
                    position: "top",
                    text: s("includedRewardTypesTooltip")
                }}
            />
            <SettingsSelect
                label={s("includedQuestTypes")}
                labelClassName="margin-top-9"
                wrapTags={true}
                options={questButtonQuestTypeManaOptions}
                value={selectedQuestTypes}
                closeOnSelect={false}
                maxOptionsVisible={questButtonQuestTypeManaOptions.length}
                selectionMode="multiple"
                disabled={disabled}
                fullWidth={true}
                onSelectionChange={value => updateIncludedTypes(questButtonQuestTypeOptions, value)}
                tooltip={{
                    position: "top",
                    text: s("includedQuestTypesTooltip")
                }}
            />
        </SettingsCard>
    );
}
