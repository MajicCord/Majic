/*
 * Majic — support banner
 */

import { getCurrentUserId, isSupporter } from "@api/majicBadges";
import { enableStyle, isStyleEnabled } from "@api/styles";
import { t } from "@i18n";
import { SPONSOR_URL, SUPPORTER_BADGE_ICON } from "@utils/constants";
import { DiscordIcon, React } from "@webpack/common";

const CSS = `
.majic-support-banner { display: flex; align-items: center; gap: 1.25em; padding: 1.25em 1.5em; border-radius: 8px; background: linear-gradient(135deg, #ff2d55, #ec4899); color: #fff; }
.majic-support-banner[data-thanks] { background: linear-gradient(135deg, #ec4899, #a855f7); }
.majic-support-banner-main { flex: 1; min-width: 0; }
.majic-support-banner-title { margin: 0; font-size: 18px; font-weight: 700; line-height: 22px; color: #fff; }
.majic-support-banner-text { margin: 6px 0 14px; font-size: 14px; line-height: 20px; color: rgba(255, 255, 255, .9); }
.majic-support-banner-button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border: none; border-radius: 6px; background: #fff; color: #ec4899; font-size: 14px; font-weight: 600; cursor: pointer; overflow: visible; }
.majic-support-banner-button:hover { background: #fdf2f8; }
.majic-support-banner-button svg { transition: transform .3s; }
.majic-support-banner-button:hover svg { transform: scale(1.15); }
.majic-support-banner-image { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 100px; height: 100px; border-radius: 50%; background: #fff; }
.majic-support-banner-image img { width: 65%; }
`;

export function SupportBanner() {
    if (!isStyleEnabled("support-banner")) enableStyle("support-banner", CSS);
    const userId = getCurrentUserId();
    const thanks = !!userId && isSupporter(userId);

    return (
        <div className="majic-support-banner" data-thanks={thanks || undefined}>
            <div className="majic-support-banner-main">
                <h2 className="majic-support-banner-title">{t(thanks ? "support.thanksTitle" : "badges.support")}</h2>
                <p className="majic-support-banner-text">{t(thanks ? "support.thanks" : "badges.supporterAsk")}</p>
                <button type="button" className="majic-support-banner-button" onClick={() => void MajicNative.openExternal(SPONSOR_URL)}>
                    <DiscordIcon name="HeartIcon" size={16} />{t("badges.support")}
                </button>
            </div>
            <div className="majic-support-banner-image">
                <img src={SUPPORTER_BADGE_ICON} alt="" />
            </div>
        </div>
    );
}
