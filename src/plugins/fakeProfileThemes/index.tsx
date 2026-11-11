/*
 * Majic — FakeProfileThemes plugin
 */

import { definePluginSettings } from "@api/settings";
import { Button, SubHeading, Text } from "@components/ui";
import { createStrings } from "@i18n";
import { copyWithToast } from "@utils/discord";
import { useAwaiter } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { ColorPicker, Endpoints, FluxDispatcher, React, RestAPI, Stores, useState } from "@webpack/common";

const s = createStrings({
    en: {
        nitroColors: "Nitro colors",
        fakeColors: "Fake colors",
        usage: "Usage",
        usageText: "After enabling this plugin, you will see custom colors in the profiles of other people using compatible plugins.",
        howTo: "To set your own profile theme colors:",
        step1: "use the color pickers below to choose your colors",
        step2: "click the \"Copy 3y3\" button",
        step3: "paste the invisible text anywhere in your bio",
        pickers: "Color pickers",
        primary: "Primary",
        accent: "Accent",
        copy: "Copy 3y3",
        preview: "Preview"
    },
    fr: {
        nitroColors: "Couleurs Nitro",
        fakeColors: "Fausses couleurs",
        usage: "Utilisation",
        usageText: "Une fois ce plugin activé, tu verras les couleurs personnalisées dans les profils des personnes qui utilisent des plugins compatibles.",
        howTo: "Pour définir les couleurs de ton propre profil :",
        step1: "choisis tes couleurs avec les sélecteurs ci-dessous",
        step2: "clique sur le bouton « Copier 3y3 »",
        step3: "colle le texte invisible n'importe où dans ta bio",
        pickers: "Sélecteurs de couleur",
        primary: "Principale",
        accent: "Accent",
        copy: "Copier 3y3",
        preview: "Aperçu"
    }
});

interface CachedDecodedThemeColors {
    decodedBio: string;
    themeColors: number[] | null;
}

const decodedThemeColorsCache = new Map<string, CachedDecodedThemeColors>();

function encode(primary: number, accent: number): string {
    const message = `[#${primary.toString(16).padStart(6, "0")},#${accent.toString(16).padStart(6, "0")}]`;
    const encoded = Array.from(message)
        .map(x => x.codePointAt(0)!)
        .filter(x => x >= 0x20 && x <= 0x7f)
        .map(x => String.fromCodePoint(x + 0xe0000))
        .join("");

    return " " + encoded;
}

