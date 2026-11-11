/*
 * Majic — GifProviderSwitcher plugin
 */

import { definePluginSettings } from "@api/settings";
import { ensureUiStyles, Select } from "@components/ui";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { FluxDispatcher, React, RestAPI, Stores, useEffect } from "@webpack/common";

import * as GiphyProvider from "./giphy";
import * as TenorProvider from "./tenor";
import type { TrendingCategoriesData } from "./types";

type ProviderName = "tenor" | "giphy" | "klipy";

let cachedCategories: TrendingCategoriesData | null = null;

const providers = {
    tenor: TenorProvider,
    giphy: GiphyProvider
};

const PROVIDER_OPTIONS = [
    { label: "Tenor", value: "tenor" as ProviderName, default: true },
    { label: "Giphy", value: "giphy" as ProviderName },
    { label: "Klipy", value: "klipy" as ProviderName }
];

const settings = definePluginSettings({
    provider: {
        type: OptionType.SELECT,
        description: "The provider to use. You can also change it directly in the GIF picker",
        options: PROVIDER_OPTIONS,
        onChange: () => {
            cachedCategories = null;
            void fetchCategories();
        }
    }
});

const getProviderName = () => settings.store.provider as ProviderName;

function getProvider() {
    const name = getProviderName();
    if (name === "klipy") throw new Error("Provider should never be klipy here");
    return providers[name];
}

async function fetchCategories() {
    if (!cachedCategories) {
        if (getProviderName() === "klipy") {
            const res = await RestAPI.get({
                url: "/gifs/trending",
                query: {
                    locale: Stores.LocaleStore.locale,
                    media_format: Stores.GIFPickerViewStore.getSelectedFormat()
                }
            });
            cachedCategories = {
                trendingCategories: res.body.categories,
                trendingGIFPreview: res.body.gifs[0]
            };
        } else {
            cachedCategories = await getProvider().getCategories();
            if (!cachedCategories) return;
        }
    }

    FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
}

function SearchWrapper({ Component, ...props }: { Component: React.ComponentType<any>; [key: string]: any }) {
    let { placeholder, "aria-label": ariaLabel } = props;
    const { ref, query, onChange } = props;

    const provider = settings.use(["provider"]).provider as ProviderName;

    useEffect(() => ref?.current?.focus(), [ref]);

    if (provider !== "klipy") {
        const name = provider[0].toUpperCase() + provider.slice(1);
        placeholder &&= placeholder.replace("Klipy", name);
        ariaLabel &&= ariaLabel.replace("Klipy", name);
    }

    return (
        <div className="majic-gif-provider-wrapper">
            <Component {...props} placeholder={placeholder} aria-label={ariaLabel} ref={ref} />
            <Select
                value={provider}
                options={PROVIDER_OPTIONS}
                onChange={value => {
                    settings.store.provider = value;
                    if (!query || value === provider) return;
                    onChange(query.startsWith(" ") ? query.slice(1) : " " + query);
                }}
            />
        </div>
    );
}

