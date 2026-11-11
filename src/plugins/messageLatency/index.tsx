/*
 * Majic — MessageLatency plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { React, SnowflakeUtils, Stores, Tooltip } from "@webpack/common";

type FillValue = "status-danger" | "status-warning" | "status-positive" | "text-muted";
type Fill = [FillValue, FillValue, FillValue];

interface Diff {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    milliseconds: number;
}

type DiffKey = keyof Diff;

const s = createStrings({
    en: {
        day: "day", days: "days",
        hour: "hour", hours: "hours",
        minute: "minute", minutes: "minutes",
        second: "second", seconds: "seconds",
        millisecond: "millisecond", milliseconds: "milliseconds",
        and: "and",
        zero: "0 seconds",
        oldClient: "User is suspected to be on an old Discord Android client",
        oldClientSuffix: " User is suspected to be on an old Discord Android client.",
        ahead: "This user's clock is {delta} ahead.",
        delay: "This message was sent with a delay of {delta}.",
        oldClientLabel: "Old Discord Android client"
    },
    fr: {
        day: "jour", days: "jours",
        hour: "heure", hours: "heures",
        minute: "minute", minutes: "minutes",
        second: "seconde", seconds: "secondes",
        millisecond: "milliseconde", milliseconds: "millisecondes",
        and: "et",
        zero: "0 seconde",
        oldClient: "Cet utilisateur semble utiliser une ancienne version de Discord Android",
        oldClientSuffix: " Cet utilisateur semble utiliser une ancienne version de Discord Android.",
        ahead: "L'horloge de cet utilisateur est en avance de {delta}.",
        delay: "Ce message a été envoyé avec un retard de {delta}.",
        oldClientLabel: "Ancien client Discord Android"
    }
});

const UNIT_KEYS: Record<DiffKey, [singular: Parameters<typeof s>[0], plural: Parameters<typeof s>[0]]> = {
    days: ["day", "days"],
    hours: ["hour", "hours"],
    minutes: ["minute", "minutes"],
    seconds: ["second", "seconds"],
    milliseconds: ["millisecond", "milliseconds"]
};

const DISCORD_KT_DELAY = 1471228928;

const settings = definePluginSettings({
    latency: {
        type: OptionType.NUMBER,
        description: "Threshold in seconds for the latency indicator",
        default: 2
    },
    detectDiscordKotlin: {
        type: OptionType.BOOLEAN,
        description: "Detect old Discord Android clients",
        default: true
    },
    showMillis: {
        type: OptionType.BOOLEAN,
        description: "Show milliseconds",
        default: false
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Don't add the indicator to your own messages",
        default: false
    }
});

function stringDelta(delta: number, showMillis: boolean) {
    const diff: Diff = {
        days: Math.floor(delta / (60 * 60 * 24 * 1000)),
        hours: Math.floor((delta / (60 * 60 * 1000)) % 24),
        minutes: Math.floor((delta / (60 * 1000)) % 60),
        seconds: Math.floor(delta / 1000 % 60),
        milliseconds: Math.floor(delta % 1000)
    };

    const str = (k: DiffKey) => diff[k] > 0 ? `${diff[k]} ${s(UNIT_KEYS[k][diff[k] > 1 ? 1 : 0])}` : null;
    const keys = Object.keys(diff) as DiffKey[];

    const ts = keys.reduce((prev, k) => {
        const part = str(k);
        if (part == null) return prev;

        const isLast = showMillis ? k === "milliseconds" : k === "seconds";
        const separator = prev !== "" ? (isLast ? ` ${s("and")} ` : " ") : "";
        return prev + separator + part;
    }, "");

    return ts || s("zero");
}

function latencyTooltipData(message: any) {
    const { latency, detectDiscordKotlin, showMillis, ignoreSelf } = settings.store;
    const { id, nonce } = message;

    if (nonce == null) return null;
    if (message.author.bot) return null;
    if (ignoreSelf && message.author.id === Stores.AuthenticationStore.getId()) return null;

    let isDiscordKotlin = false;
    let delta = SnowflakeUtils.extractTimestamp(id) - SnowflakeUtils.extractTimestamp(nonce);
    if (!showMillis) delta = Math.round(delta / 1000) * 1000;

    if (-delta >= DISCORD_KT_DELAY - 86400000) {
        isDiscordKotlin = detectDiscordKotlin;
        delta += DISCORD_KT_DELAY;
    }

    const abs = Math.abs(delta);
    const ahead = abs !== delta;
    const latencyMillis = latency * 1000;

    const deltaText = abs >= latencyMillis ? stringDelta(abs, showMillis) : null;

    const TROLL_LIMIT = 2 * 60 * 1000;

    const fill: Fill = isDiscordKotlin
        ? ["status-positive", "status-positive", "text-muted"]
        : delta >= TROLL_LIMIT || ahead
            ? ["text-muted", "text-muted", "text-muted"]
            : delta >= latencyMillis * 2
                ? ["status-danger", "text-muted", "text-muted"]
                : ["status-warning", "status-warning", "text-muted"];

    return abs >= latencyMillis || isDiscordKotlin ? { delta: deltaText, ahead, fill, isDiscordKotlin } : null;
}

function LatencyIcon({ delta, fill, props }: { delta: string | null; fill: Fill; props: Record<string, unknown> }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            width="12"
            height="12"
            role="img"
            fill="none"
            style={{ marginRight: "8px", verticalAlign: -1 }}
            aria-label={delta ?? s("oldClientLabel")}
            aria-hidden="false"
            {...props}
        >
            <path fill={`var(--${fill[0]})`} d="M4.8001 12C4.8001 11.5576 4.51344 11.2 4.16023 11.2H2.23997C1.88676 11.2 1.6001 11.5576 1.6001 12V13.6C1.6001 14.0424 1.88676 14.4 2.23997 14.4H4.15959C4.5128 14.4 4.79946 14.0424 4.79946 13.6L4.8001 12Z" />
            <path fill={`var(--${fill[1]})`} d="M9.6001 7.12724C9.6001 6.72504 9.31337 6.39998 8.9601 6.39998H7.0401C6.68684 6.39998 6.40011 6.72504 6.40011 7.12724V13.6727C6.40011 14.0749 6.68684 14.4 7.0401 14.4H8.9601C9.31337 14.4 9.6001 14.0749 9.6001 13.6727V7.12724Z" />
            <path fill={`var(--${fill[2]})`} d="M14.4001 2.31109C14.4001 1.91784 14.1134 1.59998 13.7601 1.59998H11.8401C11.4868 1.59998 11.2001 1.91784 11.2001 2.31109V13.6888C11.2001 14.0821 11.4868 14.4 11.8401 14.4H13.7601C14.1134 14.4 14.4001 14.0821 14.4001 13.6888V2.31109Z" />
        </svg>
    );
}

function LatencyTooltip({ message }: { message: any }) {
    const data = latencyTooltipData(message);
    if (data == null) return null;

    const text = !data.delta
        ? s("oldClient")
        : (data.ahead ? s("ahead", { delta: data.delta }) : s("delay", { delta: data.delta })) + (data.isDiscordKotlin ? s("oldClientSuffix") : "");

    return (
        <Tooltip text={text} position="top">
            {(props: Record<string, unknown>) => <LatencyIcon delta={data.delta} fill={data.fill} props={props} />}
        </Tooltip>
    );
}

const WrappedTooltip = withErrorBoundary("MessageLatency", LatencyTooltip);

export default definePlugin({
    name: "MessageLatency",
    description: "Shows an indicator on messages that took several seconds or more to send",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche un indicateur sur les messages qui ont mis plusieurs secondes ou plus à être envoyés",
            options: {
                latency: "Seuil en secondes pour l'indicateur de latence",
                detectDiscordKotlin: "Détecter les anciens clients Discord Android",
                showMillis: "Afficher les millisecondes",
                ignoreSelf: "Ne pas ajouter l'indicateur à tes propres messages"
            }
        }
    },
    settings,

    patches: [
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /(message:(\i),avatar:\i,username:\(0,\i.jsxs\)\(\i.Fragment,\{children:\[)(\i&&)/,
                replace: "$1$self.Tooltip()({ message: $2 }),$3"
            }
        }
    ],

    Tooltip() {
        return WrappedTooltip;
    }
});