const DecodeRegex = /\[#([a-fA-F0-9]{1,6}),#([a-fA-F0-9]{1,6})\]/;
function decode(bio: string): number[] | null {
    if (bio == null) return null;

    let ascii = "";
    for (const ch of bio) {
        const cp = ch.codePointAt(0)!;
        if (cp >= 0xe0000 && cp <= 0xe007f) ascii += String.fromCodePoint(cp - 0xe0000);
    }

    const match = ascii.match(DecodeRegex);
    if (!match) return null;

    return [parseInt(match[1], 16), parseInt(match[2], 16)];
}

async function fetchUserProfile(id: string) {
    const cached = Stores.UserProfileStore.getUserProfile(id);
    if (cached) return cached;

    FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_START", userId: id });

    const { body } = await RestAPI.get({
        url: Endpoints.USER_PROFILE(id),
        query: { with_mutual_guilds: false, with_mutual_friends_count: false },
        oldFormErrors: true
    });

    FluxDispatcher.dispatch({ type: "USER_UPDATE", user: body.user });
    await FluxDispatcher.dispatch({ type: "USER_PROFILE_FETCH_SUCCESS", userProfile: body });

    return Stores.UserProfileStore.getUserProfile(id);
}

const settings = definePluginSettings({
    nitroFirst: {
        type: OptionType.SELECT,
        description: "Default color source if both are present",
        options: [
            { get label() { return s("nitroColors"); }, value: true, default: true },
            { get label() { return s("fakeColors"); }, value: false }
        ]
    }
});

const ProfileModal = findComponentByCodeLazy("isTryItOut:", "pendingThemeColors:", "pendingAvatarDecoration:", "EDIT_PROFILE_BANNER");

function SettingsAboutComponentWrapper() {
    const [, , loading] = useAwaiter(() => fetchUserProfile(Stores.UserStore.getCurrentUser().id), { fallbackValue: null });
    return loading ? null : <SettingsAboutComponent />;
}

function SettingsAboutComponent() {
    const existingColors = decode(Stores.UserProfileStore.getUserProfile(Stores.UserStore.getCurrentUser().id)?.bio ?? "") ?? [0, 0];
    const [color1, setColor1] = useState(existingColors[0]);
    const [color2, setColor2] = useState(existingColors[1]);

    return (
        <section className="majic-fpt-about">
            <SubHeading>{s("usage")}</SubHeading>
            <Text>{s("usageText")}</Text>
            <div className="majic-fpt-steps">
                <strong>{s("howTo")}</strong>
                <ul>
                    <li>&mdash; {s("step1")}</li>
                    <li>&mdash; {s("step2")}</li>
                    <li>&mdash; {s("step3")}</li>
                </ul>
            </div>
            <hr className="majic-fpt-divider" />
            <SubHeading>{s("pickers")}</SubHeading>
            <div style={{ display: "flex", gap: "1em" }}>
                <ColorPicker
                    color={color1}
                    label={<span className="majic-fpt-picker-label">{s("primary")}</span>}
                    onChange={(color: number) => setColor1(color)}
                />
                <ColorPicker
                    color={color2}
                    label={<span className="majic-fpt-picker-label">{s("accent")}</span>}
                    onChange={(color: number) => setColor2(color)}
                />
                <div style={{ marginBottom: "auto" }}>
                    <Button variant="secondary" onClick={() => void copyWithToast(encode(color1, color2))}>
                        {s("copy")}
                    </Button>
                </div>
            </div>
            <hr className="majic-fpt-divider" />
            <SubHeading>{s("preview")}</SubHeading>
            <div className="majic-fpt-preview">
                <ProfileModal
                    user={Stores.UserStore.getCurrentUser()}
                    pendingThemeColors={[color1, color2]}
                    onAvatarChange={() => { }}
                    onBannerChange={() => { }}
                    canUsePremiumCustomization={true}
                    hideExampleButton={true}
                    hideFakeActivity={true}
                    isTryItOut={true}
                />
            </div>
        </section>
    );
}

export default definePlugin({
    name: "FakeProfileThemes",
    description: "Allows profile theming by hiding the colors in your bio with invisible 3y3 encoding",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de personnaliser les couleurs du profil en les cachant dans ta bio avec un encodage 3y3 invisible",
            options: {
                nitroFirst: "Source de couleurs par défaut si les deux sont présentes"
            }
        }
    },
    settings,
    settingsAboutComponent: SettingsAboutComponentWrapper,

    css: [
        ".majic-fpt-preview * { pointer-events: none; }",
        ".majic-fpt-about { display: flex; flex-direction: column; gap: 8px; color: var(--text-default); }",
        ".majic-fpt-steps { font-size: 14px; }",
        ".majic-fpt-steps ul { margin: 4px 0 0; padding: 0; list-style: none; }",
        ".majic-fpt-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 8px 0; width: 100%; }",
        ".majic-fpt-picker-label { display: block; margin-top: 4px; font-size: 12px; color: var(--text-muted); }"
    ].join(" "),

    patches: [
        {
            find: "}getPreviewThemeColors(",
            replacement: [
                {
                    match: /(}getPreviewThemeColors\(.+?)this\.themeColors/,
                    replace: "$1$self.colorDecodeHook(this)"
                },
                {
                    match: /canEditThemes\(\){/,
                    replace: "$&return true;"
                }
            ]
        }
    ],

    colorDecodeHook(profile: any) {
        if (settings.store.nitroFirst && profile?.themeColors != null) return profile.themeColors;

        if (profile?.bio != null) {
            const cached = decodedThemeColorsCache.get(profile.userId);
            if (cached != null && cached.decodedBio === profile.bio) return cached.themeColors ?? profile?.themeColors;

            const decodedThemeColors = decode(profile.bio);
            decodedThemeColorsCache.set(profile.userId, { decodedBio: profile.bio, themeColors: decodedThemeColors });

            if (decodedThemeColors != null) return decodedThemeColors;
        }

        return profile?.themeColors;
    }
});
