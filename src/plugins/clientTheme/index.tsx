/*
 * Majic — ClientTheme plugin
 */

import { definePluginSettings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { Button, SubHeading, Text } from "@components/ui";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { findByCodeLazy, findStoreLazy } from "@webpack";
import { ColorPicker, React, Stores, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: {
        themeColor: "Theme Color",
        themeColorDescription: "Add a color to your Discord client theme",
        warning: "Your theme won't look good!",
        contrast: "> The selected color won't contrast well with text",
        nitro: "> Nitro themes aren't supported",
        switchMode: "Switch to {mode} mode",
        light: "Light",
        dark: "Dark",
        disableNitro: "Disable Nitro Theme",
        reset: "Reset Theme Color"
    },
    fr: {
        themeColor: "Couleur du thème",
        themeColorDescription: "Ajoute une couleur au thème de ton client Discord",
        warning: "Ton thème ne rendra pas bien !",
        contrast: "> La couleur choisie ne contrastera pas bien avec le texte",
        nitro: "> Les thèmes Nitro ne sont pas pris en charge",
        switchMode: "Passer en mode {mode}",
        light: "clair",
        dark: "sombre",
        disableNitro: "Désactiver le thème Nitro",
        reset: "Réinitialiser la couleur du thème"
    }
});

const VARS_STYLE_ID = "majic-client-theme-vars";
const OVERRIDES_STYLE_ID = "majic-client-theme-overrides";

const saveClientTheme = findByCodeLazy('type:"UNSYNCED_USER_SETTINGS_UPDATE', '"system"===');
const NitroThemeStore = findStoreLazy("ClientThemesBackgroundStore");

const colorPresets = [
    "#1E1514", "#172019", "#13171B", "#1C1C28", "#402D2D",
    "#3A483D", "#344242", "#313D4B", "#2D2F47", "#322B42",
    "#3C2E42", "#422938", "#b6908f", "#bfa088", "#d3c77d",
    "#86ac86", "#88aab3", "#8693b5", "#8a89ba", "#ad94bb"
];

