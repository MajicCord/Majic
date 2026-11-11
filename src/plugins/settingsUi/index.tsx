/*
 * Majic — settings UI core plugin
 */

import { MajicTab } from "@components/settings/MajicTab";
import { PluginsTab } from "@components/settings/PluginsTab";
import { ThemesTab } from "@components/settings/ThemesTab";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { t } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";
import { waitFor } from "@webpack";
import { DiscordIcon, React } from "@webpack/common";
import type { ComponentType } from "react";

const logger = new Logger("SettingsUI", "#b18cff");

let LayoutTypes: Record<"SECTION" | "SIDEBAR_ITEM" | "PANEL" | "CATEGORY" | "CUSTOM", number> = {
    SECTION: 1,
    SIDEBAR_ITEM: 2,
    PANEL: 3,
    CATEGORY: 5,
    CUSTOM: 19
};
waitFor(["SECTION", "SIDEBAR_ITEM", "PANEL", "CATEGORY", "CUSTOM"], types => LayoutTypes = types);

interface LayoutNode {
    type: number;
    key?: string;
    [key: string]: unknown;
}

interface LayoutBuilder {
    key?: string;
    buildLayout(): LayoutNode[];
}

const SECTION_KEY = "majic_section";
const PLACE_BEFORE = "billing_section";

export interface SettingsEntry {
    key: string;
    title: string | (() => string);
    Component: ComponentType;
    Icon: string | ComponentType<{ width?: number; height?: number }>;
}

const customEntries: SettingsEntry[] = [];

function sidebarItem({ key, title: rawTitle, Component, Icon }: SettingsEntry) {
    const title = typeof rawTitle === "function" ? rawTitle : () => rawTitle;
    const Safe = () => <ErrorBoundary name={`${key} page`} fallback={<p className="majic-text">{t("settings.pageError")}</p>}><Component /></ErrorBoundary>;

    return {
        key,
        type: LayoutTypes.SIDEBAR_ITEM,
        useTitle: title,
        icon: () => typeof Icon === "string" ? <DiscordIcon name={Icon} /> : <Icon width={20} height={20} />,
        buildLayout: () => [{
            key: `${key}_panel`,
            type: LayoutTypes.PANEL,
            useTitle: title,
            buildLayout: () => [{
                key: `${key}_category`,
                type: LayoutTypes.CATEGORY,
                buildLayout: () => [{
                    key: `${key}_custom`,
                    type: LayoutTypes.CUSTOM,
                    Component: Safe,
                    useSearchTerms: () => [title(), "majic"]
                }]
            }]
        }]
    };
}

export default definePlugin({
    name: "SettingsUI",
    description: "Adds Majic's pages to Discord's settings",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute les pages de Majic aux paramètres de Discord"
        }
    },
    required: true,

    customEntries,

    patches: [
        {
            find: ".buildLayout().map",
            replacement: {
                match: /(\i)\.buildLayout\(\)(?=\.map)/,
                replace: "$self.buildLayout($1)"
            }
        }
    ],

    buildLayout(builder: LayoutBuilder) {
        const layout = builder.buildLayout();
        if (builder.key !== "$Root" || !Array.isArray(layout) || layout.some(node => node?.key === SECTION_KEY)) return layout;

        try {
            const section = {
                key: SECTION_KEY,
                type: LayoutTypes.SECTION,
                useTitle: () => "Majic",
                buildLayout: () => [
                    sidebarItem({ key: "majic_main", title: () => t("settings.majic"), Icon: "MagicWandIcon", Component: MajicTab }),
                    sidebarItem({ key: "majic_plugins", title: () => t("settings.plugins"), Icon: "PuzzlePieceIcon", Component: PluginsTab }),
                    sidebarItem({ key: "majic_themes", title: () => t("settings.themes"), Icon: "PaintbrushThinIcon", Component: ThemesTab }),
                    ...customEntries.map(sidebarItem)
                ]
            };

            const index = layout.findIndex(node => node?.key === PLACE_BEFORE);
            const result = [...layout];
            result.splice(index === -1 ? result.length : index, 0, section);
            return result;
        } catch (err) {
            logger.error("Could not add Majic to the settings", err);
            return layout;
        }
    }
});
