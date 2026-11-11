/*
 * Majic — ReplaceGoogleSearch plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, React } from "@webpack/common";

const s = createStrings({
    en: { off: "Off", custom: "Custom Engine", searchWith: "Search with {name}", searchText: "Search Text" },
    fr: { off: "Désactivé", custom: "Moteur personnalisé", searchWith: "Rechercher avec {name}", searchText: "Rechercher le texte" }
});

const DefaultEngines: Record<string, string> = {
    Google: "https://www.google.com/search?q=",
    DuckDuckGo: "https://duckduckgo.com/?q=",
    Brave: "https://search.brave.com/search?q=",
    Bing: "https://www.bing.com/search?q=",
    Yahoo: "https://search.yahoo.com/search?p=",
    Yandex: "https://yandex.com/search/?text=",
    GitHub: "https://github.com/search?q=",
    Reddit: "https://www.reddit.com/search?q=",
    Wikipedia: "https://wikipedia.org/w/index.php?search=",
    Startpage: "https://www.startpage.com/sp/search?query=",
    Kagi: "https://kagi.com/search?q="
};

const ReplacementEngineValue = {
    OFF: "off",
    CUSTOM: "custom"
} as const;

const settings = definePluginSettings({
    customEngineName: {
        type: OptionType.STRING,
        description: "Name of the custom search engine",
        placeholder: "Google"
    },
    customEngineURL: {
        type: OptionType.STRING,
        description: "The URL of your engine",
        placeholder: "https://google.com/search?q="
    },
    replacementEngine: {
        type: OptionType.SELECT,
        description: "Replace with a specific search engine instead of adding a menu",
        options: [
            { get label() { return s("off"); }, value: ReplacementEngineValue.OFF, default: true },
            { get label() { return s("custom"); }, value: ReplacementEngineValue.CUSTOM },
            ...Object.keys(DefaultEngines).map(engine => ({ label: engine, value: engine }))
        ]
    }
});

const SearchIcon = (props: { width?: number }) => <DiscordIcon name="MagnifyingGlassIcon" size={props.width ?? 18} />;

function search(src: string, engine: string) {
    open(engine + encodeURIComponent(src.trim()), "_blank");
}

function makeSearchItem(src: string) {
    const { customEngineName, customEngineURL, replacementEngine } = settings.store;

    const hasCustomEngine = Boolean(customEngineName && customEngineURL);
    const hasValidReplacementEngine = replacementEngine !== ReplacementEngineValue.OFF && !(replacementEngine === ReplacementEngineValue.CUSTOM && !hasCustomEngine);

    const Engines = { ...DefaultEngines };
    if (hasCustomEngine) Engines[customEngineName!] = customEngineURL!;

    if (hasValidReplacementEngine) {
        const name = replacementEngine === ReplacementEngineValue.CUSTOM && hasCustomEngine
            ? customEngineName!
            : String(replacementEngine);

        return (
            <Menu.MenuItem
                label={s("searchWith", { name })}
                key="search-custom-engine"
                id="majic-search-custom-engine"
                action={() => search(src, Engines[name])}
            />
        );
    }

    return (
        <Menu.MenuItem
            label={s("searchText")}
            key="search-text"
            id="majic-search-text"
            leadingAccessory={{ type: "icon", icon: SearchIcon }}
        >
            {Object.keys(Engines).map(engine => {
                const key = "majic-search-content-" + engine;
                return (
                    <Menu.MenuItem
                        key={key}
                        id={key}
                        label={engine}
                        leadingAccessory={{ type: "image", src: `https://icons.duckduckgo.com/ip3/${new URL(Engines[engine]).hostname}.ico` }}
                        action={() => search(src, Engines[engine])}
                    />
                );
            })}
        </Menu.MenuItem>
    );
}

export default definePlugin({
    name: "ReplaceGoogleSearch",
    description: "Replaces the Google search with other search engines",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Remplace la recherche Google par d'autres moteurs de recherche",
            options: {
                customEngineName: "Nom du moteur de recherche personnalisé",
                customEngineURL: "L'adresse de ton moteur",
                replacementEngine: "Remplacer par un moteur précis au lieu d'ajouter un menu"
            }
        }
    },
    settings,

    contextMenus: {
        message(children) {
            const selection = document.getSelection()?.toString();
            if (!selection) return;

            const group = findGroupChildrenByChildId("search-google", children);
            if (group) {
                const idx = group.findIndex(c => c?.props?.id === "search-google");
                if (idx !== -1) group[idx] = makeSearchItem(selection);
            }
        }
    }
});
