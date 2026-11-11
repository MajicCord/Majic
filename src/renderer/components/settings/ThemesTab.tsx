/*
 * Majic — themes settings page
 */

import { saveSettings, settings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { t, useLocale } from "@i18n";
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

    if (css == null) return <Text muted>{t("ui.loading")}</Text>;
    return <TextArea value={css} onChange={onChange} placeholder={t("themes.quickCssPlaceholder")} />;
}

export function ThemesTab() {
    useLocale();
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const toggleQuickCss = (value: boolean) => {
        settings.useQuickCss = value;
        saveSettings();
        void MajicNative.getQuickCss().then(applyQuickCss);
        rerender();
    };

    return (
        <Page>
            <Heading>{t("settings.themes")}</Heading>

            <Card>
                <div className="majic-row" style={{ marginBottom: 10 }}>
                    <div className="majic-row-grow"><SubHeading>{t("themes.quickCss")}</SubHeading></div>
                    <Switch checked={settings.useQuickCss} label={t("themes.enableQuickCss")} onChange={toggleQuickCss} />
                </div>
                <QuickCssEditor />
            </Card>

            <Card>
                <SubHeading>{t("themes.files")}</SubHeading>
                <Text muted>{t("themes.comingSoon")}</Text>
            </Card>
        </Page>
    );
}
