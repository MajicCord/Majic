/*
 * Majic — VoiceDownload plugin
 */

import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { DiscordIcon, React } from "@webpack/common";

const s = createStrings({
    en: { download: "Download voice message" },
    fr: { download: "Télécharger le message vocal" }
});

export default definePlugin({
    name: "VoiceDownload",
    description: "Adds a download button to voice messages (opens in your browser)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton de téléchargement aux messages vocaux (s'ouvre dans ton navigateur)"
        }
    },

    css: ".majic-voice-download { width: 24px; height: 24px; color: var(--interactive-icon-default); cursor: pointer; position: relative; } .majic-voice-download:hover { color: var(--interactive-icon-active); }",

    patches: [
        {
            find: "#{intl::VOICE_MESSAGES_PLAYBACK_RATE_LABEL}",
            replacement: {
                match: /(?<=onVolumeHide:\i\}\))/,
                replace: ",$self.renderDownload(arguments[0].src)"
            }
        }
    ],

    renderDownload(src: string) {
        return (
            <a
                className="majic-voice-download"
                href={src}
                onClick={e => e.stopPropagation()}
                aria-label={s("download")}
                target="_blank"
            >
                <DiscordIcon name="DownloadIcon" size={24} />
            </a>
        );
    }
});
