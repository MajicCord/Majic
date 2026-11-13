/*
 * Majic — supporter badge modal
 */

import { Button, Text } from "@components/ui";
import { t } from "@i18n";
import { SPONSOR_URL, SUPPORTER_BADGE_ICON } from "@utils/constants";
import { DiscordIcon, Modal, openModal, React } from "@webpack/common";

export const openSponsorPage = () => void MajicNative.openExternal(SPONSOR_URL);

function SupporterModal({ rootProps }: { rootProps: any }) {
    return (
        <Modal {...rootProps} title={t("badges.supporter")}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center", padding: "8px 0" }}>
                <img src={SUPPORTER_BADGE_ICON} alt="" width={96} height={96} />
                <Text>{t("badges.supporterPerk")}</Text>
                <Text muted>{t("badges.supporterAsk")}</Text>
                <Button onClick={openSponsorPage}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <DiscordIcon name="HeartIcon" size={16} />{t("badges.support")}
                    </span>
                </Button>
            </div>
        </Modal>
    );
}

export const openSupporterModal = () => openModal((props: any) => <SupporterModal rootProps={props} />);
