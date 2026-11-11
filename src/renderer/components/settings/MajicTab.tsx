/*
 * Majic — general settings page
 */

import { saveSettings, settings } from "@api/settings";
import { t, useLocale } from "@i18n";
import { React, useReducer } from "@webpack/common";

import { Card, Heading, Page, Select, Slider, SubHeading, Text } from "../ui";

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
        </Page>
    );
}
