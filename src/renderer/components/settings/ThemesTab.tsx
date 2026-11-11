/*
 * Majic — themes settings page
 */

import { saveSettings, settings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { React, useEffect, useReducer, useRef, useState } from "@webpack/common";

import { Card, Heading, Page, SubHeading, Switch, Text, TextArea } from "../ui";

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

export function ThemesTab() {
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const toggleQuickCss = (value: boolean) => {
        settings.useQuickCss = value;
        saveSettings();
        void MajicNative.getQuickCss().then(applyQuickCss);
        rerender();
    };

    return (
        <Page>
            <Heading>Themes</Heading>

            <Card>
                <div className="majic-row" style={{ marginBottom: 10 }}>
                    <div className="majic-row-grow"><SubHeading>Quick CSS</SubHeading></div>
                    <Switch checked={settings.useQuickCss} label="Enable Quick CSS" onChange={toggleQuickCss} />
                </div>
                <QuickCssEditor />
            </Card>

            <Card>
                <SubHeading>Theme files</SubHeading>
                <Text muted>Theme files and online themes are coming soon.</Text>
            </Card>
        </Page>
    );
}
