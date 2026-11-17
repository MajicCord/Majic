/*
 * Majic — QuestTweaks settings page
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { React } from "@webpack/common";
import type { ComponentType, JSX } from "react";

import { s } from "../strings";
import { QuestButtonSetting } from "./questButtonSettings";
import { QuestFeaturesSetting } from "./questFeaturesSetting";
import { QuestNotificationsSetting } from "./questNotificationsSetting";
import { QuestTilesSetting } from "./questTilesSetting";
import { ReorderQuestsSetting } from "./reorderQuestsSetting";
import { SettingsSearch } from "./settingsSearch";

const sections: [string, ComponentType][] = [
    ["settingsSearch", SettingsSearch],
    ["questFeatures", QuestFeaturesSetting],
    ["questButton", QuestButtonSetting],
    ["questNotifications", QuestNotificationsSetting],
    ["questTiles", QuestTilesSetting],
    ["reorderQuests", ReorderQuestsSetting]
];

export function QuestTweaksSettingsPage(): JSX.Element {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="majic-notice-card majic-qt-warning">
                <strong>{s("warningTitle")}</strong>
                <span>{s("warningText")}</span>
            </div>
            <div className="majic-qt-settings">
                {sections.map(([name, Section]) => (
                    <ErrorBoundary key={name} name={`QuestTweaks ${name}`}>
                        <Section />
                    </ErrorBoundary>
                ))}
            </div>
        </div>
    );
}
