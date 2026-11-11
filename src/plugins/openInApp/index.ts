/*
 * Majic — OpenInApp plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType, type PluginNative } from "@utils/types";
import { showToast } from "@webpack/common";
import type { MouseEvent } from "react";

const s = createStrings({
    en: { opened: "Opened link in native app" },
    fr: { opened: "Lien ouvert dans l'application" }
});

interface URLReplacementRule {
    match: RegExp;
    replace: (...matches: string[]) => string;
    shortlinkMatch?: RegExp;
    accountViewReplace?: (userId: string) => string;
}

const UrlReplacementRules: Record<string, URLReplacementRule> = {
    spotify: {
        match: /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?(track|album|artist|playlist|user|episode|prerelease)\/(.+)(?:\?.+?)?$/,
        replace: (_, type, id) => `spotify://${type}/${id}`,
        shortlinkMatch: /^https:\/\/spotify\.link\/.+$/,
        accountViewReplace: userId => `spotify:user:${userId}`
    },
    steam: {
        match: /^https:\/\/(steamcommunity\.com|(?:help|store)\.steampowered\.com)\/.+$/,
        replace: match => `steam://openurl/${match}`,
        shortlinkMatch: /^https:\/\/s.team\/.+$/,
        accountViewReplace: userId => `steam://openurl/https://steamcommunity.com/profiles/${userId}`
    },
    epic: {
        match: /^https:\/\/store\.epicgames\.com\/(.+)$/,
        replace: (_, id) => `com.epicgames.launcher://store/${id}`
    },
    tidal: {
        match: /^https:\/\/(?:listen\.)?tidal\.com\/(?:browse\/)?(track|album|artist|playlist|user|video|mix)\/([a-f0-9-]+).*/,
        replace: (_, type, id) => `tidal://${type}/${id}`
    },
    itunes: {
        match: /^https:\/\/(?:geo\.)?music\.apple\.com\/([a-z]{2}\/)?(album|artist|playlist|song|curator)\/([^/?#]+)\/?([^/?#]+)?(?:\?.*)?(?:#.*)?$/,
        replace: (_, _lang, type, name, id) => id ? `itunes://music.apple.com/us/${type}/${name}/${id}` : `itunes://music.apple.com/us/${type}/${name}`
    }
};

const settings = definePluginSettings({
    spotify: { type: OptionType.BOOLEAN, description: "Open Spotify links in the Spotify app", default: true },
    steam: { type: OptionType.BOOLEAN, description: "Open Steam links in the Steam app", default: true },
    epic: { type: OptionType.BOOLEAN, description: "Open Epic Games links in the Epic Games Launcher", default: true },
    tidal: { type: OptionType.BOOLEAN, description: "Open Tidal links in the Tidal app", default: true },
    itunes: { type: OptionType.BOOLEAN, description: "Open Apple Music links in the iTunes app", default: true }
});

const Native = MajicNative.pluginHelpers.OpenInApp as PluginNative<typeof import("./native")>;

export default definePlugin({
    name: "OpenInApp",
    description: "Opens links in their own apps instead of your browser",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ouvre les liens dans leur application au lieu du navigateur",
            options: {
                spotify: "Ouvrir les liens Spotify dans l'application Spotify",
                steam: "Ouvrir les liens Steam dans l'application Steam",
                epic: "Ouvrir les liens Epic Games dans l'Epic Games Launcher",
                tidal: "Ouvrir les liens Tidal dans l'application Tidal",
                itunes: "Ouvrir les liens Apple Music dans iTunes"
            }
        }
    },
    settings,

    patches: [
        {
            find: "trackAnnouncementMessageLinkClicked({",
            replacement: {
                match: /function (\i\(\i,\i\)\{)(?=.{0,150}trusted:)/,
                replace: "async function $1 if(await $self.handleLink(...arguments)) return;"
            }
        },
        ...[".__invalid_connectedAccountOpenIconContainer", ".BLUESKY||"].map(find => ({
            find,
            replacement: {
                match: /(?<=onClick:(\i)=>\{)(?=.{0,100}\.CONNECTED_ACCOUNT_VIEWED)(?<==(\i)\.metadata.+?)/,
                replace: "if($self.handleAccountView($1,$2.type,$2.id)) return;"
            }
        }))
    ],

    async handleLink(data: { href: string }, event?: MouseEvent) {
        if (!data) return false;

        let url = data.href;
        if (!url) return false;

        for (const [key, rule] of Object.entries(UrlReplacementRules)) {
            if (!(settings.store as Record<string, unknown>)[key]) continue;

            if (rule.shortlinkMatch?.test(url)) {
                event?.preventDefault();
                url = await Native.resolveRedirect(url);
            }

            if (rule.match.test(url)) {
                showToast({ text: s("opened"), variant: "success" });
                void MajicNative.openExternal(url.replace(rule.match, rule.replace as (...args: string[]) => string));
                event?.preventDefault();
                return true;
            }
        }

        if (event?.defaultPrevented) {
            window.open(url, "_blank");
            return true;
        }

        return false;
    },

    handleAccountView(e: MouseEvent, platformType: string, userId: string) {
        const rule = UrlReplacementRules[platformType];
        if (rule?.accountViewReplace && (settings.store as Record<string, unknown>)[platformType]) {
            void MajicNative.openExternal(rule.accountViewReplace(userId));
            e.preventDefault();
            return true;
        }
    }
});
