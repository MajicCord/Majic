/*
 * Majic — badges settings page
 */

import { getOwnedBadges, type OwnedBadge } from "@api/majicBadges";
import { saveSettings, settings } from "@api/settings";
import { t, useLocale } from "@i18n";
import { SPONSOR_URL } from "@utils/constants";
import { DiscordIcon, React, useReducer } from "@webpack/common";

import { Button, Card, Heading, Page, Switch, Text } from "../ui";

function BadgeCard({ badge }: { badge: OwnedBadge; }) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const name = badge.name ?? t(`badges.${badge.kind}`);
    const shown = !settings.hiddenBadges.includes(badge.key);

    const toggle = (value: boolean) => {
        settings.hiddenBadges = value
            ? settings.hiddenBadges.filter(key => key !== badge.key)
            : [...settings.hiddenBadges, badge.key];
        saveSettings();
        rerender();
    };

    return (
        <Card>
            <div className="majic-row">
                <img src={badge.icon} alt="" width={32} height={32} style={{ marginRight: 12, flexShrink: 0 }} />
                <div className="majic-row-grow">
                    <Text><strong>{name}</strong></Text>
                    <Text muted>{t(`badges.${badge.kind}Description`)}</Text>
                </div>
                <Switch checked={shown} onChange={toggle} label={name} />
            </div>
        </Card>
    );
}

export function BadgesTab() {
    useLocale();
    const owned = getOwnedBadges();

    return (
        <Page>
            <Heading>{t("settings.badges")}</Heading>
            <Text muted>{t(owned.length ? "badges.hint" : "badges.none")}</Text>

            {owned.map(badge => <BadgeCard key={badge.key} badge={badge} />)}

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
