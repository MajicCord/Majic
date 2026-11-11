/*
 * Majic — general settings page
 */

import { saveSettings, settings, type Settings } from "@api/settings";
import { downloadSettingsBackup, uploadSettingsBackup } from "@api/settingsBackup";
import { t, useLocale } from "@i18n";
import { DiscordIcon, React, useReducer, useState } from "@webpack/common";

import { Button, Card, Heading, Page, Select, Slider, SubHeading, Switch, Text } from "../ui";

type WindowSwitch = "nativeTitleBar" | "transparent" | "disableMinSize" | "winCtrlQ";

const VIBRANCY_STYLES = ["under-page", "content", "window", "selection", "titlebar", "header", "sidebar", "tooltip", "menu", "popover", "fullscreen-ui", "hud"];

function SwitchRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange(value: boolean): void }) {
    return (
        <div className="majic-row" style={{ marginBottom: 12 }}>
            <div className="majic-row-grow">
                <Text>{label}</Text>
                {hint && <Text muted>{hint}</Text>}
            </div>
            <Switch checked={checked} label={label} onChange={onChange} />
        </div>
    );
}

function WindowSettings({ update }: { update(change: () => void): void }) {
    const [restartNeeded, setRestartNeeded] = useState(false);
    const isWindows = MajicNative.platform === "win32";
    const isMac = MajicNative.platform === "darwin";

    const set = (change: () => void) => {
        update(change);
        setRestartNeeded(true);
    };

    const switches: Array<{ key: WindowSwitch; label: string; hint?: string; show: boolean }> = [
        { key: "nativeTitleBar", label: t("majic.nativeTitleBar"), show: true },
        { key: "transparent", label: t("majic.transparent"), hint: t("majic.transparent.hint"), show: true },
        { key: "disableMinSize", label: t("majic.disableMinSize"), show: true },
        { key: "winCtrlQ", label: t("majic.winCtrlQ"), show: isWindows }
    ];

    const materials: Array<{ label: string; value: Settings["windowsMaterial"] }> = [
        { label: t("majic.windowsMaterial.none"), value: "none" },
        { label: t("majic.windowsMaterial.mica"), value: "mica" },
        { label: t("majic.windowsMaterial.tabbed"), value: "tabbed" },
        { label: t("majic.windowsMaterial.acrylic"), value: "acrylic" }
    ];

    const vibrancies = [
        { label: t("majic.vibrancy.none"), value: "" },
        ...VIBRANCY_STYLES.map(style => ({ label: style, value: style }))
    ];

    return (
        <Card>
            <SubHeading>{t("majic.window")}</SubHeading>

            {switches.filter(entry => entry.show).map(entry => (
                <SwitchRow
                    key={entry.key}
                    label={entry.label}
                    hint={entry.hint}
                    checked={settings[entry.key]}
                    onChange={value => set(() => settings[entry.key] = value)}
                />
            ))}

            {isWindows && MajicNative.supportsWindowsMaterial() && (
                <div style={{ marginBottom: 12 }}>
                    <Text>{t("majic.windowsMaterial")}</Text>
                    <Text muted>{t("majic.windowsMaterial.hint")}</Text>
                    <div style={{ marginTop: 6 }}>
                        <Select value={settings.windowsMaterial} options={materials} onChange={value => set(() => settings.windowsMaterial = value)} />
                    </div>
                </div>
            )}

            {isMac && (
                <div style={{ marginBottom: 12 }}>
                    <Text>{t("majic.vibrancy")}</Text>
                    <div style={{ marginTop: 6 }}>
                        <Select value={settings.macosVibrancyStyle ?? ""} options={vibrancies} onChange={value => set(() => settings.macosVibrancyStyle = value || undefined)} />
                    </div>
                </div>
            )}

            {restartNeeded && (
                <div className="majic-notice-card majic-row">
                    <div className="majic-row-grow"><Text>{t("majic.restartNeeded")}</Text></div>
                    <Button onClick={() => void MajicNative.relaunch()}>{t("majic.restartNow")}</Button>
                </div>
            )}
        </Card>
    );
}

export function MajicTab() {
    useLocale();
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const update = (change: () => void) => {
        change();
        saveSettings();
        rerender();
    };

    const nativeOptions = [
        { label: t("majic.useNative.notFocused"), value: "not-focused" as const },
        { label: t("majic.useNative.always"), value: "always" as const },
        { label: t("majic.useNative.never"), value: "never" as const }
    ];

    return (
        <Page>
            <Heading>Majic</Heading>
            <Text muted>{t("majic.version", { version: Majic.version })}</Text>

            <Card>
                <SubHeading>{t("majic.notifications")}</SubHeading>
                <Text>{t("majic.useNative")}</Text>
                <div style={{ margin: "6px 0 14px" }}>
                    <Select
                        value={settings.notifications.useNative}
                        options={nativeOptions}
                        onChange={value => update(() => settings.notifications.useNative = value)}
                    />
                </div>
                <Text>{t("majic.timeout")}</Text>
                <Slider
                    value={settings.notifications.timeout / 1000}
                    min={1}
                    max={20}
                    step={1}
                    format={value => `${value}s`}
                    onChange={value => update(() => settings.notifications.timeout = value * 1000)}
                />
            </Card>

            <WindowSettings update={update} />

            <Card>
                <SubHeading>{t("majic.data")}</SubHeading>
                <Text muted>{t("majic.backupHint")}</Text>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    <Button onClick={() => void downloadSettingsBackup()}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DiscordIcon name="DownloadIcon" size={16} />{t("majic.export")}</span>
                    </Button>
                    <Button variant="secondary" onClick={() => void uploadSettingsBackup()}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DiscordIcon name="UploadIcon" size={16} />{t("majic.import")}</span>
                    </Button>
                    <Button variant="secondary" onClick={() => void MajicNative.openSettingsFolder()}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><DiscordIcon name="FolderIcon" size={16} />{t("majic.openSettingsFolder")}</span>
                    </Button>
                </div>
            </Card>
        </Page>
    );
}
