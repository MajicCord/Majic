/*
 * Majic — Dearrow plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { React, Tooltip } from "@webpack/common";

const s = createStrings({
    en: {
        restore: "This embed has been dearrowed, click to restore",
        dearrow: "Click to dearrow",
        everything: "Everything (Titles & Thumbnails)",
        titles: "Titles",
        thumbnails: "Thumbnails"
    },
    fr: {
        restore: "Cet aperçu a été dearrowé, clique pour revenir à l'original",
        dearrow: "Clique pour dearrower",
        everything: "Tout (titres et miniatures)",
        titles: "Titres",
        thumbnails: "Miniatures"
    }
});

const logger = new Logger("Dearrow", "#88c9f9");

interface EmbedComponent {
    props: {
        embed: {
            rawTitle: string;
            provider?: { name: string };
            thumbnail: { proxyURL: string };
            video: { url: string };
            dearrow: { enabled: boolean; oldTitle?: string; oldThumb?: string };
        };
    };
    forceUpdate(): void;
}

const ReplaceElements = {
    ReplaceAllElements: 0,
    ReplaceTitlesOnly: 1,
    ReplaceThumbnailsOnly: 2
} as const;

const embedUrlRe = /https:\/\/www\.youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/;

const settings = definePluginSettings({
    hideButton: {
        type: OptionType.BOOLEAN,
        description: "Hides the Dearrow button from YouTube embeds",
        default: false,
        restartNeeded: true
    },
    replaceElements: {
        type: OptionType.SELECT,
        description: "Choose which elements of the embed will be replaced",
        restartNeeded: true,
        options: [
            { get label() { return s("everything"); }, value: ReplaceElements.ReplaceAllElements, default: true },
            { get label() { return s("titles"); }, value: ReplaceElements.ReplaceTitlesOnly },
            { get label() { return s("thumbnails"); }, value: ReplaceElements.ReplaceThumbnailsOnly }
        ]
    },
    dearrowByDefault: {
        type: OptionType.BOOLEAN,
        description: "Dearrow videos automatically",
        default: true
    }
});

async function embedDidMount(this: EmbedComponent) {
    try {
        const { embed } = this.props;
        const { replaceElements, dearrowByDefault } = settings.store;

        if (!embed || embed.dearrow || embed.provider?.name !== "YouTube" || !embed.video?.url) return;

        const videoId = embedUrlRe.exec(embed.video.url)?.[1];
        if (!videoId) return;

        const res = await fetch(`https://sponsor.ajay.app/api/branding?videoID=${videoId}`);
        if (!res.ok) return;

        const { titles, thumbnails } = await res.json();

        const hasTitle = titles[0]?.votes >= 0;
        const hasThumb = thumbnails[0]?.votes >= 0 && !thumbnails[0].original;

        if (!hasTitle && !hasThumb) return;

        embed.dearrow = { enabled: dearrowByDefault };

        if (hasTitle && replaceElements !== ReplaceElements.ReplaceThumbnailsOnly) {
            const replacementTitle = titles[0].title.replace(/(^|\s)>(\S)/g, "$1$2");
            embed.dearrow.oldTitle = dearrowByDefault ? embed.rawTitle : replacementTitle;
            if (dearrowByDefault) embed.rawTitle = replacementTitle;
        }

        if (hasThumb && replaceElements !== ReplaceElements.ReplaceTitlesOnly) {
            const replacementProxyURL = `https://dearrow-thumb.ajay.app/api/v1/getThumbnail?videoID=${videoId}&time=${thumbnails[0].timestamp}`;
            embed.dearrow.oldThumb = dearrowByDefault ? embed.thumbnail.proxyURL : replacementProxyURL;
            if (dearrowByDefault) embed.thumbnail.proxyURL = replacementProxyURL;
        }

        this.forceUpdate();
    } catch (err) {
        logger.error("Failed to dearrow embed", err);
    }
}

function DearrowButton({ component }: { component: EmbedComponent }) {
    const { embed } = component.props;
    if (!embed?.dearrow) return null;

    return (
        <Tooltip text={embed.dearrow.enabled ? s("restore") : s("dearrow")}>
            {({ onMouseEnter, onMouseLeave }: { onMouseEnter(): void; onMouseLeave(): void }) => (
                <button
                    onMouseEnter={onMouseEnter}
                    onMouseLeave={onMouseLeave}
                    className={"majic-dearrow-toggle-" + (embed.dearrow.enabled ? "on" : "off")}
                    onClick={() => {
                        const { enabled, oldThumb, oldTitle } = embed.dearrow;
                        embed.dearrow.enabled = !enabled;
                        if (oldTitle) {
                            embed.dearrow.oldTitle = embed.rawTitle;
                            embed.rawTitle = oldTitle;
                        }
                        if (oldThumb) {
                            embed.dearrow.oldThumb = embed.thumbnail.proxyURL;
                            embed.thumbnail.proxyURL = oldThumb;
                        }
                        component.forceUpdate();
                    }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 36 36" aria-label="Dearrow" className="majic-dearrow-icon">
                        <path fill="#1213BD" d="M36 18.302c0 4.981-2.46 9.198-5.655 12.462s-7.323 5.152-12.199 5.152s-9.764-1.112-12.959-4.376S0 23.283 0 18.302s2.574-9.38 5.769-12.644S13.271 0 18.146 0s9.394 2.178 12.589 5.442C33.931 8.706 36 13.322 36 18.302z" />
                        <path fill="#88c9f9" d="m 30.394282,18.410186 c 0,3.468849 -1.143025,6.865475 -3.416513,9.137917 -2.273489,2.272442 -5.670115,2.92874 -9.137918,2.92874 -3.467803,0 -6.373515,-1.147212 -8.6470033,-3.419654 -2.2734888,-2.272442 -3.5871299,-5.178154 -3.5871299,-8.647003 0,-3.46885 0.9420533,-6.746149 3.2144954,-9.0196379 2.2724418,-2.2734888 5.5507878,-3.9513905 9.0196378,-3.9513905 3.46885,0 6.492841,1.9322561 8.76633,4.204698 2.273489,2.2724424 3.788101,5.2974804 3.788101,8.7663304 z" />
                        <path fill="#0a62a5" d="m 23.95823,17.818306 c 0,3.153748 -2.644888,5.808102 -5.798635,5.808102 -3.153748,0 -5.599825,-2.654354 -5.599825,-5.808102 0,-3.153747 2.446077,-5.721714 5.599825,-5.721714 3.153747,0 5.798635,2.567967 5.798635,5.721714 z" />
                    </svg>
                </button>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "Dearrow",
    description: "Makes YouTube embed titles and thumbnails less sensationalist, powered by Dearrow",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Rend les titres et miniatures des aperçus YouTube moins racoleurs, grâce à Dearrow",
            options: {
                hideButton: "Masquer le bouton Dearrow des aperçus YouTube",
                replaceElements: "Éléments de l'aperçu à remplacer",
                dearrowByDefault: "Dearrower les vidéos automatiquement"
            }
        }
    },
    settings,

    css: ".majic-dearrow-toggle-off .majic-dearrow-icon { filter: grayscale(1); } .majic-dearrow-toggle-on, .majic-dearrow-toggle-off { all: unset; display: inline; cursor: pointer; position: absolute; top: 0.75rem; right: 0.75rem; }",

    embedDidMount,

    renderButton(component: EmbedComponent) {
        return (
            <ErrorBoundary name="Dearrow">
                <DearrowButton component={component} />
            </ErrorBoundary>
        );
    },

    patches: [
        {
            find: "this.renderInlineMediaEmbed",
            replacement: [
                {
                    match: /render\(\)\{.{0,30}let\{embed:/,
                    replace: "componentDidMount=$self.embedDidMount;$&"
                },
                {
                    match: /children:\[(?=null!=\i\?(\i)\.renderSuppressButton)/,
                    replace: "children:[$self.renderButton($1),",
                    predicate: () => !settings.store.hideButton
                }
            ]
        }
    ]
});
