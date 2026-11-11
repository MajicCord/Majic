/*
 * Majic — NoServerEmojis plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";

const s = createStrings({
    en: {
        onlyUnicode: "Only unicode emojis",
        currentServer: "Unicode emojis and emojis from the current server",
        all: "Unicode emojis and all server emojis (Discord default)"
    },
    fr: {
        onlyUnicode: "Seulement les emojis unicode",
        currentServer: "Emojis unicode et emojis du serveur actuel",
        all: "Emojis unicode et tous les emojis de serveur (par défaut de Discord)"
    }
});

const settings = definePluginSettings({
    shownEmojis: {
        type: OptionType.SELECT,
        description: "The types of emojis to show in the autocomplete menu",
        options: [
            { get label() { return s("onlyUnicode"); }, value: "onlyUnicode", default: true },
            { get label() { return s("currentServer"); }, value: "currentServer" },
            { get label() { return s("all"); }, value: "all" }
        ]
    }
});

export default definePlugin({
    name: "NoServerEmojis",
    description: "Hides server emojis from the autocomplete menu",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque les emojis de serveur dans le menu d'autocomplétion",
            options: {
                shownEmojis: "Types d'emojis affichés dans le menu d'autocomplétion"
            }
        }
    },
    settings,

    patches: [
        {
            find: "}searchWithoutFetchingLatest(",
            replacement: {
                match: /\.nameMatchesChain\(\i\)\.reduce\(\((\i),(\i)\)=>\{(?<=channel:(\i).+?)/,
                replace: "$&if($self.shouldSkip($3,$2))return $1;"
            }
        }
    ],

    shouldSkip(channel: { getGuildId(): string | null } | undefined | null, emoji: { type: number; guildId?: string }) {
        if (emoji.type !== 1) return false;
        if (settings.store.shownEmojis === "onlyUnicode") return true;
        if (settings.store.shownEmojis === "currentServer") return emoji.guildId !== (channel != null ? channel.getGuildId() : null);
        return false;
    }
});
