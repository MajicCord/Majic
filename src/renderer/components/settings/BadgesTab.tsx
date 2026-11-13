/*
 * Majic — badges settings page
 */

import { saveSettings, settings, type Settings } from "@api/settings";
import { t, useLocale } from "@i18n";
import { DEVELOPER_BADGE_ICON, SPONSOR_URL, SUPPORTER_BADGE_ICON } from "@utils/constants";
import { DiscordIcon, React, useReducer } from "@webpack/common";

import { Button, Card, Heading, Page, Switch, Text } from "../ui";

type BadgeKey = keyof Settings["badges"];

const BADGES: Array<{ key: BadgeKey; icon: string }> = [
    { key: "developer", icon: DEVELOPER_BADGE_ICON },
    { key: "supporter", icon: SUPPORTER_BADGE_ICON },
    { key: "custom", icon: "ImageIcon" }
];

const BadgeIcon = ({ icon }: { icon: string }) => icon.startsWith("https://")
    ? <img src={icon} alt="" width={32} height={32} style={{ marginRight: 12, flexShrink: 0 }} />
    : <span style={{ display: "flex", width: 32, height: 32, marginRight: 12, flexShrink: 0, alignItems: "center", justifyContent: "center", color: "var(--interactive-icon-default)" }}><DiscordIcon name={icon} size={24} /></span>;

function BadgeCard({ badge, icon }: { badge: BadgeKey; icon: string }) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const name = t(`badges.${badge}`);

    const toggle = (value: boolean) => {
        settings.badges[badge] = value;
        saveSettings();
        rerender();
    };

    return (
        <Card>
            <div className="majic-row">
                <BadgeIcon icon={icon} />
                <div className="majic-row-grow">
                    <Text><strong>{name}</strong></Text>
                    <Text muted>{t(`badges.${badge}Description`)}</Text>
                </div>
                <Switch checked={settings.badges[badge]} onChange={toggle} label={name} />
            </div>
        </Card>
    );
}

export function BadgesTab() {
    useLocale();

    return (
        <Page>
            <Heading>{t("settings.badges")}</Heading>
            <Text muted>{t("badges.hint")}</Text>

            {BADGES.map(({ key, icon }) => <BadgeCard key={key} badge={key} icon={icon} />)}

            <Card>
                <div className="majic-row">
                    <div className="majic-row-grow">
                        <Text><strong>{t("badges.support")}</strong></Text>
                        <Text muted>{t("badges.supporterAsk")}</Text>
                    </div>
                    <Button onClick={() => void MajicNative.openExternal(SPONSOR_URL)}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <DiscordIcon name="HeartIcon" size={16} />{t("badges.support")}
                        </span>
                    </Button>
                </div>
            </Card>
        </Page>
    );
}
