/*
 * Majic — plugin option editors
 */

import { getDefaultValue } from "@api/settings";
import { localized, t } from "@i18n";
import { type DefinedSettings, OptionType, type Plugin, type PluginSettingDef } from "@utils/types";
import { React, useReducer } from "@webpack/common";

import { Select, Slider, Switch, Text, TextArea, TextInput } from "../ui";

interface OptionEditorProps {
    name: string;
    def: PluginSettingDef;
    settings: DefinedSettings<any>;
    label: string;
    onRestartNeeded(): void;
}

function OptionEditor({ name, def, settings, label, onRestartNeeded }: OptionEditorProps) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);
    const store = settings.store as Record<string, any>;
    const value = store[name] ?? getDefaultValue(def);
    const disabled = def.disabled?.call(settings) ?? false;

    const set = (next: unknown) => {
        store[name] = next;
        if (def.restartNeeded) onRestartNeeded();
        rerender();
    };

    let editor: React.ReactNode = null;
    switch (def.type) {
        case OptionType.BOOLEAN:
            editor = <Switch checked={Boolean(value)} disabled={disabled} onChange={set} label={name} />;
            break;
        case OptionType.STRING:
            editor = def.multiline
                ? <TextArea value={value ?? ""} placeholder={def.placeholder} onChange={set} />
                : <TextInput value={value ?? ""} placeholder={def.placeholder} onChange={set} />;
            break;
        case OptionType.NUMBER:
            editor = <TextInput type="number" value={String(value ?? "")} placeholder={def.placeholder} onChange={v => set(v === "" ? undefined : Number(v))} />;
            break;
        case OptionType.BIGINT:
            editor = <TextInput value={String(value ?? "")} placeholder={def.placeholder} onChange={v => set(/^-?\d+$/.test(v) ? BigInt(v) : value)} />;
            break;
        case OptionType.SELECT:
            editor = <Select value={value} options={def.options} onChange={set} />;
            break;
        case OptionType.SLIDER:
            editor = <Slider value={Number(value)} min={Math.min(...def.markers)} max={Math.max(...def.markers)} onChange={set} />;
            break;
        case OptionType.COMPONENT:
            editor = React.createElement(def.component as React.ComponentType<any>, { setValue: set, option: def });
            break;
        case OptionType.CUSTOM:
            return null;
    }

    const inline = def.type === OptionType.BOOLEAN;
    return (
        <div style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : undefined }}>
            {inline ? (
                <div className="majic-row">
                    <div className="majic-row-grow"><Text>{label}</Text></div>
                    {editor}
                </div>
            ) : (
                <>
                    <Text>{label}</Text>
                    <div style={{ marginTop: 6 }}>{editor}</div>
                </>
            )}
        </div>
    );
}

export function PluginOptions({ plugin, onRestartNeeded }: { plugin: Plugin; onRestartNeeded(): void }) {
    const settings = plugin.settings;
    const About = plugin.settingsAboutComponent;
    if (!settings) return About ? <About /> : <Text muted>{t("plugins.noSettings")}</Text>;

    const labels = localized(plugin.translations, {} as { options?: Record<string, string> }).options ?? {};
    const entries = Object.entries<PluginSettingDef>(settings.def).filter(([, def]) => !def.hidden?.call(settings) && def.type !== OptionType.CUSTOM);
    if (!entries.length) return About ? <About /> : <Text muted>{t("plugins.noSettings")}</Text>;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {About && <About />}
            {entries.map(([name, def]) => <OptionEditor key={name} name={name} def={def} settings={settings} label={labels[name] ?? def.description} onRestartNeeded={onRestartNeeded} />)}
        </div>
    );
}
