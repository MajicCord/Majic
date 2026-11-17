/*
 * Majic — QuestTweaks Quest tiles settings
 */

import { findComponentByCodeLazy } from "@webpack";
import { React, Stores, useMemo, useState, useStateFromStores } from "@webpack/common";
import type { JSX } from "react";

import { enabledOnStartup } from "../startup";
import { getQuestTweaksSettings, useQuestTweaksSettings } from "../settings/access";
import { defaultQuestTileClaimedColorSetting, defaultQuestTileExpiredColorSetting, defaultQuestTileIgnoredColorSetting, defaultQuestTileUnclaimedColorSetting, type QuestTileColorSetting, type QuestTileGradient } from "../settings/def";
import { rerenderQuests } from "../settings/rerender";
import { s } from "../strings";
import type { Quest } from "../types";
import { getQuestTileClasses, getQuestTileStyle } from "../utils/questTiles";
import { q } from "../utils/ui";
import { ManaButton, type ManaSelectOption, SettingsCard, SettingsColorPicker, SettingsDescription, SettingsHeader, SettingsRow, SettingsRowItem, SettingsSelect, SettingsSubheader } from "./shared";

const QuestTile = findComponentByCodeLazy(".rowIndex,trackGuildAndChannelMetadata") as React.ComponentType<{
    className?: string;
    quest: Quest;
}>;

