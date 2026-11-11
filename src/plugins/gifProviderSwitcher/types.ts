/*
 * Majic — GifProviderSwitcher types
 */

export interface DiscordGif {
    id: string;
    title: string;
    url: string;
    src: string;
    gif_src: string;
    width: number;
    height: number;
    preview: string;
}

export interface TrendingCategoriesData {
    trendingCategories: Record<"name" | "src", string>[];
    trendingGIFPreview: { src: string };
}
