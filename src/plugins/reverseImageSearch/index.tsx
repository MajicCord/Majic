/*
 * Majic — ReverseImageSearch plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { DiscordIcon, React } from "@webpack/common";

const s = createStrings({
    en: { search: "Search Image", all: "All" },
    fr: { search: "Rechercher l'image", all: "Tous" }
});

const Engines: Record<string, string> = {
    Google: "https://lens.google.com/uploadbyurl?url=",
    Yandex: "https://yandex.com/images/search?rpt=imageview&url=",
    SauceNAO: "https://saucenao.com/search.php?url=",
    IQDB: "https://iqdb.org/?url=",
    Bing: "https://www.bing.com/images/search?view=detailv2&iss=sbi&q=imgurl:",
    TinEye: "https://www.tineye.com/search?url=",
    ImgOps: "https://imgops.com/start?url="
};

const SearchIcon = () => <DiscordIcon name="MagnifyingGlassIcon" size={18} />;
const OpenExternalIcon = () => <DiscordIcon name="LinkExternalSmallIcon" size={18} />;

function search(src: string, engine: string) {
    open(engine + encodeURIComponent(src), "_blank");
}

function makeSearchItem(src: string) {
    return (
        <Menu.MenuItem
            label={s("search")}
            key="search-image"
            id="search-image"
            leadingAccessory={{ type: "icon", icon: SearchIcon }}
        >
            {Object.keys(Engines).map(engine => {
                const key = "search-image-" + engine;
                return (
                    <Menu.MenuItem
                        key={key}
                        id={key}
                        label={engine}
                        leadingAccessory={{ type: "image", src: `https://icons.duckduckgo.com/ip3/${new URL(Engines[engine]).host}.ico` }}
                        action={() => search(src, Engines[engine])}
                    />
                );
            })}
            <Menu.MenuItem
                key="search-image-all"
                id="search-image-all"
                label={s("all")}
                leadingAccessory={{ type: "icon", icon: OpenExternalIcon }}
                action={() => Object.values(Engines).forEach(engine => search(src, engine))}
            />
        </Menu.MenuItem>
    );
}

export default definePlugin({
    name: "ReverseImageSearch",
    description: "Adds image search to image context menus",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute la recherche d'image au menu clic droit des images"
        }
    },

    patches: [
        {
            find: "#{intl::MESSAGE_ACTIONS_MENU_LABEL}),shouldHideMediaOptions:",
            replacement: {
                match: /favoriteableType:\i,(?<=(\i)\.getAttribute\("data-type"\).+?)/,
                replace: (code: string, target: string) => `${code}majicImageSearchType:${target}.getAttribute("data-role"),`
            }
        }
    ],

    contextMenus: {
        message(children, props?: { itemSrc?: string; itemHref?: string; majicImageSearchType?: string }) {
            if (props?.majicImageSearchType !== "img") return;
            const src = props.itemHref ?? props.itemSrc;
            findGroupChildrenByChildId("copy-link", children)?.push(makeSearchItem(src!));
        },

        "image-context"(children, props?: { src?: string }) {
            if (!props?.src) return;
            (findGroupChildrenByChildId("copy-native-link", children) ?? children).push(makeSearchItem(props.src));
        }
    }
});
