/*
 * Majic — ShowTimeoutDuration plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { canonicalizeMatch } from "@utils/patches";
import { definePlugin, OptionType } from "@utils/types";
import { findComponentLazy } from "@webpack";
import { React, Stores, Tooltip } from "@webpack/common";
import type { ReactNode } from "react";

const s = createStrings({
    en: { tooltip: "In the tooltip", inline: "Next to the timeout icon", remaining: "timeout remaining" },
    fr: { tooltip: "Dans l'infobulle", inline: "À côté de l'icône d'exclusion", remaining: "d'exclusion restante" }
});

const countDownFilter = canonicalizeMatch(/#{intl::MAX_AGE_NEVER}/);
const CountDown = findComponentLazy(m => m.prototype?.render && countDownFilter.test(m.prototype.render.toString()));

const DisplayStyle = {
    Tooltip: "tooltip",
    Inline: "ssalggnikool"
} as const;

const settings = definePluginSettings({
    displayStyle: {
        type: OptionType.SELECT,
        description: "How to display the timeout duration",
        options: [
            { get label() { return s("tooltip"); }, value: DisplayStyle.Tooltip },
            { get label() { return s("inline"); }, value: DisplayStyle.Inline, default: true }
        ]
    }
});

function TooltipContainer({ text, children }: { text: ReactNode; children: ReactNode }) {
    return (
        <Tooltip text={text}>
            {(props: Record<string, unknown>) => <div {...props}>{children}</div>}
        </Tooltip>
    );
}

function renderTimeout(message: any, inline: boolean) {
    const guildId = Stores.ChannelStore.getChannel(message.channel_id)?.guild_id;
    if (!guildId) return null;

    const member = Stores.GuildMemberStore.getMember(guildId, message.author.id);
    if (!member?.communicationDisabledUntil) return null;

    const countdown = () => (
        <CountDown
            deadline={new Date(member.communicationDisabledUntil)}
            showUnits
            stopAtOneSec
        />
    );

    return inline
        ? countdown()
        : getIntlMessage("GUILD_ENABLE_COMMUNICATION_TIME_REMAINING", {
            username: message.author.username,
            countdown
        });
}

function TooltipWrapper({ message, children, text }: { message: any; children: ReactNode; text: ReactNode }) {
    if (settings.store.displayStyle === DisplayStyle.Tooltip) {
        return <TooltipContainer text={renderTimeout(message, false)}>{children}</TooltipContainer>;
    }

    return (
        <div className="majic-std-wrapper">
            <TooltipContainer text={text}>{children}</TooltipContainer>
            <p className="majic-std-text">
                {renderTimeout(message, true)} {s("remaining")}
            </p>
        </div>
    );
}

export default definePlugin({
    name: "ShowTimeoutDuration",
    description: "Shows how much longer a user's timeout will last, in the timeout icon tooltip or next to it",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche le temps restant d'une exclusion temporaire, dans l'infobulle de l'icône ou à côté",
            options: {
                displayStyle: "Comment afficher la durée de l'exclusion"
            }
        }
    },
    settings,

    css: ".majic-std-wrapper { display: flex; align-items: center; } .majic-std-wrapper [class*=\"communicationDisabled\"] { margin-right: 0; } .majic-std-text { margin: 0; font-size: 16px; color: var(--status-danger, var(--text-default)); }",

    patches: [
        {
            find: "#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}",
            replacement: {
                match: /\i\.\i,{(text:.{0,30}#{intl::GUILD_COMMUNICATION_DISABLED_ICON_TOOLTIP_BODY}\))/,
                replace: "$self.TooltipWrapper,{message:arguments[0].message,$1"
            }
        }
    ],

    TooltipWrapper: withErrorBoundary("ShowTimeoutDuration", TooltipWrapper)
});
