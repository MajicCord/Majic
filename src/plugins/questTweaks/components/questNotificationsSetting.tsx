/*
 * Majic — QuestTweaks Quest notifications settings
 */

import { type AudioPlayerInterface, createAudioPlayer, defaultAudioNames } from "@api/audioPlayer";
import { React, useEffect, useMemo, useRef, useState } from "@webpack/common";
import type { JSX, MouseEvent } from "react";

import { getQuestTweaksSettings, useQuestTweaksSettings } from "../settings/access";
import { startAutoFetchingQuests } from "../settings/fetching";
import { s } from "../strings";
import { q } from "../utils/ui";
import { ManaSelectFormattedOption, ManaSelectOption, SettingsCard, SettingsDescription, SettingsHeader, SettingsRow, SettingsRowItem, SettingsSelect, SettingsSlider, SettingsSubheader, SettingsSubtleSwitch } from "./shared";

const getQuestFetchIntervalOptions = (): ManaSelectOption[] => [
    { id: "30-minutes", label: s("minutes30"), value: String(30 * 60) },
    { id: "45-minutes", label: s("minutes45"), value: String(45 * 60) },
    { id: "1-hour", label: s("hour1"), value: String(60 * 60) },
    { id: "3-hours", label: s("hours3"), value: String(3 * 60 * 60) },
    { id: "6-hours", label: s("hours6"), value: String(6 * 60 * 60) },
    { id: "12-hours", label: s("hours12"), value: String(12 * 60 * 60) },
];

function SoundIcon({ className }: { className?: string; }): JSX.Element {
    return (
        <svg
            viewBox="0 0 24 24"
            height={18}
            width={18}
            fill="none"
            className={className}
            aria-hidden={true}
        >
            <path fill="currentColor" d="M12 3a1 1 0 0 0-1-1h-.06a1 1 0 0 0-.74.32L5.92 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.92l4.28 4.68a1 1 0 0 0 .74.32H11a1 1 0 0 0 1-1V3ZM15.1 20.75c-.58.14-1.1-.33-1.1-.92v-.03c0-.5.37-.92.85-1.05a7 7 0 0 0 0-13.5A1.11 1.11 0 0 1 14 4.2v-.03c0-.6.52-1.06 1.1-.92a9 9 0 0 1 0 17.5Z" />
            <path fill="currentColor" d="M15.16 16.51c-.57.28-1.16-.2-1.16-.83v-.14c0-.43.28-.8.63-1.02a3 3 0 0 0 0-5.04c-.35-.23-.63-.6-.63-1.02v-.14c0-.63.59-1.1 1.16-.83a5 5 0 0 1 0 9.02Z" />
        </svg>
    );
}

