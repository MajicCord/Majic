/*
 * Majic — NoTrack plugin
 * Ported from Vencord, GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/settings";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { Flux, FluxDispatcher } from "@webpack/common";

const logger = new Logger("NoTrack", "#8caaee");

const settings = definePluginSettings({
    disableAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Block Discord's tracking analytics",
        default: true,
        restartNeeded: true
    },
    allowBadgeTracking: {
        type: OptionType.BOOLEAN,
        description: "Still send the events needed for badges to track your progress (eg: hours played, hours streamed)",
        default: true,
        restartNeeded: true,
        disabled() {
            return !this.store.disableAnalytics;
        }
    }
});

const gameEvents = new Set(["launch_game", "running_game_heartbeat"]);
const streamEvents = new Set(["media_session_joined", "video_stream_started", "video_stream_ended"]);

function disableSentry() {
    Object.defineProperty(Function.prototype, "d", {
        configurable: true,
        set(this: any, esmDeclare: unknown) {
            Object.defineProperty(this, "d", { value: esmDeclare, configurable: true, enumerable: true, writable: true });

            const { stack } = new Error();
            if (this.c != null || !stack?.includes("http") || !String(this).includes("exports:{}")) return;

            const assetPath = stack.match(/http.+?(?=:\d+?:\d+?$)/m)?.[0];
            if (!assetPath) return;

            const request = new XMLHttpRequest();
            request.open("GET", assetPath, false);
            request.send();
            if (!request.responseText.includes(".DiscordSentry=")) return;

            logger.info("Disabling Sentry by erroring its webpack instance");
            Reflect.deleteProperty(Function.prototype, "d");
            Reflect.deleteProperty(window, "DiscordSentry");
            throw new Error("Sentry successfully disabled");
        }
    });

    Object.defineProperty(window, "DiscordSentry", {
        configurable: true,
        set() {
            logger.error("Failed to disable Sentry, falling back to deleting window.DiscordSentry");
            Reflect.deleteProperty(Function.prototype, "d");
            Reflect.deleteProperty(window, "DiscordSentry");
        }
    });
}

export default definePlugin({
    name: "NoTrack",
    description: "Disable Discord's tracking (analytics/'science'), metrics, Sentry crash reporting and client mod detection",
    authors: [{ name: "Cyn" }, { name: "Ven" }, { name: "Nuckyz" }, { name: "Arrow" }, { name: "Cramber" }],
    required: true,
    startAt: "Init",

    settings,

    patches: [
        {
            find: "AnalyticsActionHandlers.handle",
            predicate: () => settings.store.disableAnalytics && !settings.store.allowBadgeTracking,
            replacement: {
                match: /\(0,\i\.analyticsTrackingStoreMaker\)/,
                replace: "$self.analyticsTrackingStoreMaker"
            }
        },
        {
            find: '"AnalyticsTrackingStore"',
            predicate: () => settings.store.disableAnalytics && settings.store.allowBadgeTracking,
            group: true,
            replacement: [
                {
                    match: /handleTrack=function\((\i)\){/,
                    replace: "$&if(!$self.isBadgeEvent($1.event,$1.properties))return false;"
                },
                {
                    match: /function \i\((\i),\i\){(?=let \i=Date\.now\(\))/,
                    replace: "$&$1=$1.filter(e=>$self.isBadgeEvent(e.type,e.properties));if(!$1.length)return Promise.resolve();"
                }
            ]
        },
        {
            find: ".METRICS_V2",
            replacement: [
                {
                    match: /this\._intervalId=/,
                    replace: "this._intervalId=void 0&&"
                },
                {
                    match: /(?:increment|distribution)\(\i(?:,\i)?\){/g,
                    replace: "$&return;"
                }
            ]
        },
        {
            find: ".BetterDiscord||null!=",
            replacement: {
                match: /(?=let \i=window;)/,
                replace: "return false;"
            }
        }
    ],

    flux: {
        TRACK(event: { resolve?(): void }) {
            event?.resolve?.();
        }
    },

    start() {
        disableSentry();
    },

    isBadgeEvent(type: string, properties?: Record<string, unknown>) {
        if (gameEvents.has(type)) return true;
        return streamEvents.has(type) && properties?.context === "stream" && properties.participant_type !== "receiver";
    },

    analyticsTrackingStoreMaker() {
        const error = {
            ok: false,
            status: 500,
            body: { message: "Analytics tracking is disabled by NoTrack", code: 0 },
            headers: {},
            text: JSON.stringify({ message: "Analytics tracking is disabled by NoTrack", code: 0 })
        };

        class AnalyticsTrackingStoreStub extends Flux.Store {
            static displayName = "AnalyticsTrackingStore";

            requestDrain() { }

            async submitEventsImmediately() {
                throw error;
            }
        }

        return new AnalyticsTrackingStoreStub(FluxDispatcher);
    }
});