const gradientOptions = [
    { label: "intenseGradient", value: "intense" },
    { label: "defaultGradient", value: "default" },
    { label: "blackGradient", value: "black" },
    { label: "noGradient", value: "hide" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestTileGradient }[];

const getGradientManaOptions = (): ManaSelectOption[] => gradientOptions.map(({ label, value }) => ({
    id: value,
    label: s(label),
    value,
}));

const getPreloadManaOptions = (): ManaSelectOption[] => [
    { id: "true", label: s("preloadAll"), value: "true" },
    { id: "false", label: s("preloadScroll"), value: "false" },
];

type QuestTileColorKey =
    | "questTileUnclaimedColor"
    | "questTileClaimedColor"
    | "questTileIgnoredColor"
    | "questTileExpiredColor";

interface QuestTileColorOption {
    key: QuestTileColorKey;
    label: Parameters<typeof s>[0];
    defaultValue: QuestTileColorSetting;
}

const colorOptions = [
    {
        key: "questTileUnclaimedColor",
        label: "unclaimed",
        defaultValue: defaultQuestTileUnclaimedColorSetting,
    },
    {
        key: "questTileClaimedColor",
        label: "claimed",
        defaultValue: defaultQuestTileClaimedColorSetting,
    },
    {
        key: "questTileIgnoredColor",
        label: "ignored",
        defaultValue: defaultQuestTileIgnoredColorSetting,
    },
    {
        key: "questTileExpiredColor",
        label: "expired",
        defaultValue: defaultQuestTileExpiredColorSetting,
    },
] as const satisfies readonly QuestTileColorOption[];

const defaultPreviewColorKey: QuestTileColorKey = "questTileUnclaimedColor";

function getRandomQuest(): Quest | null {
    const quests: Quest[] = Array.from(Stores.QuestStore.quests.values());
    return quests.length > 0 ? quests[Math.floor(Math.random() * quests.length)] : null;
}

function cloneDummyQuest(quest: Quest, dummyColor: QuestTileColorSetting): Quest & { dummyColor: QuestTileColorSetting; } {
    return {
        ...structuredClone(quest),
        dummyColor,
    };
}

function DummyQuestTile({
    disabled,
    dummyQuest,
    dummyGradient,
}: {
    disabled?: boolean;
    dummyQuest: Quest & { dummyColor: QuestTileColorSetting; };
    dummyGradient: QuestTileGradient;
}): JSX.Element {
    const classes = getQuestTileClasses(q("dummy-quest"), dummyQuest, dummyGradient);
    const style = getQuestTileStyle(dummyQuest);

    return (
        <div
            className={q("dummy-quest-preview", disabled ? "dimmed-settings-item" : undefined)}
            style={style}
            {...{ inert: true } as Record<string, unknown>}
        >
            <QuestTile
                className={classes}
                quest={dummyQuest}
            />
        </div>
    );
}

function DummyQuestPreview({
    disabled,
    dummyColor,
    dummyGradient,
}: {
    disabled?: boolean;
    dummyColor: QuestTileColorSetting;
    dummyGradient: QuestTileGradient;
}): JSX.Element | null {
    const sourceQuest = useStateFromStores([Stores.QuestStore], getRandomQuest);

    const dummyQuest = useMemo(
        () => sourceQuest ? cloneDummyQuest(sourceQuest, dummyColor) : null,
        [dummyColor, sourceQuest]
    );

    if (!dummyQuest) return null;

    return (
        <DummyQuestTile
            disabled={disabled}
            dummyQuest={dummyQuest}
            dummyGradient={dummyGradient}
        />
    );
}

export function QuestTilesSetting(): JSX.Element {
    const questTiles = useQuestTweaksSettings([
        "disableQuestsEverything",
        "questTileUnclaimedColor",
        "questTileClaimedColor",
        "questTileIgnoredColor",
        "questTileExpiredColor",
        "questTileGradient",
        "questTilePreload",
    ]);

    const [previewColorKey, setPreviewColorKey] = useState<QuestTileColorKey>(defaultPreviewColorKey);

    const disabled = questTiles.disableQuestsEverything;
    const gradientManaOptions = getGradientManaOptions();
    const preloadManaOptions = getPreloadManaOptions();
    const previewColor = questTiles[previewColorKey] as QuestTileColorSetting;

    function updateColor(key: QuestTileColorKey, nextColor: QuestTileColorSetting): void {
        setPreviewColorKey(key);
        getQuestTweaksSettings()[key] = nextColor;
    }

    function updateColorValue(key: QuestTileColorKey, setting: QuestTileColorSetting, value: number | null): void {
        if (typeof value !== "number") return;

        updateColor(key, {
            enabled: setting.enabled,
            color: value,
        });
    }

    function updateColorEnabled(key: QuestTileColorKey, setting: QuestTileColorSetting, enabled: boolean): void {
        updateColor(key, {
            ...setting,
            enabled,
        });
    }

    function updateGradient(value: string | string[] | null): void {
        if (typeof value !== "string") return;

        getQuestTweaksSettings().questTileGradient = value as QuestTileGradient;
    }

    function updatePreload(value: string | string[] | null): void {
        if (typeof value !== "string") return;

        const preload = value === "true";
        getQuestTweaksSettings().questTilePreload = preload;
        rerenderQuests();
    }

    return (
        <SettingsCard>
            <SettingsHeader>{s("tilesHeader")}</SettingsHeader>
            <SettingsDescription>{s("tilesDescription")}</SettingsDescription>
            <SettingsSubheader>{s("tileBehavior")}</SettingsSubheader>
            <SettingsRow className="quest-tile-behavior-row">
                <SettingsRowItem className="quest-tile-gradient-row-item">
                    <SettingsSelect
                        label={s("gradientStyle")}
                        options={gradientManaOptions}
                        value={questTiles.questTileGradient}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={gradientManaOptions.length}
                        onSelectionChange={updateGradient}
                        tooltip={{
                            position: "top",
                            text: s("gradientStyleTooltip")
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem className="quest-tile-preload-row-item">
                    <SettingsSelect
                        label={s("assetPreload")}
                        options={preloadManaOptions}
                        value={String(questTiles.questTilePreload)}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={preloadManaOptions.length}
                        onSelectionChange={updatePreload}
                        tooltip={{
                            position: "top",
                            text: s("assetPreloadTooltip")
                        }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsSubheader>{s("tileColors")}</SettingsSubheader>
            <SettingsRow className="quest-tile-color-row">
                {colorOptions.map(({ key, label }) => {
                    const setting = questTiles[key] as QuestTileColorSetting;

                    return (
                        <SettingsRowItem key={key} className="quest-tile-color-row-item">
                            <div
                                onFocusCapture={() => setPreviewColorKey(key)}
                                onPointerDownCapture={() => setPreviewColorKey(key)}
                            >
                                <SettingsColorPicker
                                    label={`${s(label)}${s("colon")}`}
                                    className={["quest-tile-color-picker", setting.enabled ? "" : "disabled-color-picker"].filter(Boolean)}
                                    color={setting.color}
                                    disabled={disabled || !setting.enabled}
                                    onChange={(value: number | null) => updateColorValue(key, setting, value)}
                                    showEyeDropper={true}
                                />
                            </div>
                            <div className={q("settings-button", "quest-tile-color-button")}>
                                <ManaButton
                                    text={setting.enabled ? s("disable") : s("enable")}
                                    variant={setting.enabled ? "critical-secondary" : "primary"}
                                    disabled={disabled}
                                    fullWidth={true}
                                    size="sm"
                                    onClick={() => updateColorEnabled(key, setting, !setting.enabled)}
                                />
                            </div>
                        </SettingsRowItem>
                    );
                })}
            </SettingsRow>
            {enabledOnStartup && <DummyQuestPreview
                disabled={disabled}
                dummyColor={previewColor}
                dummyGradient={questTiles.questTileGradient as QuestTileGradient}
            />}
        </SettingsCard>
    );
}
