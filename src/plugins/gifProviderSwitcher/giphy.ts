/*
 * Majic — GifProviderSwitcher giphy provider
 */

import { Stores } from "@webpack/common";

import type { DiscordGif, TrendingCategoriesData } from "./types";

const isNonNullish = <T>(value: T | null | undefined): value is T => value != null;
const GIPHY_KEY = "Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g";

interface GiphyImage {
    url: string;
    width: string;
    height: string;
    mp4?: string;
    webp?: string;
}
interface GiphyResult {
    id: string;
    title: string;
    url: string;
    images: Record<string, GiphyImage>;
}
interface GiphyCategory {
    name: string;
    gif?: GiphyResult;
}

const MAX_PAGE_SIZE = 50;

function getLang() {
    const locale = Stores.LocaleStore.locale.toLowerCase();
    if (locale.startsWith("zh"))
        return locale.includes("tw") || locale.includes("hant") ? "zh-TW" : "zh-CN";

    return locale.split("-")[0];
}

async function fetchApi<TResult>(path: string, params: Record<string, string> = {}) {
    const url = `https://api.giphy.com/v1${path}?` + new URLSearchParams({
        api_key: GIPHY_KEY,
        lang: getLang(),
        ...params
    });

    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`GET ${path}: Giphy API request failed with status ${res.status}`);

    return res.json() as Promise<TResult>;
}

async function fetchGiphyResults(path: string, limit: number, extra: Record<string, string> = {}) {
    const pageCount = Math.ceil(limit / MAX_PAGE_SIZE);

    const pages = await Promise.all(Array.from({ length: pageCount }, (_, i) => {
        const offset = i * MAX_PAGE_SIZE;
        return fetchApi<{ data?: GiphyResult[]; }>(path, {
            ...extra,
            limit: String(Math.min(MAX_PAGE_SIZE, limit - offset)),
            offset: String(offset)
        });
    }));
    const unique = new Map(pages.flatMap(p => p.data ?? []).map(item => [item.id, item]));
    return [...unique.values()].slice(0, limit);
}

function toDiscordGif(item: GiphyResult): DiscordGif | null {
    const format = Stores.GIFPickerViewStore.getSelectedFormat() === "tinywebp"
        ? "webp"
        : "mp4";

    const { id, title, url, images } = item;
    const { original, fixed_height, fixed_height_still } = images;

    const src = fixed_height?.[format];
    if (!original?.url || !src) return null;

    return {
        id,
        title,
        url,
        gif_src: original.url,
        src,
        width: Number(fixed_height.width),
        height: Number(fixed_height.height),
        preview: fixed_height_still?.url ?? original.url
    };
}

function mapToDiscordGifs(items: GiphyResult[]) {
    return items.map(toDiscordGif).filter(isNonNullish);
}

export const search = (q: string, limit: number) => fetchGiphyResults("/gifs/search", limit, { q }).then(mapToDiscordGifs);
export const searchSuggestions = (q: string) => fetchApi<{ data?: Array<{ name: string; }>; }>("/gifs/search/tags", { q, limit: "5" }).then(res => res.data?.map(t => t.name) ?? []);
export const getTrending = (limit: number) => fetchGiphyResults("/gifs/trending", limit).then(mapToDiscordGifs);
export async function registerShare(_id: string, _q: string) { }

export async function getCategories(): Promise<TrendingCategoriesData | null> {
    const res = await fetchApi<{ data?: GiphyCategory[]; }>("/gifs/categories").catch(() => null);

    const categories = res?.data
        ?.map(c => ({ name: c.name, src: c.gif?.images?.fixed_height?.url }))
        .filter((c): c is { name: string; src: string; } => !!c.src);

    if (!categories?.length) return null;

    return {
        trendingCategories: categories,
        trendingGIFPreview: { src: categories[0].src }
    };
}