function hexToHSL(hexCode: string) {
    const r = parseInt(hexCode.substring(0, 2), 16) / 255;
    const g = parseInt(hexCode.substring(2, 4), 16) / 255;
    const b = parseInt(hexCode.substring(4, 6), 16) / 255;

    const cMax = Math.max(r, g, b);
    const cMin = Math.min(r, g, b);
    const delta = cMax - cMin;

    let hue: number;
    let saturation: number;
    let lightness = (cMax + cMin) / 2;

    if (delta === 0) {
        hue = 0;
        saturation = 0;
    } else {
        saturation = delta / (1 - Math.abs(2 * lightness - 1));

        if (cMax === r) hue = ((g - b) / delta) % 6;
        else if (cMax === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;

        hue *= 60;
        if (hue < 0) hue += 360;
    }

    saturation *= 100;
    lightness *= 100;

    return { hue, saturation, lightness };
}

function relativeLuminance(hexCode: string) {
    const normalize = (x: number) => x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;

    const r = normalize(parseInt(hexCode.substring(0, 2), 16) / 255);
    const g = normalize(parseInt(hexCode.substring(2, 4), 16) / 255);
    const b = normalize(parseInt(hexCode.substring(4, 6), 16) / 255);

    return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

function createOrUpdateThemeColorVars(color: string) {
    const { hue, saturation, lightness } = hexToHSL(color);
    enableStyle(VARS_STYLE_ID, `:root {
        --theme-h: ${hue};
        --theme-s: ${saturation}%;
        --theme-l: ${lightness}%;
    }`);
}

async function getDiscordStyles(): Promise<string> {
    const styleLinkNodes = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
    const cssTexts = await Promise.all(Array.from(styleLinkNodes, async node => {
        if (!node.href) return null;
        return fetch(node.href).then(res => res.text());
    }));

    return cssTexts.filter(Boolean).join("\n");
}

const VISUAL_REFRESH_COLORS_VARIABLES_REGEX = /(--neutral-\d{1,3}?-hsl):.+?([\d.]+?)%;/g;

function generateNewColorVars(colorsLightness: Record<string, number>, baseLightness: number) {
    return Object.entries(colorsLightness).map(([colorVariableName, lightness]) => {
        const lightnessOffset = lightness - baseLightness;
        const plusOrMinus = lightnessOffset >= 0 ? "+" : "-";
        return `${colorVariableName}: var(--theme-h) var(--theme-s) calc(var(--theme-l) ${plusOrMinus} ${Math.abs(lightnessOffset).toFixed(2)}%);`;
    }).join("\n");
}

function createColorsOverrides(styles: string) {
    const visualRefreshColorsLightness: Record<string, number> = {};

    for (const [, colorVariableName, lightness] of styles.matchAll(VISUAL_REFRESH_COLORS_VARIABLES_REGEX)) {
        visualRefreshColorsLightness[colorVariableName] = parseFloat(lightness);
    }

    const lightThemeBaseLightness = visualRefreshColorsLightness["--neutral-2-hsl"];
    const darkThemeBaseLightness = visualRefreshColorsLightness["--neutral-69-hsl"];

    enableStyle(OVERRIDES_STYLE_ID, [
        `.theme-light {\n ${generateNewColorVars(visualRefreshColorsLightness, lightThemeBaseLightness)} \n}`,
        `.theme-dark {\n ${generateNewColorVars(visualRefreshColorsLightness, darkThemeBaseLightness)} \n}`
    ].join("\n\n"));
}

async function startClientTheme(color: string) {
    createOrUpdateThemeColorVars(color);
    createColorsOverrides(await getDiscordStyles());
}

function disableClientTheme() {
    disableStyle(VARS_STYLE_ID);
    disableStyle(OVERRIDES_STYLE_ID);
}

function onPickColor(color: number) {
    const hexColor = color.toString(16).padStart(6, "0");
    settings.store.color = hexColor;
    createOrUpdateThemeColorVars(hexColor);
}

const setDiscordTheme = (theme: string) => saveClientTheme({ theme });

function ThemeSettingsComponent() {
    const { color } = settings.use(["color"]);
    const currentTheme: string = useStateFromStores([Stores.ThemeStore], () => Stores.ThemeStore.theme);
    const isLightTheme = currentTheme === "light";
    const oppositeTheme = isLightTheme ? "dark" : "light";

    const nitroThemeEnabled = useStateFromStores([NitroThemeStore], () => NitroThemeStore.gradientPreset != null);

    const selectedLuminance = relativeLuminance(color as string);

    let contrastWarning = false;
    let fixableContrast = true;

    if ((isLightTheme && selectedLuminance < 0.26) || (!isLightTheme && selectedLuminance > 0.12)) contrastWarning = true;
    if (selectedLuminance < 0.26 && selectedLuminance > 0.12) fixableContrast = false;
    if (isLightTheme && selectedLuminance > 0.65) {
        contrastWarning = true;
        fixableContrast = false;
    }

    return (
        <div className="majic-client-theme-settings">
            <div className="majic-client-theme-container">
                <div className="majic-client-theme-labels">
                    <SubHeading>{s("themeColor")}</SubHeading>
                    <Text muted>{s("themeColorDescription")}</Text>
                </div>
                <ColorPicker
                    color={parseInt(color as string, 16)}
                    onChange={onPickColor}
                    showEyeDropper={false}
                    suggestedColors={colorPresets}
                />
            </div>
            {(contrastWarning || nitroThemeEnabled) && (
                <div className="majic-notice-card majic-client-theme-warning">
                    <SubHeading>{s("warning")}</SubHeading>
                    {contrastWarning && <Text>{s("contrast")}</Text>}
                    {nitroThemeEnabled && <Text>{s("nitro")}</Text>}
                    <div className="majic-client-theme-buttons-container">
                        {contrastWarning && fixableContrast && (
                            <Button variant="danger" onClick={() => setDiscordTheme(oppositeTheme)}>
                                {s("switchMode", { mode: s(oppositeTheme) })}
                            </Button>
                        )}
                        {nitroThemeEnabled && (
                            <Button variant="danger" onClick={() => setDiscordTheme(currentTheme)}>
                                {s("disableNitro")}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function ResetThemeColorComponent() {
    return <Button onClick={() => onPickColor(0x313338)}>{s("reset")}</Button>;
}

const settings = definePluginSettings({
    color: {
        type: OptionType.COMPONENT,
        description: "",
        default: "313338",
        component: ThemeSettingsComponent
    },
    resetColor: {
        type: OptionType.COMPONENT,
        description: "",
        component: ResetThemeColorComponent
    }
});

export default definePlugin({
    name: "ClientTheme",
    description: "Recreation of the old client theme experiment: adds a color to your Discord client theme",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Recréation de l'ancienne expérience de thème client : ajoute une couleur au thème de ton client Discord"
        }
    },
    settings,
    startAt: "DOMContentLoaded",

    css: [
        ".majic-client-theme-settings { display: flex; flex-direction: column; }",
        ".majic-client-theme-container { display: flex; flex-direction: row; justify-content: space-between; }",
        ".majic-client-theme-labels { display: flex; flex-direction: column; justify-content: flex-start; }",
        ".majic-client-theme-container [class*=\"swatch\"] { border: thin solid var(--input-border-default) !important; }",
        ".majic-client-theme-warning { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }",
        ".majic-client-theme-buttons-container { margin-top: 8px; display: flex; gap: 4px; }"
    ].join(" "),

    start() {
        void startClientTheme(settings.store.color as string);
    },

    stop: disableClientTheme
});
