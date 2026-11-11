/*
 * Majic — FixImagesQuality plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { React } from "@webpack/common";

const s = createStrings({
    en: {
        defaultTitle: "The default behaviour is the following:",
        defaultChat: "In chat, optimised but full resolution images will be loaded.",
        defaultModal: "In the image viewer, the original image will be loaded.",
        caveatsTitle: "You can also load the original image in chat, but beware of the following caveats:",
        caveatAnimate: "Animated images (GIF, WebP, etc.) in chat will always animate, even when the app isn't focused.",
        caveatLag: "May cause lag."
    },
    fr: {
        defaultTitle: "Par défaut :",
        defaultChat: "Dans le chat, les images sont chargées en pleine résolution mais optimisées.",
        defaultModal: "Dans la visionneuse, l'image d'origine est chargée.",
        caveatsTitle: "Tu peux aussi charger l'image d'origine dans le chat, mais attention :",
        caveatAnimate: "Les images animées (GIF, WebP, etc.) du chat seront toujours animées, même quand l'application n'est pas au premier plan.",
        caveatLag: "Ça peut ralentir l'application."
    }
});

const logger = new Logger("FixImagesQuality", "#8be9fd");

const settings = definePluginSettings({
    originalImagesInChat: {
        type: OptionType.BOOLEAN,
        description: "Also load the original image in chat. WARNING: read the caveats above",
        default: false
    }
});

function About() {
    return (
        <div className="majic-fiq-about">
            <p className="majic-fiq-title">{s("defaultTitle")}</p>
            <ul>
                <li>{s("defaultChat")}</li>
                <li>{s("defaultModal")}</li>
            </ul>
            <p className="majic-fiq-title">{s("caveatsTitle")}</p>
            <ul>
                <li>{s("caveatAnimate")}</li>
                <li>{s("caveatLag")}</li>
            </ul>
        </div>
    );
}

export default definePlugin({
    name: "FixImagesQuality",
    description: "Improves image quality by loading them at their original resolution",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Améliore la qualité des images en les chargeant à leur résolution d'origine",
            options: {
                originalImagesInChat: "Charger aussi l'image d'origine dans le chat. ATTENTION : lis les limites ci-dessus"
            }
        }
    },
    settings,

    css: ".majic-fiq-about { display: flex; flex-direction: column; gap: 4px; padding: 12px 16px; border-radius: 8px; color: var(--text-default); background: var(--background-base-lower); border: 1px solid var(--border-subtle); } .majic-fiq-about p, .majic-fiq-about ul { margin: 0; } .majic-fiq-title { font-weight: 600; color: var(--text-strong); }",

    patches: [
        {
            find: ".handleImageLoad)",
            replacement: {
                match: /getSrc\(\i\)\{/,
                replace: "$&var _majicSrc=$self.getSrc(this?.props,arguments[1]);if(_majicSrc)return _majicSrc;"
            }
        }
    ],

    settingsAboutComponent: About,

    getSrc(props: { src: string; width: number; height: number; contentType: string; mosaicStyleAlt?: boolean; trigger?: string }, freeze?: boolean) {
        if (!props?.src) return;

        try {
            const { contentType, height, src, width, mosaicStyleAlt, trigger } = props;

            const isImage = contentType?.startsWith("image/") ?? (typeof mosaicStyleAlt === "boolean");
            if (!isImage || src.startsWith("data:")) return;

            const url = new URL(src);
            if (!url.pathname.startsWith("/attachments/")) return;

            url.searchParams.set("animated", String(!freeze));
            if (freeze && url.pathname.endsWith(".gif")) url.searchParams.set("format", "webp");

            const isModal = !!trigger;
            if (!settings.store.originalImagesInChat && !isModal) {
                const pixels = width * height;
                const limit = 2000 * 1200;

                if (pixels <= limit) return url.toString();

                const scale = Math.sqrt(pixels / limit);
                url.searchParams.set("width", Math.round(width / scale).toString());
                url.searchParams.set("height", Math.round(height / scale).toString());
                return url.toString();
            }

            url.hostname = "cdn.discordapp.com";
            return url.toString();
        } catch (err) {
            logger.error("Failed to make image src", err);
            return;
        }
    }
});
