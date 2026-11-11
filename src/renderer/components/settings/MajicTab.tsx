/*
 * Majic — general settings page
 */

import { saveSettings, settings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { React, useEffect, useReducer, useRef, useState } from "@webpack/common";

import { Card, Heading, Page, Select, Slider, SubHeading, Switch, Text, TextArea } from "../ui";

const NATIVE_OPTIONS = [
    { label: "Only when Discord is not focused", value: "not-focused" as const },
    { label: "Always", value: "always" as const },
    { label: "Never", value: "never" as const }
];

function applyQuickCss(css: string) {
    if (settings.useQuickCss && css) enableStyle("quickcss", css);
    else disableStyle("quickcss");
}

function QuickCssEditor() {
    const [css, setCss] = useState<string | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        void MajicNative.getQuickCss().then(setCss);
    }, []);

    const onChange = (value: string) => {
        setCss(value);
        applyQuickCss(value);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void MajicNative.setQuickCss(value), 500);
    };

    if (css == null) return <Text muted>Loading...</Text>;
    return <TextArea value={css} onChange={onChange} placeholder={"/* Your custom CSS */\n.some-class { color: hotpink; }"} />;
}

export function MajicTab() {
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const update = (change: () => void) => {
        change();
        saveSettings();
        rerender();
    };

    return (
        <Page>
            <Heading>Majic</Heading>
            <Text muted>Version {Majic.version}</Text>

            <Card>
                <SubHeading>Notifications</SubHeading>
                <Text>Use system notifications</Text>
                <div style={{ margin: "6px 0 14px" }}>
                    <Select
                        value={settings.notifications.useNative}
                        options={NATIVE_OPTIONS}
                        onChange={value => update(() => settings.notifications.useNative = value)}
                    />
                </div>
                <Text>Time before a Majic notification closes (seconds)</Text>
                <Slider
                    value={settings.notifications.timeout / 1000}
                    min={1}
                    max={20}
                    step={1}
                    format={value => `${value}s`}
                    onChange={value => update(() => settings.notifications.timeout = value * 1000)}
                />
            </Card>

            <Card>
                <div className="majic-row" style={{ marginBottom: 10 }}>
                    <div className="majic-row-grow"><SubHeading>Quick CSS</SubHeading></div>
                    <Switch
                        checked={settings.useQuickCss}
                        label="Enable Quick CSS"
                        onChange={value => update(() => {
                            settings.useQuickCss = value;
                            void MajicNative.getQuickCss().then(applyQuickCss);
                        })}
                    />
                </div>
                <QuickCssEditor />
            </Card>
        </Page>
    );
}
