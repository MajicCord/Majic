/*
 * Majic — CallTimer plugin
 */

import { definePluginSettings } from "@api/settings";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { formatDuration, useTimer } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { React } from "@webpack/common";

const settings = definePluginSettings({
    format: {
        type: OptionType.SELECT,
        description: "Timer format",
        options: [
            { label: "30d 23:00:42", value: "stopwatch", default: true },
            { label: "30d 23h 00m 42s", value: "human" }
        ]
    }
});

function Timer({ channelId }: { channelId: string }) {
    const time = useTimer({ deps: [channelId] });

    return (
        <p style={{ margin: 0, fontFamily: "var(--font-code)" }}>
            {formatDuration(time, settings.store.format === "human")}
        </p>
    );
}

export default definePlugin({
    name: "CallTimer",
    description: "Adds a timer to voice calls",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un chronomètre aux appels vocaux",
            options: {
                format: "Format du chronomètre"
            }
        }
    },
    settings,

    css: "[class*=\"panels\"] [class*=\"inner\"], [class*=\"rtcConnectionStatus\"] { height: fit-content !important; }",

    patches: [
        {
            find: '"RTCConnectionMenu"',
            replacement: {
                match: /("RTCConnectionMenu".{0,300}?lineClamp:1,children:)(\i)(?=,|}\))/,
                replace: "$1[$2,$self.renderTimer({ channelId: this?.props?.channel?.id })]"
            }
        }
    ],

    renderTimer: withErrorBoundary("CallTimer", Timer)
});
