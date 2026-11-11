/*
 * Majic — UserMessagesPronouns plugin
 */

import { definePluginSettings } from "@api/settings";
import { getUserSettingLazy } from "@api/userSettings";
import { createStrings } from "@i18n";
import { getCurrentChannel, getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { React, Stores, Tooltip, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { lowercase: "Lowercase", capitalized: "Capitalized" },
    fr: { lowercase: "Minuscules", capitalized: "Majuscule initiale" }
});

const PronounsFormat = {
    Lowercase: "LOWERCASE",
    Capitalized: "CAPITALIZED"
} as const;

const settings = definePluginSettings({
    pronounsFormat: {
        type: OptionType.SELECT,
        description: "The format for pronouns to appear in chat",
        options: [
            { get label() { return s("lowercase"); }, value: PronounsFormat.Lowercase, default: true },
            { get label() { return s("capitalized"); }, value: PronounsFormat.Capitalized }
        ]
    },
    showSelf: {
        type: OptionType.BOOLEAN,
        description: "Show pronouns for yourself",
        default: true
    }
});

const TimestampClasses = findCssClassesLazy("timestampInline", "timestamp");
const MessageDisplayCompact = getUserSettingLazy<boolean>("textAndImages", "messageDisplayCompact")!;

const AUTO_MODERATION_ACTION = 24;

function useDiscordPronouns(id: string, useGlobalProfile = false): string | undefined {
    const globalPronouns: string | undefined = useStateFromStores([Stores.UserProfileStore], () => Stores.UserProfileStore.getUserProfile(id)?.pronouns);
    const guildPronouns: string | undefined = useStateFromStores([Stores.UserProfileStore], () => Stores.UserProfileStore.getGuildMemberProfile(id, getCurrentChannel()?.getGuildId())?.pronouns);

    if (useGlobalProfile) return globalPronouns;
    return guildPronouns || globalPronouns;
}

function useFormattedPronouns(id: string, useGlobalProfile = false) {
    const pronouns = useDiscordPronouns(id, useGlobalProfile)?.trim().replace(/\n+/g, "");
    return settings.store.pronounsFormat === PronounsFormat.Lowercase ? pronouns?.toLowerCase() : pronouns;
}

function shouldShow(message: any): boolean {
    if (message.author.bot || message.author.system || message.type === AUTO_MODERATION_ACTION) return false;
    if (!settings.store.showSelf && message.author.id === Stores.UserStore.getCurrentUser().id) return false;
    return true;
}

function PronounsChatComponent({ message }: { message: any }) {
    const pronouns = useFormattedPronouns(message.author.id);
    if (!pronouns) return null;

    return (
        <Tooltip text={getIntlMessage("USER_PROFILE_PRONOUNS")}>
            {(tooltipProps: Record<string, unknown>) => (
                <span {...tooltipProps} className={classes(TimestampClasses.timestampInline, TimestampClasses.timestamp)}>
                    • {pronouns}
                </span>
            )}
        </Tooltip>
    );
}

function PronounsWrapper({ message }: { message: any }) {
    return shouldShow(message) ? <PronounsChatComponent message={message} /> : null;
}

function CompactPronounsWrapper({ message }: { message: any }) {
    const compact = MessageDisplayCompact.useSetting();
    if (!compact || !shouldShow(message)) return null;
    return <PronounsChatComponent message={message} />;
}

export default definePlugin({
    name: "UserMessagesPronouns",
    description: "Adds pronouns to user messages in chat",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute les pronoms aux messages des utilisateurs dans le chat",
            options: {
                pronounsFormat: "Format des pronoms dans le chat",
                showSelf: "Afficher tes propres pronoms"
            }
        }
    },
    settings,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(?<=return\s*\(0,\i\.jsxs?\)\(.+!\i&&)(\(0,\i.jsxs?\)\(.+?\{.+?\}\))/,
                replace: "[$1, $self.PronounsChatComponentWrapper(arguments[0])]"
            }
        },
        {
            find: '="SYSTEM_TAG"',
            replacement: {
                match: /className:\i\(\)\(\i\.className(?:,\i\.\i)?,\i\)\}\)(?:\))?,(?=\i)/g,
                replace: "$&$self.CompactPronounsChatComponentWrapper(arguments[0]),"
            }
        }
    ],

    PronounsChatComponentWrapper: withErrorBoundary("UserMessagesPronouns", PronounsWrapper),
    CompactPronounsChatComponentWrapper: withErrorBoundary("UserMessagesPronouns", CompactPronounsWrapper)
});
