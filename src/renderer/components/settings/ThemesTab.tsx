/*
 * Majic — themes settings page
 */

import { settings } from "@api/settings";
import { addThemeChangeListener, removeThemeChangeListener, setEnabledThemes, setQuickCss, setQuickCssEnabled, setThemeLinks } from "@api/themes";
import { t, useLocale } from "@i18n";
import { DiscordIcon, React, useEffect, useReducer, useRef, useState } from "@webpack/common";

import { Button, Card, Heading, Page, SubHeading, Switch, Text, TextArea } from "../ui";

type ThemeInfo = Awaited<ReturnType<typeof MajicNative.themes.getThemesList>>[number];

const CSS = `
.majic-theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; margin-top: 12px; }
.majic-theme-card { display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 8px; background: var(--background-base-lowest, #1e1f22); border: 1px solid var(--border-subtle); }
.majic-theme-card[data-enabled="true"] { border-color: var(--majic-accent); }
.majic-theme-card-header { display: flex; align-items: center; gap: 8px; }
.majic-theme-card-name { flex: 1; min-width: 0; margin: 0; color: var(--text-strong); font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.majic-theme-card-author { color: var(--text-muted); font-size: 12px; }
.majic-theme-card-description { color: var(--text-default); font-size: 13px; line-height: 18px; }
.majic-theme-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.majic-theme-actions .majic-button { display: inline-flex; align-items: center; gap: 6px; }
`;

function QuickCssEditor() {
    const [css, setCss] = useState<string | null>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => {
        void MajicNative.getQuickCss().then(setCss);
    }, []);

    const onChange = (value: string) => {
        setCss(value);
        setQuickCss(value);
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => void MajicNative.setQuickCss(value), 500);
    };

    if (css == null) return <Text muted>{t("ui.loading")}</Text>;
    return <TextArea value={css} onChange={onChange} placeholder={t("themes.quickCssPlaceholder")} />;
}

function ThemeCard({ theme, enabled, onToggle }: { theme: ThemeInfo; enabled: boolean; onToggle(enabled: boolean): void }) {
    return (
        <div className="majic-theme-card" data-enabled={enabled}>
            <div className="majic-theme-card-header">
                <h3 className="majic-theme-card-name" title={theme.name}>{theme.name}</h3>
                <Switch checked={enabled} label={theme.name} onChange={onToggle} />
            </div>
            <span className="majic-theme-card-author">{t("themes.by", { author: theme.author })}{theme.version ? ` · v${theme.version}` : ""}</span>
            <span className="majic-theme-card-description">{theme.description}</span>
        </div>
    );
}

function LocalThemes() {
    const [themes, setThemes] = useState<ThemeInfo[] | null>(null);
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const load = () => void MajicNative.themes.getThemesList().then(setThemes);

    useEffect(() => {
        load();
        addThemeChangeListener(load);
        return () => removeThemeChangeListener(load);
    }, []);

    const toggle = (fileName: string, enabled: boolean) => {
        const current = settings.enabledThemes.filter(name => name !== fileName);
        setEnabledThemes(enabled ? [...current, fileName] : current);
        rerender();
    };

    return (
        <Card>
            <SubHeading>{t("themes.files")}</SubHeading>
            <Text muted>{t("themes.filesHint")}</Text>
            <div className="majic-theme-actions">
                <Button onClick={() => void MajicNative.themes.openFolder()}>
                    <DiscordIcon name="FolderIcon" size={16} />{t("themes.openFolder")}
                </Button>
                <Button variant="secondary" onClick={load}>
                    <DiscordIcon name="RetryIcon" size={16} />{t("themes.reload")}
                </Button>
            </div>
            {themes == null
                ? <Text muted>{t("ui.loading")}</Text>
                : themes.length === 0
                    ? <div style={{ marginTop: 12 }}><Text muted>{t("themes.noThemes")}</Text></div>
                    : (
                        <div className="majic-theme-grid">
                            {themes.map(theme => (
                                <ThemeCard
                                    key={theme.fileName}
                                    theme={theme}
                                    enabled={settings.enabledThemes.includes(theme.fileName)}
                                    onToggle={enabled => toggle(theme.fileName, enabled)}
                                />
                            ))}
                        </div>
                    )}
        </Card>
    );
}

function OnlineThemes() {
    const [text, setText] = useState(settings.themeLinks.join("\n"));

    const save = () => {
        const links = [...new Set(text.split("\n").map(link => link.trim()).filter(Boolean))];
        setThemeLinks(links);
        setText(links.join("\n"));
    };

    return (
        <Card>
            <SubHeading>{t("themes.online")}</SubHeading>
            <div style={{ marginBottom: 10 }}><Text muted>{t("themes.onlineHint")}</Text></div>
            <TextArea value={text} onChange={setText} placeholder={t("themes.onlinePlaceholder")} />
            <div className="majic-theme-actions">
                <Button onClick={save}>{t("themes.save")}</Button>
            </div>
        </Card>
    );
}

export function ThemesTab() {
    useLocale();
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    const toggleQuickCss = (value: boolean) => {
        setQuickCssEnabled(value);
        rerender();
    };

    return (
        <Page>
            <style>{CSS}</style>
            <Heading>{t("settings.themes")}</Heading>

            <LocalThemes />

            <OnlineThemes />

            <Card>
                <div className="majic-row" style={{ marginBottom: 10 }}>
                    <div className="majic-row-grow"><SubHeading>{t("themes.quickCss")}</SubHeading></div>
                    <Switch checked={settings.useQuickCss} label={t("themes.enableQuickCss")} onChange={toggleQuickCss} />
                </div>
                <QuickCssEditor />
                <div className="majic-theme-actions">
                    <Button variant="secondary" onClick={() => void MajicNative.quickCss.openFile()}>
                        <DiscordIcon name="PencilIcon" size={16} />{t("themes.openQuickCssFile")}
                    </Button>
                </div>
            </Card>
        </Page>
    );
}
