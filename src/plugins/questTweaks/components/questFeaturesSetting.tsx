/*
 * Majic — QuestTweaks Quest features settings
 */

import { React } from "@webpack/common";
import type { JSX } from "react";

import { getQuestTweaksSettings, useQuestTweaksSettings } from "../settings/access";
import { resetDangerousSettings } from "../settings/dangerous";
import { autoCompleteQuestTaskTypes, defaultAutoCompleteQuestTypes, isAutoCompleteCompatible } from "../settings/def";
import { validateIgnoredQuests } from "../settings/ignoredQuests";
import { discouraged, s } from "../strings";
import { QuestTaskType } from "../types";
import { Alerts, q } from "../utils/ui";
import { ManaButton, type ManaSelectOption, SettingsCard, SettingsDescription, SettingsHeader, SettingsNotice, SettingsParagraph, SettingsSelect, SettingsSubheader, SettingsSubtleSwitch } from "./shared";

type QuestDisableSettingKey =
    | "disableAccountPanelPromo"
    | "disableAccountPanelQuestProgress"
    | "disableFriendsListPromo"
    | "disableMembersListPromo"
    | "disableOrbsAndQuestsBadges"
    | "disableRelocationNotices"
    | "disableSponsoredBanner";

type QuestModifySettingKey =
    | "autoEnrollQuests"
    | "autoCompleteQuests"
    | "autoCompleteQuestsSimultaneously"
    | "resumeInterruptedQuests"
    | "completeVideoQuestsQuicker"
    | "preventVideoQuestsPausing"
    | "hideNonAutoCompletableQuests"
    | "makeMobileVideoQuestsDesktopCompatible";

interface QuestDisableOption {
    key: QuestDisableSettingKey;
    label: () => string;
}

const disableFeatureOptions = [
    {
        key: "disableSponsoredBanner",
        label: () => s("sponsoredBanner"),
    },
    {
        key: "disableRelocationNotices",
        label: () => s("relocationNotices"),
    },
    {
        key: "disableFriendsListPromo",
        label: () => s("friendsListPromo"),
    },
    {
        key: "disableMembersListPromo",
        label: () => s("membersListPromo"),
    },
    {
        key: "disableAccountPanelPromo",
        label: () => s("accountPanelPromo"),
    },
    {
        key: "disableAccountPanelQuestProgress",
        label: () => s("accountPanelProgress"),
    },
    {
        key: "disableOrbsAndQuestsBadges",
        label: () => s("questOrbsBadges"),
    },
] as const satisfies readonly QuestDisableOption[];

const getDisableManaOptions = (): ManaSelectOption[] => disableFeatureOptions.map(({ key, label }) => ({
    id: key,
    label: label(),
    value: key,
}));

const autoCompleteQuestTypeLabels = {
    [QuestTaskType.WATCH_VIDEO]: "watchVideo",
    [QuestTaskType.WATCH_VIDEO_ON_MOBILE]: "watchVideoOnMobile",
    [QuestTaskType.ACHIEVEMENT_IN_ACTIVITY]: "achievementInActivity",
    [QuestTaskType.PLAY_ACTIVITY]: "playActivity",
    [QuestTaskType.PLAY_ON_DESKTOP]: "playOnDesktop",
    [QuestTaskType.PLAY_ON_PLAYSTATION]: "playOnPlayStation",
    [QuestTaskType.PLAY_ON_XBOX]: "playOnXbox",
} as const satisfies Record<typeof autoCompleteQuestTaskTypes[number], Parameters<typeof s>[0]>;

const autoCompleteQuestTypeOptions = autoCompleteQuestTaskTypes.map(questType => ({
    label: autoCompleteQuestTypeLabels[questType],
    value: questType,
}));

const getAutoCompleteQuestTypeManaOptions = (): ManaSelectOption[] => autoCompleteQuestTypeOptions.map(({ label, value }) => ({
    id: String(value),
    label: s(label),
    value: String(value),
    disabled: !isAutoCompleteCompatible(value),
}));

