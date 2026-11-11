/*
 * Majic — LoadingQuotes plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";

import { presetQuotes } from "./quotes";

const s = createStrings({
    en: { noQuotes: "Did you really disable all loading quotes? What a buffoon you are..." },
    fr: { noQuotes: "Tu as vraiment désactivé toutes les citations de chargement ? Quel clown..." }
});

const logger = new Logger("LoadingQuotes", "#f1fa8c");

const settings = definePluginSettings({
    replaceEvents: {
        type: OptionType.BOOLEAN,
        description: "Also apply during events with special themed quotes (e.g. Halloween)",
        default: true
    },
    enablePluginPresetQuotes: {
        type: OptionType.BOOLEAN,
        description: "Enable the quotes provided by this plugin",
        default: true
    },
    enableDiscordPresetQuotes: {
        type: OptionType.BOOLEAN,
        description: "Enable Discord's own quotes (including event quotes, during events)",
        default: false
    },
    additionalQuotes: {
        type: OptionType.STRING,
        description: "Additional custom quotes, separated by the delimiter below",
        default: "",
        multiline: true
    },
    additionalQuotesDelimiter: {
        type: OptionType.STRING,
        description: "Delimiter for additional quotes",
        default: "|"
    }
});

export default definePlugin({
    name: "LoadingQuotes",
    description: "Replaces Discord's loading quotes",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Remplace les citations de l'écran de chargement de Discord",
            options: {
                replaceEvents: "S'appliquer aussi pendant les événements à citations spéciales (Halloween par exemple)",
                enablePluginPresetQuotes: "Activer les citations fournies par ce plugin",
                enableDiscordPresetQuotes: "Activer les citations de Discord (y compris celles des événements)",
                additionalQuotes: "Citations personnalisées en plus, séparées par le délimiteur ci-dessous",
                additionalQuotesDelimiter: "Délimiteur des citations personnalisées"
            }
        }
    },
    settings,

    patches: [
        {
            find: "#{intl::LOADING_DID_YOU_KNOW}",
            replacement: [
                {
                    match: /_loadingText.+?(?=(\i)\[.{0,10}\.random)/,
                    replace: "$&$self.mutateQuotes($1),"
                },
                {
                    match: /_eventLoadingText.+?(?=(\i)\[.{0,10}\.random)/,
                    replace: "$&$self.mutateQuotes($1),",
                    predicate: () => settings.store.replaceEvents
                }
            ]
        }
    ],

    mutateQuotes(quotes: string[]) {
        try {
            const { enableDiscordPresetQuotes, additionalQuotes, additionalQuotesDelimiter, enablePluginPresetQuotes } = settings.store;

            if (!enableDiscordPresetQuotes) quotes.length = 0;
            if (enablePluginPresetQuotes) quotes.push(...presetQuotes);

            quotes.push(...additionalQuotes.split(additionalQuotesDelimiter).filter(Boolean));

            if (!quotes.length) quotes.push(s("noQuotes"));
        } catch (err) {
            logger.error("Failed to mutate quotes", err);
        }
    }
});
