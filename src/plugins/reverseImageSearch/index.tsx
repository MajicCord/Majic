/*
 * Majic — ReverseImageSearch plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";
import { createStrings } from "@i18n";
import { React } from "@webpack/common";

const s = createStrings({
    en: { search: "Search image", all: "All engines" },
    fr: { search: "Rechercher l'image", all: "Tous les moteurs" }
});

const ENGINES: Record<string, string> = {
    "Google Lens": "https://lens.google.com/uploadbyurl?url=",
    Bing: "https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    TinEye: "https://www.tineye.com/search?url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    IQDB: "https://iqdb.org/?url="
};

const IMAGE_URL = /\.(png|jpe?g|gif|webp|avif|bmp)(\?|$)|media\.discordapp\.net|cdn\.discordapp\.com\/(attachments|avatars|icons|banners|emojis)/i;

const openSearch = (engine: string, src: string) => window.open(ENGINES[engine] + encodeURIComponent(src), "_blank");

function searchItem(src: string) {
    return (
        <Menu.MenuItem id="majic-search-image" key="majic-search-image" label={s("search")}>
            {Object.keys(ENGINES).map(engine => (
                <Menu.MenuItem key={engine} id={`majic-search-image-${engine}`} label={engine} action={() => openSearch(engine, src)} />
            ))}
            <Menu.MenuSeparator />
            <Menu.MenuItem id="majic-search-image-all" label={s("all")} action={() => Object.keys(ENGINES).forEach(engine => openSearch(engine, src))} />
        </Menu.MenuItem>
    );
}

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Adds a \"Search image\" item to image context menus, with Google Lens, Bing, Yandex and more",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute « Rechercher l'image » au menu clic droit des images, avec Google Lens, Bing, Yandex et plus"
        }
    },

    contextMenus: {
        message(children, props?: { itemSrc?: string; itemHref?: string }) {
            const src = props?.itemSrc ?? props?.itemHref;
            if (!src || !IMAGE_URL.test(src) || !Menu.MenuItem) return;
            (findGroupChildrenByChildId("copy-link", children) ?? children).push(searchItem(src));
        },

        "image-context"(children, props?: { src?: string }) {
            if (!props?.src || !Menu.MenuItem) return;
            (findGroupChildrenByChildId("copy-native-link", children) ?? children).push(searchItem(props.src));
        }
    }
});
