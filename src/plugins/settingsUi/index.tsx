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

type TitleKey = "settings.majic" | "settings.plugins" | "settings.themes";

function sidebarItem(key: string, titleKey: TitleKey, icon: string, Component: ComponentType) {
    const title = () => t(titleKey);
    const Safe = () => <ErrorBoundary name={`${titleKey} page`} fallback={<p className="majic-text">{t("settings.pageError")}</p>}><Component /></ErrorBoundary>;

    return {
        key,
        type: LayoutTypes.SIDEBAR_ITEM,
        useTitle: title,
        icon: () => <DiscordIcon name={icon} />,
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
                    sidebarItem("majic_main", "settings.majic", "MagicWandIcon", MajicTab),
                    sidebarItem("majic_plugins", "settings.plugins", "PuzzlePieceIcon", PluginsTab),
                    sidebarItem("majic_themes", "settings.themes", "PaintbrushThinIcon", ThemesTab)
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