export function QuestFeaturesSetting(): JSX.Element {
    const questFeatures = useQuestTweaksSettings([
        "disableQuestsEverything",
        "disableSponsoredBanner",
        "disableRelocationNotices",
        "disableFriendsListPromo",
        "disableMembersListPromo",
        "disableAccountPanelPromo",
        "disableAccountPanelQuestProgress",
        "disableOrbsAndQuestsBadges",
        "resumeInterruptedQuests",
        "allowChangingDangerousSettings",
        "makeMobileVideoQuestsDesktopCompatible",
        "usedKonamiCode",
        "autoEnrollQuests",
        "autoCompleteQuests",
        "autoCompleteQuestsSimultaneously",
        "autoCompleteQuestTypes",
        "completeVideoQuestsQuicker",
        "preventVideoQuestsPausing",
        "hideNonAutoCompletableQuests",
    ]);

    const selectedDisableValues = disableFeatureOptions
        .filter(({ key }) => questFeatures[key])
        .map(({ key }) => key);

    const selectedAutoCompleteQuestTypeValues = autoCompleteQuestTypeOptions
        .filter(({ value }) => isAutoCompleteCompatible(value) && questFeatures.autoCompleteQuestTypes[value] === true)
        .map(({ value }) => String(value));

    function updateDisableValue(value: string | string[] | null) {
        const selectedKeys = new Set(Array.isArray(value) ? value : value ? [value] : []);

        for (const { key } of disableFeatureOptions) {
            getQuestTweaksSettings()[key] = selectedKeys.has(key);
        }
    }

    function confirmDangerousSettingChange(body: string, onConfirm: () => void) {
        Alerts.show({
            title: s("areYouSure"),
            body,
            confirmText: s("continue"),
            confirmVariant: "critical-primary",
            cancelText: s("cancel"),
            onConfirm,
        });
    }

    function updateAutoCompleteQuestTypes(value: string | string[] | null) {
        const selectedValues = new Set(Array.isArray(value) ? value : value ? [value] : []);
        const nextAutoCompleteQuestTypes = { ...defaultAutoCompleteQuestTypes };

        for (const { value: questType } of autoCompleteQuestTypeOptions) {
            const nextValue = selectedValues.has(String(questType))
                && isAutoCompleteCompatible(questType);

            nextAutoCompleteQuestTypes[questType] = nextValue;
        }

        getQuestTweaksSettings().autoCompleteQuestTypes = nextAutoCompleteQuestTypes;
        validateIgnoredQuests();
    }

    function updateDisableEverything(checked: boolean) {
        function setDisableEverything() {
            getQuestTweaksSettings().disableQuestsEverything = checked;
        }

        if (checked) {
            confirmDangerousSettingChange(
                s("confirmDisableEverything"),
                () => {
                    resetDangerousSettings();
                    setDisableEverything();
                }
            );
        } else {
            setDisableEverything();
        }
    }

    function updateDangerousAccess(checked: boolean) {
        function setDangerousAccess() {
            getQuestTweaksSettings().allowChangingDangerousSettings = checked;
        }

        if (checked) {
            confirmDangerousSettingChange(
                s("confirmDangerous"),
                setDangerousAccess
            );
        } else {
            resetDangerousSettings();
            setDangerousAccess();
        }
    }

    function updateModifyValue(key: QuestModifySettingKey, checked: boolean) {
        getQuestTweaksSettings()[key] = checked;

        if (key === "hideNonAutoCompletableQuests" || key === "makeMobileVideoQuestsDesktopCompatible") {
            validateIgnoredQuests();
        }
    }

    return (
        <SettingsCard>
            <SettingsHeader>{s("featuresHeader")}</SettingsHeader>
            <SettingsDescription>{s("featuresDescription")}</SettingsDescription>
            <SettingsSubheader>{s("disableFeatures")}</SettingsSubheader>
            <SettingsSubtleSwitch
                checked={questFeatures.disableQuestsEverything}
                label={s("disableEverything")}
                onChange={updateDisableEverything}
                bottomSpacing="10"
                tooltip={{
                    position: "top",
                    text: s("disableEverythingTooltip")
                }}
            />
            <SettingsSelect
                label={s("disableSpecific")}
                wrapTags={true}
                options={getDisableManaOptions()}
                value={selectedDisableValues}
                closeOnSelect={false}
                maxOptionsVisible={7}
                selectionMode="multiple"
                disabled={questFeatures.disableQuestsEverything}
                onSelectionChange={updateDisableValue}
                tooltip={{
                    position: "top",
                    text: s("disableSpecificTooltip")
                }}
            />
            <SettingsSubheader>{s("modifyFeatures")}</SettingsSubheader>
            <SettingsNotice className={["notice-card-red", questFeatures.disableQuestsEverything ? "dimmed-settings-item" : undefined, questFeatures.allowChangingDangerousSettings ? undefined : "notice-card-solo", "no-bottom-margin"].filter(c => c !== undefined)}>
                <SettingsParagraph>
                    {s("dangerText1")} <a href="https://discord.com/safety/platform-manipulation-policy-explainer" target="_blank" rel="noreferrer">{s("termsOfService")}</a>.
                </SettingsParagraph>
                <br />
                <SettingsParagraph>
                    {s("dangerText2")} <strong>{s("dangerText2Strong")}</strong>
                </SettingsParagraph>
                <br />
                <SettingsParagraph>
                    {s("dangerText3")}
                </SettingsParagraph>
                <br />
                <SettingsParagraph>
                    {s("dangerText4")}
                </SettingsParagraph>
                <div className={q("settings-button", "allow-dangerous-button")}>
                    <ManaButton
                        text={questFeatures.allowChangingDangerousSettings
                            ? s("disallowDangerous")
                            : discouraged(s("allowDangerous"))}
                        variant={questFeatures.allowChangingDangerousSettings ? "critical-secondary" : "critical-primary"}
                        fullWidth={true}
                        disabled={questFeatures.disableQuestsEverything}
                        onClick={() => updateDangerousAccess(!questFeatures.allowChangingDangerousSettings)}
                        size="sm"
                    />
                </div>
                <div style={{ display: questFeatures.allowChangingDangerousSettings ? undefined : "none" }}>
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.hideNonAutoCompletableQuests}
                        label={s("hideNonAutoCompletable")}
                        onChange={checked => updateModifyValue("hideNonAutoCompletableQuests", checked)}
                        topSpacing="10"
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: s("hideNonAutoCompletableTooltip")
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.completeVideoQuestsQuicker}
                        label={discouraged(s("completeQuicker"))}
                        onChange={checked => updateModifyValue("completeVideoQuestsQuicker", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: s("completeQuickerTooltip")
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.preventVideoQuestsPausing}
                        label={discouraged(s("preventPausing"))}
                        onChange={checked => updateModifyValue("preventVideoQuestsPausing", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: s("preventPausingTooltip")
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.makeMobileVideoQuestsDesktopCompatible}
                        label={discouraged(s("mobileCompatible"))}
                        onChange={checked => updateModifyValue("makeMobileVideoQuestsDesktopCompatible", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: s("mobileCompatibleTooltip")
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.autoCompleteQuestsSimultaneously}
                        label={discouraged(s("simultaneously"))}
                        onChange={checked => updateModifyValue("autoCompleteQuestsSimultaneously", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: s("simultaneouslyTooltip")
                        }}
                    />
                    <SettingsSubtleSwitch
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        checked={questFeatures.resumeInterruptedQuests}
                        label={discouraged(s("resumeInterrupted"))}
                        onChange={checked => updateModifyValue("resumeInterruptedQuests", checked)}
                        bottomSpacing="5"
                        tooltip={{
                            position: "top",
                            text: s("resumeInterruptedTooltip")
                        }}
                    />
                    {questFeatures.usedKonamiCode === true && (
                        <>
                            <SettingsSubtleSwitch
                                disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                                checked={questFeatures.autoCompleteQuests}
                                label={discouraged(s("autoProcess"))}
                                onChange={checked => updateModifyValue("autoCompleteQuests", checked)}
                                bottomSpacing="5"
                                tooltip={{
                                    position: "top",
                                    text: s("autoProcessTooltip")
                                }}
                            />
                            <SettingsSubtleSwitch
                                disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                                checked={questFeatures.autoEnrollQuests}
                                label={discouraged(s("autoEnroll"))}
                                onChange={checked => updateModifyValue("autoEnrollQuests", checked)}
                                bottomSpacing="5"
                                tooltip={{
                                    position: "top",
                                    text: s("autoEnrollTooltip")
                                }}
                            />
                        </>
                    )}
                    <SettingsSelect
                        label={discouraged(s("autoCompleteTypes"))}
                        wrapTags={true}
                        options={getAutoCompleteQuestTypeManaOptions()}
                        value={selectedAutoCompleteQuestTypeValues}
                        closeOnSelect={false}
                        maxOptionsVisible={7}
                        selectionMode="multiple"
                        disabled={questFeatures.disableQuestsEverything || !questFeatures.allowChangingDangerousSettings}
                        onSelectionChange={updateAutoCompleteQuestTypes}
                        tooltip={{
                            position: "top",
                            wider: true,
                            text: s("autoCompleteTypesTooltip")
                        }}
                    />
                </div>
            </SettingsNotice>
        </SettingsCard>
    );
}
