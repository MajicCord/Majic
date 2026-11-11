/*
 * Majic — plugins settings page
 */

import { localized, t, useLocale } from "@i18n";
import { isPluginEnabled, pluginRequiresRestart, plugins, setPluginEnabled } from "@renderer/plugins";
import type { Plugin } from "@utils/types";
import { DiscordIcon, React, showToast, useMemo, useReducer, useState } from "@webpack/common";

import { Button, Card, Heading, Page, Select, Switch, Text, TextInput } from "../ui";
import { PluginOptions } from "./PluginOptions";

type Filter = "all" | "enabled" | "disabled";

export const pluginDescription = (plugin: Plugin) => localized(plugin.translations, {} as { description?: string }).description ?? plugin.description;

function PluginCard({ plugin, onRestartNeeded }: { plugin: Plugin; onRestartNeeded(): void }) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const [expanded, setExpanded] = useState(false);
    const enabled = isPluginEnabled(plugin.name);

    const toggle = (value: boolean) => {
        const ok = setPluginEnabled(plugin.name, value);
        if (!ok) showToast({ text: t("plugins.toggleFailed", { action: t(value ? "plugins.start" : "plugins.stop"), name: plugin.name }), variant: "critical" });
        if (pluginRequiresRestart(plugin)) onRestartNeeded();
        rerender();
    };

    return (
        <Card>
            <div className="majic-row">
                <div className="majic-row-grow">
                    <div className="majic-row" style={{ gap: 8 }}>
                        <Text><strong>{plugin.name}</strong></Text>
                        {plugin.required && <span className="majic-muted">{t("plugins.required")}</span>}
                    </div>
                    <Text muted>{pluginDescription(plugin)}</Text>
                </div>
                {(plugin.settings || plugin.settingsAboutComponent) && (
                    <button type="button" className="majic-icon-button" aria-label={t("plugins.settings")} onClick={() => setExpanded(!expanded)}>
                        <DiscordIcon name="SettingsIcon" size={18} color={expanded ? "var(--majic-accent)" : "currentColor"} />
                    </button>
                )}
                <Switch checked={enabled} disabled={plugin.required} onChange={toggle} label={plugin.name} />
            </div>
            {expanded && (plugin.settings || plugin.settingsAboutComponent) && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
                    <PluginOptions plugin={plugin} onRestartNeeded={onRestartNeeded} />
                </div>
            )}
        </Card>
    );
}

export function PluginsTab() {
    useLocale();
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [restartNeeded, setRestartNeeded] = useState(false);

    const sorted = useMemo(() => Object.values(plugins).sort((a, b) => a.name.localeCompare(b.name)), []);
    const query = search.trim().toLowerCase();

    const filters = [
        { label: t("plugins.filter.all"), value: "all" as Filter },
        { label: t("plugins.filter.enabled"), value: "enabled" as Filter },
        { label: t("plugins.filter.disabled"), value: "disabled" as Filter }
    ];

    const visible = sorted.filter(plugin => {
        if (filter === "enabled" && !isPluginEnabled(plugin.name)) return false;
        if (filter === "disabled" && isPluginEnabled(plugin.name)) return false;
        return !query || plugin.name.toLowerCase().includes(query) || pluginDescription(plugin).toLowerCase().includes(query);
    });

    return (
        <Page>
            <Heading>{t("settings.plugins")}</Heading>
            {restartNeeded && (
                <div className="majic-notice-card majic-row">
                    <div className="majic-row-grow"><Text>{t("plugins.reloadNeeded")}</Text></div>
                    <Button onClick={() => location.reload()}>{t("plugins.reload")}</Button>
                </div>
            )}
            <div className="majic-row">
                <div className="majic-row-grow"><TextInput value={search} onChange={setSearch} placeholder={t("plugins.search")} /></div>
                <div style={{ width: 180 }}><Select<Filter> value={filter} options={filters} onChange={setFilter} /></div>
            </div>
            {visible.map(plugin => <PluginCard key={plugin.name} plugin={plugin} onRestartNeeded={() => setRestartNeeded(true)} />)}
            {!visible.length && <Text muted>{t("plugins.noResults")}</Text>}
        </Page>
    );
}
