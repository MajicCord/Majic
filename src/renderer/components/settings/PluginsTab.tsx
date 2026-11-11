/*
 * Majic — plugins settings page
 */

import { isPluginEnabled, pluginRequiresRestart, plugins, setPluginEnabled } from "@renderer/plugins";
import type { Plugin } from "@utils/types";
import { DiscordIcon, React, showToast, useMemo, useReducer, useState } from "@webpack/common";

import { Button, Card, Heading, Page, Select, Switch, Text, TextInput } from "../ui";
import { PluginOptions } from "./PluginOptions";

type Filter = "all" | "enabled" | "disabled";

const FILTERS = [
    { label: "All plugins", value: "all" as Filter },
    { label: "Enabled", value: "enabled" as Filter },
    { label: "Disabled", value: "disabled" as Filter }
];

function PluginCard({ plugin, onRestartNeeded }: { plugin: Plugin; onRestartNeeded(): void }) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const [expanded, setExpanded] = useState(false);
    const enabled = isPluginEnabled(plugin.name);

    const toggle = (value: boolean) => {
        const ok = setPluginEnabled(plugin.name, value);
        if (!ok) showToast({ text: `Could not ${value ? "start" : "stop"} ${plugin.name}`, variant: "critical" });
        if (pluginRequiresRestart(plugin)) onRestartNeeded();
        rerender();
    };

    return (
        <Card>
            <div className="majic-row">
                <div className="majic-row-grow">
                    <div className="majic-row" style={{ gap: 8 }}>
                        <Text><strong>{plugin.name}</strong></Text>
                        {plugin.required && <span className="majic-muted">required</span>}
                    </div>
                    <Text muted>{plugin.description}</Text>
                </div>
                {plugin.settings && (
                    <button type="button" className="majic-icon-button" aria-label="Settings" onClick={() => setExpanded(!expanded)}>
                        <DiscordIcon name="SettingsIcon" size={18} color={expanded ? "var(--majic-accent)" : "currentColor"} />
                    </button>
                )}
                <Switch checked={enabled} disabled={plugin.required} onChange={toggle} label={plugin.name} />
            </div>
            {expanded && plugin.settings && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--background-modifier-accent)" }}>
                    <PluginOptions settings={plugin.settings} onRestartNeeded={onRestartNeeded} />
                </div>
            )}
        </Card>
    );
}

export function PluginsTab() {
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [restartNeeded, setRestartNeeded] = useState(false);

    const sorted = useMemo(() => Object.values(plugins).sort((a, b) => a.name.localeCompare(b.name)), []);
    const query = search.trim().toLowerCase();

    const visible = sorted.filter(plugin => {
        if (filter === "enabled" && !isPluginEnabled(plugin.name)) return false;
        if (filter === "disabled" && isPluginEnabled(plugin.name)) return false;
        return !query || plugin.name.toLowerCase().includes(query) || plugin.description.toLowerCase().includes(query);
    });

    return (
        <Page>
            <Heading>Plugins</Heading>
            {restartNeeded && (
                <div className="majic-notice-card majic-row">
                    <div className="majic-row-grow"><Text>Some changes need a reload to apply.</Text></div>
                    <Button onClick={() => location.reload()}>Reload</Button>
                </div>
            )}
            <div className="majic-row">
                <div className="majic-row-grow"><TextInput value={search} onChange={setSearch} placeholder="Search plugins..." /></div>
                <div style={{ width: 160 }}><Select<Filter> value={filter} options={FILTERS} onChange={setFilter} /></div>
            </div>
            {visible.map(plugin => <PluginCard key={plugin.name} plugin={plugin} onRestartNeeded={() => setRestartNeeded(true)} />)}
            {!visible.length && <Text muted>No plugin matches your search.</Text>}
        </Page>
    );
}