function getSoundOptions(): ManaSelectOption[] {
    return defaultAudioNames()
        .map(sound => ({
            id: sound,
            label: formatSoundName(sound),
            value: sound,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}

function formatSoundName(sound: string): string {
    return sound
        .toUpperCase()
        .replace(/_/g, " ")
        .replace(/(\d+)/g, " $1");
}

interface QuestNotificationSoundSelectProps {
    disabled?: boolean;
    label: string;
    onChange: (value: string | null) => void;
    onPreview: (sound: string) => void;
    options: ManaSelectOption[];
    playingSound: string | null;
    tooltip?: { position: "top" | "bottom", text: string; };
    value: string | null;
}

function QuestNotificationSoundSelect({
    disabled,
    label,
    onChange,
    onPreview,
    options,
    playingSound,
    tooltip,
    value,
}: QuestNotificationSoundSelectProps): JSX.Element {
    function formatOption(option: ManaSelectOption): ManaSelectFormattedOption {
        const sound = option.value || null;
        const isPlaying = sound != null && playingSound === sound;

        function handlePreviewMouseDown(event: MouseEvent<HTMLButtonElement>) {
            event.preventDefault();
            event.stopPropagation();
        }

        function handlePreviewClick(event: MouseEvent<HTMLButtonElement>) {
            event.preventDefault();
            event.stopPropagation();

            if (sound && !disabled) {
                onPreview(sound);
            }
        }

        return {
            ...option,
            trailing: sound
                ? (
                    <button
                        type="button"
                        className={q("sound-preview-button", isPlaying ? "playing-audio" : undefined)}
                        aria-label={s("preview", { name: option.label })}
                        disabled={disabled}
                        onMouseDown={handlePreviewMouseDown}
                        onClick={handlePreviewClick}
                    >
                        <SoundIcon />
                    </button>
                )
                : undefined,
        };
    }

    return (
        <SettingsSelect
            label={label}
            options={options}
            value={value}
            selectionMode="single"
            disabled={disabled}
            clearable={true}
            fullWidth={true}
            maxOptionsVisible={7}
            placeholder={s("disabledPlaceholder")}
            selectClassName="sound-select"
            formatOption={formatOption}
            tooltip={tooltip}
            onSelectionChange={nextValue => {
                if (nextValue != null && typeof nextValue !== "string") return;

                onChange(nextValue ?? null);
            }}
        />
    );
}

export function QuestNotificationsSetting(): JSX.Element {
    const questNotifications = useQuestTweaksSettings([
        "newExcludedQuestAlertSound",
        "newExcludedQuestAlertVolume",
        "newQuestAlertSound",
        "newQuestAlertVolume",
        "questFetchInterval",
        "disableQuestsEverything",
        "notifyOnNewExcludedQuests",
        "notifyOnNewQuests",
        "notifyOnQuestComplete",
        "questCompletedAlertSound",
        "questCompletedAlertVolume",
    ]);

    const soundOptions = useMemo(getSoundOptions, []);
    const activePlayer = useRef<AudioPlayerInterface | null>(null);
    const [playingSound, setPlayingSound] = useState<string | null>(null);
    const disabled = questNotifications.disableQuestsEverything;
    const questFetchIntervalOptions = getQuestFetchIntervalOptions();

    function clearActivePlayer(): void {
        const player = activePlayer.current;
        activePlayer.current = null;
        player?.stop();
        setPlayingSound(null);
    }

    function previewSound(sound: string, volume: number): void {
        if (playingSound === sound) {
            clearActivePlayer();

            return;
        }

        clearActivePlayer();

        function finishPreview(): void {
            if (activePlayer.current !== player) {
                return;
            }

            activePlayer.current = null;
            setPlayingSound(null);
        }

        const player = createAudioPlayer(sound, { volume: Math.max(0, Math.min(100, volume)), onEnded: finishPreview, onError: finishPreview });
        activePlayer.current = player;
        setPlayingSound(sound);
        player?.play();
    }

    useEffect(() => clearActivePlayer, []);
    useEffect(() => {
        if (disabled) {
            clearActivePlayer();
        }
    }, [disabled]);

    function updateFetchInterval(value: string | string[] | null): void {
        if (value != null && typeof value !== "string") return;

        const interval = value == null ? 0 : Number(value);
        getQuestTweaksSettings().questFetchInterval = interval;
        startAutoFetchingQuests(true);
    }

    return (
        <SettingsCard>
            <SettingsHeader>{s("notificationsHeader")}</SettingsHeader>
            <SettingsDescription>{s("notificationsDescription")}</SettingsDescription>
            <SettingsSubheader>{s("questCompletedSection")}</SettingsSubheader>
            <SettingsSubtleSwitch
                checked={questNotifications.notifyOnQuestComplete}
                disabled={disabled}
                label={s("notifyComplete")}
                onChange={checked => { getQuestTweaksSettings().notifyOnQuestComplete = checked; }}
                bottomSpacing="5"
            />
            <SettingsRow>
                <SettingsRowItem className="sound-select-row-item">
                    <QuestNotificationSoundSelect
                        label={s("soundComplete")}
                        disabled={disabled}
                        options={soundOptions}
                        value={questNotifications.questCompletedAlertSound}
                        playingSound={playingSound}
                        onPreview={sound => previewSound(sound, questNotifications.questCompletedAlertVolume)}
                        onChange={value => { getQuestTweaksSettings().questCompletedAlertSound = value; }}
                    />
                </SettingsRowItem>
                <SettingsRowItem className="volume-slider-row-item">
                    <SettingsSlider
                        label={s("volume")}
                        className="inline-volume-slider"
                        disabled={disabled}
                        value={questNotifications.questCompletedAlertVolume}
                        onChange={value => { getQuestTweaksSettings().questCompletedAlertVolume = value; }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsSubheader>{s("newQuestsSection")}</SettingsSubheader>
            <SettingsSubtleSwitch
                checked={questNotifications.notifyOnNewQuests}
                disabled={disabled}
                label={s("notifyNew")}
                bottomSpacing="5"
                onChange={checked => {
                    getQuestTweaksSettings().notifyOnNewQuests = checked;
                    startAutoFetchingQuests(true);
                }}
            />
            <SettingsRow>
                <SettingsRowItem className="sound-select-row-item">
                    <QuestNotificationSoundSelect
                        label={s("soundNew")}
                        disabled={disabled}
                        options={soundOptions}
                        value={questNotifications.newQuestAlertSound}
                        playingSound={playingSound}
                        onPreview={sound => previewSound(sound, questNotifications.newQuestAlertVolume)}
                        onChange={value => {
                            getQuestTweaksSettings().newQuestAlertSound = value;
                            startAutoFetchingQuests(true);
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem className="volume-slider-row-item">
                    <SettingsSlider
                        label={s("volume")}
                        className="inline-volume-slider"
                        disabled={disabled}
                        value={questNotifications.newQuestAlertVolume}
                        onChange={value => { getQuestTweaksSettings().newQuestAlertVolume = value; }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsSubtleSwitch
                className="margin-top-14"
                checked={questNotifications.notifyOnNewExcludedQuests}
                disabled={disabled}
                label={s("notifyNewExcluded")}
                bottomSpacing="5"
                onChange={checked => {
                    getQuestTweaksSettings().notifyOnNewExcludedQuests = checked;
                    startAutoFetchingQuests(true);
                }}
                tooltip={{
                    position: "top",
                    text: s("notifyNewExcludedTooltip")
                }}
            />
            <SettingsRow>
                <SettingsRowItem className="sound-select-row-item">
                    <QuestNotificationSoundSelect
                        label={s("soundNewExcluded")}
                        disabled={disabled}
                        options={soundOptions}
                        value={questNotifications.newExcludedQuestAlertSound}
                        playingSound={playingSound}
                        onPreview={sound => previewSound(sound, questNotifications.newExcludedQuestAlertVolume)}
                        onChange={value => {
                            getQuestTweaksSettings().newExcludedQuestAlertSound = value;
                            startAutoFetchingQuests(true);
                        }}
                        tooltip={{
                            position: "top",
                            text: s("soundNewExcludedTooltip")
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem className="volume-slider-row-item">
                    <SettingsSlider
                        label={s("volume")}
                        className="inline-volume-slider"
                        disabled={disabled}
                        value={questNotifications.newExcludedQuestAlertVolume}
                        onChange={value => { getQuestTweaksSettings().newExcludedQuestAlertVolume = value; }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsRow>
                <SettingsRowItem>
                    <SettingsSelect
                        className="margin-top-12"
                        label={s("fetchInterval")}
                        options={questFetchIntervalOptions}
                        value={questNotifications.questFetchInterval > 0 ? String(questNotifications.questFetchInterval) : null}
                        selectionMode="single"
                        disabled={disabled}
                        clearable={true}
                        fullWidth={true}
                        placeholder={s("disabledPlaceholder")}
                        maxOptionsVisible={questFetchIntervalOptions.length}
                        onSelectionChange={updateFetchInterval}
                        tooltip={{
                            position: "top",
                            text: s("fetchIntervalTooltip")
                        }}
                    />
                </SettingsRowItem>
            </SettingsRow>
        </SettingsCard>
    );
}
