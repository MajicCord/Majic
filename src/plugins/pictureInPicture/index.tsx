/*
 * Majic — PictureInPicture plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, React, Tooltip } from "@webpack/common";

const s = createStrings({
    en: { toggle: "Toggle Picture in Picture" },
    fr: { toggle: "Activer / désactiver l'incrustation vidéo" }
});

const logger = new Logger("PictureInPicture", "#8be9fd");

const settings = definePluginSettings({
    loop: {
        type: OptionType.BOOLEAN,
        description: "Loop the picture-in-picture video",
        default: true
    }
});

function openPictureInPicture(button: HTMLElement) {
    const video = button.parentNode!.parentNode!.querySelector("video")!;
    const videoClone = document.body.appendChild(video.cloneNode(true)) as HTMLVideoElement;

    videoClone.loop = settings.store.loop;
    videoClone.style.display = "none";

    let cleaned = false;
    function cleanup() {
        if (cleaned) return;
        cleaned = true;

        const { currentTime } = videoClone;

        videoClone.onloadedmetadata = null;
        videoClone.onleavepictureinpicture = null;

        videoClone.pause();
        videoClone.removeAttribute("src");
        videoClone.load();
        videoClone.remove();

        if (video.isConnected) {
            video.currentTime = currentTime;
            video.play().catch(() => 0);
        }
    }

    videoClone.onleavepictureinpicture = cleanup;

    async function launchPiP() {
        try {
            videoClone.currentTime = video.currentTime;
            video.pause();
            await videoClone.play();
            await videoClone.requestPictureInPicture();
        } catch (err) {
            logger.error("Failed to enter Picture-in-Picture", err);
            cleanup();
        }
    }

    if (videoClone.readyState >= 1) void launchPiP();
    else videoClone.onloadedmetadata = launchPiP;
}

function PictureInPictureButton() {
    return (
        <Tooltip text={s("toggle")}>
            {(tooltipProps: Record<string, unknown>) => (
                <div
                    {...tooltipProps}
                    className="majic-pip-button"
                    role="button"
                    style={{ cursor: "pointer", paddingTop: "4px", paddingLeft: "4px", paddingRight: "4px" }}
                    onClick={e => openPictureInPicture(e.currentTarget)}
                >
                    <DiscordIcon name="WindowTopOutlineIcon" size={24} />
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "PictureInPicture",
    description: "Adds a picture-in-picture button to videos (next to the Download button)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton d'incrustation vidéo aux vidéos (à côté du bouton Télécharger)",
            options: {
                loop: "Lire la vidéo incrustée en boucle"
            }
        }
    },
    settings,

    css: ".majic-pip-button { color: var(--interactive-icon-default); } .majic-pip-button:hover { background-color: var(--background-mod-subtle); color: var(--interactive-icon-hover); }",

    patches: [
        {
            find: '["VIDEO","CLIP","AUDIO"]',
            replacement: {
                match: /(\[\i>0&&\i\.length>0.{0,150}?children:)(\i.slice\(\i\))(?<=showDownload:(\i).+?isVisualMediaType:(\i).+?)/,
                replace: (_: string, rest: string, origChildren: string, showDownload: string, isVisualMediaType: string) =>
                    `${rest}[${showDownload}&&${isVisualMediaType}&&$self.PictureInPictureButton(),...${origChildren}]`
            }
        }
    ],

    PictureInPictureButton: withErrorBoundary("PictureInPicture", PictureInPictureButton)
});
