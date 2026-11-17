/*
 * Majic — QuestTweaks Quest order settings
 */

import { React } from "@webpack/common";
import type { JSX } from "react";

import { getQuestTweaksSettings, useQuestTweaksSettings } from "../settings/access";
import { defaultQuestOrder, type QuestOrderStatus, type QuestSubsort } from "../settings/def";
import { validateIgnoredQuests } from "../settings/ignoredQuests";
import { rerenderQuests } from "../settings/rerender";
import { s } from "../strings";
import { type ManaSelectOption, SettingsCard, SettingsDescription, SettingsHeader, SettingsRow, SettingsRowItem, SettingsSelect, SettingsSubheader, SettingsSubtleSwitch } from "./shared";

const questStatusOptions = [
    { label: "unclaimed", value: "UNCLAIMED" },
    { label: "claimed", value: "CLAIMED" },
    { label: "ignored", value: "IGNORED" },
    { label: "expired", value: "EXPIRED" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestOrderStatus }[];

function getQuestPositionManaOptions(): ManaSelectOption[] {
    const options: ManaSelectOption[] = (["first", "second", "third", "fourth"] as const).map((label, index) => ({
        id: String(index),
        label: s(label),
        value: String(index),
    }));

    options.push({ id: "hidden", label: s("hidden"), value: "hidden" });

    return options;
}

const baseSubsortOptions = [
    { label: "addedNewest", value: "Recent DESC" },
    { label: "addedOldest", value: "Recent ASC" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestSubsort }[];

const expiringSubsortOptions = [
    ...baseSubsortOptions,
    { label: "expiringSoonest", value: "Expiring ASC" },
    { label: "expiringLatest", value: "Expiring DESC" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestSubsort }[];

const expiredSubsortOptions = [
    ...baseSubsortOptions,
    { label: "expiredMostRecent", value: "Expiring DESC" },
    { label: "expiredLeastRecent", value: "Expiring ASC" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestSubsort }[];

const claimedSubsortOptions = [
    ...baseSubsortOptions,
    { label: "claimedMostRecent", value: "Claimed DESC" },
    { label: "claimedLeastRecent", value: "Claimed ASC" },
] as const satisfies readonly { label: Parameters<typeof s>[0]; value: QuestSubsort }[];

function toManaOptions(options: readonly { label: Parameters<typeof s>[0]; value: QuestSubsort }[]): ManaSelectOption[] {
    return options.map(({ label, value }) => ({
        id: value,
        label: s(label),
        value,
    }));
}


function sanitizeQuestOrder(order: unknown): QuestOrderStatus[] {
    const validStatuses = new Set<QuestOrderStatus>(defaultQuestOrder);
    const sanitized = Array.isArray(order)
        ? order.filter((status): status is QuestOrderStatus => validStatuses.has(status as QuestOrderStatus))
        : [];
    const uniqueOrder = Array.from(new Set(sanitized));

    for (const status of defaultQuestOrder) {
        if (!uniqueOrder.includes(status)) {
            uniqueOrder.push(status);
        }
    }

    return uniqueOrder;
}

export function ReorderQuestsSetting(): JSX.Element {
    const reorderQuests = useQuestTweaksSettings([
        "disableQuestsEverything",
        "questOrder",
        "hiddenQuestStatuses",
        "unclaimedSubsort",
        "claimedSubsort",
        "ignoredSubsort",
        "expiredSubsort",
        "rememberQuestPageSort",
        "rememberQuestPageFilters",
    ]);

    const disabled = reorderQuests.disableQuestsEverything;
    const questPositionManaOptions = getQuestPositionManaOptions();
    const unclaimedSubsortManaOptions = toManaOptions(expiringSubsortOptions);
    const claimedSubsortManaOptions = toManaOptions(claimedSubsortOptions);
    const ignoredSubsortManaOptions = toManaOptions(expiringSubsortOptions);
    const expiredSubsortManaOptions = toManaOptions(expiredSubsortOptions);
    const questOrder = sanitizeQuestOrder(reorderQuests.questOrder);

    function updateQuestOrder(status: QuestOrderStatus, value: string | string[] | null): void {
        if (typeof value !== "string") return;

        const hiddenStatuses = new Set(reorderQuests.hiddenQuestStatuses);

        if (value === "hidden") {
            hiddenStatuses.add(status);
            getQuestTweaksSettings().hiddenQuestStatuses = Array.from(hiddenStatuses);
            validateIgnoredQuests();
            return;
        }

        const index = Number(value);

        if (!Number.isInteger(index) || index < 0 || index >= questOrder.length) return;

        const nextOrder = [...questOrder];
        const previousIndex = nextOrder.indexOf(status);

        nextOrder[previousIndex] = nextOrder[index];
        nextOrder[index] = status;
        hiddenStatuses.delete(status);
        getQuestTweaksSettings().questOrder = nextOrder;
        getQuestTweaksSettings().hiddenQuestStatuses = Array.from(hiddenStatuses);
        validateIgnoredQuests();
    }

    function updateSubsort(key: "unclaimedSubsort" | "claimedSubsort" | "ignoredSubsort" | "expiredSubsort", value: string | string[] | null): void {
        if (typeof value !== "string") return;

        getQuestTweaksSettings()[key] = value;
        rerenderQuests();
    }

    function updateRememberSetting(key: "rememberQuestPageSort" | "rememberQuestPageFilters", checked: boolean): void {
        getQuestTweaksSettings()[key] = checked;
    }

    return (
        <SettingsCard>
            <SettingsHeader>{s("reorderHeader")}</SettingsHeader>
            <SettingsDescription>{s("reorderDescription")}</SettingsDescription>
            <SettingsSubheader>{s("statusOrder")}</SettingsSubheader>
            <SettingsRow>
                {questStatusOptions.map(({ label, value: status }) => (
                    <SettingsRowItem key={status}>
                        <SettingsSelect
                            label={`${s(label)}${s("colon")}`}
                            options={questPositionManaOptions}
                            value={reorderQuests.hiddenQuestStatuses.includes(status) ? "hidden" : String(questOrder.indexOf(status))}
                            selectionMode="single"
                            disabled={disabled}
                            fullWidth={true}
                            maxOptionsVisible={questPositionManaOptions.length}
                            onSelectionChange={value => updateQuestOrder(status, value)}
                            tooltip={{
                                position: "top",
                                text: s("statusOrderTooltip")
                            }}
                        />
                    </SettingsRowItem>
                ))}
            </SettingsRow>
            <SettingsSubheader>{s("subsorts")}</SettingsSubheader>
            <SettingsRow>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("unclaimedSubsort")}
                        options={unclaimedSubsortManaOptions}
                        value={reorderQuests.unclaimedSubsort}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={unclaimedSubsortManaOptions.length}
                        onSelectionChange={value => updateSubsort("unclaimedSubsort", value)}
                        tooltip={{
                            position: "top",
                            text: s("unclaimedSubsortTooltip")
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("claimedSubsort")}
                        options={claimedSubsortManaOptions}
                        value={reorderQuests.claimedSubsort}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={claimedSubsortManaOptions.length}
                        onSelectionChange={value => updateSubsort("claimedSubsort", value)}
                        tooltip={{
                            position: "top",
                            text: s("claimedSubsortTooltip")
                        }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsRow>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("ignoredSubsort")}
                        options={ignoredSubsortManaOptions}
                        value={reorderQuests.ignoredSubsort}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={ignoredSubsortManaOptions.length}
                        onSelectionChange={value => updateSubsort("ignoredSubsort", value)}
                        tooltip={{
                            position: "top",
                            text: s("ignoredSubsortTooltip")
                        }}
                    />
                </SettingsRowItem>
                <SettingsRowItem>
                    <SettingsSelect
                        label={s("expiredSubsort")}
                        options={expiredSubsortManaOptions}
                        value={reorderQuests.expiredSubsort}
                        selectionMode="single"
                        disabled={disabled}
                        fullWidth={true}
                        maxOptionsVisible={expiredSubsortManaOptions.length}
                        onSelectionChange={value => updateSubsort("expiredSubsort", value)}
                        tooltip={{
                            position: "top",
                            text: s("expiredSubsortTooltip")
                        }}
                    />
                </SettingsRowItem>
            </SettingsRow>
            <SettingsSubheader>{s("pageMemory")}</SettingsSubheader>
            <SettingsSubtleSwitch
                checked={reorderQuests.rememberQuestPageSort}
                disabled={disabled}
                label={s("rememberSort")}
                onChange={checked => updateRememberSetting("rememberQuestPageSort", checked)}
                bottomSpacing="5"
                tooltip={{
                    position: "top",
                    text: s("rememberSortTooltip")
                }}
            />
            <SettingsSubtleSwitch
                checked={reorderQuests.rememberQuestPageFilters}
                disabled={disabled}
                label={s("rememberFilters")}
                onChange={checked => updateRememberSetting("rememberQuestPageFilters", checked)}
                tooltip={{
                    position: "top",
                    text: s("rememberFiltersTooltip")
                }}
            />
        </SettingsCard>
    );
}