export default definePlugin({
    name: "GifProviderSwitcher",
    description: "Lets you use Tenor or Giphy GIF search instead of Klipy",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet d'utiliser la recherche de GIF de Tenor ou Giphy à la place de Klipy",
            options: {
                provider: "Le fournisseur à utiliser. Tu peux aussi le changer directement dans le sélecteur de GIF"
            }
        }
    },
    settings,

    css: ".majic-gif-provider-wrapper { display: grid; width: 100%; gap: 0.5em; grid-template-columns: 1fr max-content; } .majic-gif-provider-wrapper .majic-dropdown { width: 110px; }",

    patches: [
        {
            find: "renderHeaderContent()",
            replacement: {
                match: /(?<=return\(0,\i\.jsxs?\)\()(\i\.\i),{(?=query:\i.{0,100}?placeholder:)/,
                replace: "$self.SearchWrapper,{Component:$1,"
            }
        },
        {
            find: '"GIF_PICKER_TRENDING_FETCH_SUCCESS",trendingCategories:',
            replacement: [
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_SEARCH,query:\{q:(\i),/,
                    replace: "if($self.shouldReplace)return $self.handleSearchFetch($1);$&"
                },
                {
                    match: /""!==(\i)&&null!=\1&&\i\.\i\.get\(\{url:\i\.\i\.GIFS_SUGGEST,/,
                    replace: "if($self.shouldReplace)return $self.handleSuggestionsFetch($1);$&"
                },
                {
                    match: /\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING,/,
                    replace: "if($self.shouldReplace)return $self.handleTrendingFetch();$&"
                },
                {
                    match: /let \i=Date\.now\(\);\i\([^)]+\),\i\.\i\.get\(\{url:\i\.\i\.GIFS_TRENDING_GIFS,/,
                    replace: "if($self.shouldReplace)return $self.handleTrendingGifsFetch();$&"
                },
                {
                    match: /\i\.\i\.post\(\{url:\i\.\i\.GIFS_SELECT,body:\{id:(\i),q:(\i)\}/,
                    replace: "!$self.handleGifSelect($1,$2)&&$&"
                }
            ]
        },
        {
            find: '"IntegrationQueryStore"',
            replacement: {
                match: /(?<=search\((\i),(\i)\)\{)let \i=\i\.getResults\(\1,\2\)[,;]/,
                replace: "if($self.shouldReplace)return $self.tenorIntegrationSearch($1,$2);$&"
            }
        },
        {
            find: 'commandId:"-16"',
            replacement: {
                match: /commandId:"-16"}/,
                replace: '$&,TENOR:{type:"GIF",command:"tenor",title:"Tenor",commandId:"-9"}'
            }
        },
        {
            find: "#{intl::COMMAND_GIPHY_DESCRIPTION}",
            replacement: {
                match: /(\i)===\i\.\i\.GIF\.title/,
                replace: '$&||$1==="Tenor"'
            }
        }
    ],

    async start() {
        ensureUiStyles();
        if (getProviderName() === "klipy") return;
        cachedCategories = await getProvider().getCategories() ?? cachedCategories;
    },

    get shouldReplace() {
        return getProviderName() !== "klipy";
    },

    SearchWrapper: withErrorBoundary("GifProviderSwitcher", SearchWrapper),

    handleSearchFetch(query: string) {
        getProvider().search(query, 100)
            .then(items => {
                FluxDispatcher.dispatch(items.length
                    ? { type: "GIF_PICKER_QUERY_SUCCESS", query, items }
                    : { type: "GIF_PICKER_QUERY_FAILURE", query });
            })
            .catch(() => FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE", query }));
    },

    async handleSuggestionsFetch(query: string) {
        if (!query) return;
        const items = await getProvider().searchSuggestions(query);
        FluxDispatcher.dispatch({ type: "GIF_PICKER_SUGGESTIONS_SUCCESS", query, items });
    },

    async handleTrendingFetch() {
        if (!cachedCategories) {
            cachedCategories = await getProvider().getCategories();
            if (!cachedCategories) return;
        }
        FluxDispatcher.dispatch({ type: "GIF_PICKER_TRENDING_FETCH_SUCCESS", ...cachedCategories });
    },

    handleGifSelect(id: string, query: string) {
        if (getProviderName() === "klipy") return false;
        void getProvider().registerShare(id, query);
        return true;
    },

    handleTrendingGifsFetch() {
        getProvider().getTrending(50)
            .then(items => {
                FluxDispatcher.dispatch(items.length
                    ? { type: "GIF_PICKER_QUERY_SUCCESS", items }
                    : { type: "GIF_PICKER_QUERY_FAILURE" });
            })
            .catch(() => FluxDispatcher.dispatch({ type: "GIF_PICKER_QUERY_FAILURE" }));
    },

    tenorIntegrationSearch(integration: string, query: string) {
        FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY", integration, query });

        getProvider().search(query, 20)
            .then(results => {
                FluxDispatcher.dispatch(results.length
                    ? { type: "INTEGRATION_QUERY_SUCCESS", integration, query, results }
                    : { type: "INTEGRATION_QUERY_FAILURE", integration, query });
            })
            .catch(() => FluxDispatcher.dispatch({ type: "INTEGRATION_QUERY_FAILURE", integration, query, results: [] }));
    }
});
