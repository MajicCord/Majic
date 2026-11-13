/*
 * Majic — badges settings page
 */

import { saveSettings, settings, type Settings } from "@api/settings";
import { t, useLocale } from "@i18n";
import { DEVELOPER_BADGE_ICON, SUPPORTER_BADGE_ICON } from "@utils/constants";
import { React, useReducer } from "@webpack/common";

import { Card, Heading, Page, Text } from "../ui";
import { SwitchRow } from "./MajicTab";

const BADGES: Array<{ key: keyof Settings["badges"]; icon: string }> = [
    { key: "developer", icon: DEVELOPER_BADGE_ICON },
    { key: "supporter", icon: SUPPORTER_BADGE_ICON }
];

export function BadgesTab() {
    useLocale();
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const toggle = (key: keyof Settings["badges"], value: boolean) => {
        settings.badges[key] = value;
        saveSettings();
        rerender();
    };

    return (
        <Page>
            <Heading>{t("settings.badges")}</Heading>
            <Text muted>{t("badges.hint")}</Text>

            <Card>
                {BADGES.map(({ key, icon }) => (
                    <SwitchRow
                        key={key}
                        icon={icon}
                        label={t(`badges.${key}`)}
                        checked={settings.badges[key]}
                        onChange={value => toggle(key, value)}
                    />
                ))}
            </Card>
        </Page>
    );
}
