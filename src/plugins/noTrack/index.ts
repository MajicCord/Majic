/*
 * Majic — NoTrack plugin
 */

import { definePluginSettings } from "@api/settings";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { Flux, FluxDispatcher } from "@webpack/common";

const logger = new Logger("NoTrack", "#8caaee");

const BADGE_EVENTS = new Set(["launch_game", "running_game_heartbeat"]);
const STREAM_EVENTS = new Set(["media_session_joined", "video_stream_started", "video_stream_ended"]);

const settings = definePluginSettings({
    disableAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Block Discord's analytics",
        default: true,
        restartNeeded: true
    },
    allowBadgeTracking: {
        type: OptionType.BOOLEAN,
        description: "Still send the few events Discord needs to track badge and quest progress (time played, time streamed)",
        default: true,
        restartNeeded: true,
        disabled() {
            return !this.store.disableAnalytics;
        }
    }
});

function blockSentry() {
    Object.defineProperty(Function.prototype, "d", {
        configurable: true,
        set(this: any, declareExports: unknown) {
            Object.defineProperty(this, "d", { value: declareExports, configurable: true, enumerable: true, writable: true });

            const { stack } = new Error();
            if (this.c != null || !stack?.includes("http") || !String(this).includes("exports:{}")) return;

            const bundleUrl = stack.match(/http.+?(?=:\d+?:\d+?$)/m)?.[0];
            if (!bundleUrl) return;

            const request = new XMLHttpRequest();
            request.open("GET", bundleUrl, false);
            request.send();
            if (!request.responseText.includes(".DiscordSentry=")) return;

            logger.info("Blocking Sentry by stopping its webpack instance");
            Reflect.deleteProperty(Function.prototype, "d");
            Reflect.deleteProperty(window, "DiscordSentry");
            throw new Error("Sentry blocked by Majic");
        }
    });

    Object.defineProperty(window, "DiscordSentry", {
        configurable: true,
        set() {
            logger.error("Could not stop Sentry early, removing window.DiscordSentry instead");
            Reflect.deleteProperty(Function.prototype, "d");
            Reflect.deleteProperty(window, "DiscordSentry");
        }
    });
}

export default definePlugin({
    name: "NoTrack",
    description: "Blocks Discord's analytics, metrics, Sentry crash reporting and client mod detection",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Bloque la télémétrie de Discord, ses métriques, les rapports de crash Sentry et la détection des mods clients",
            options: {
                disableAnalytics: "Bloquer la télémétrie de Discord",
                allowBadgeTracking: "Continuer d'envoyer les quelques événements nécessaires à la progression des badges et des quêtes (temps de jeu, temps de stream)"
            }
        }
    },
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
        blockSentry();
    },

    isBadgeEvent(type: string, properties?: Record<string, unknown>) {
        if (BADGE_EVENTS.has(type)) return true;
        return STREAM_EVENTS.has(type) && properties?.context === "stream" && properties.participant_type !== "receiver";
    },

    analyticsTrackingStoreMaker() {
        const disabled = { message: "Analytics tracking is disabled by Majic", code: 0 };

        class AnalyticsTrackingStoreStub extends Flux.Store {
            static displayName = "AnalyticsTrackingStore";

            requestDrain() { }

            async submitEventsImmediately() {
                throw { ok: false, status: 500, body: disabled, headers: {}, text: JSON.stringify(disabled) };
            }
        }

        return new AnalyticsTrackingStoreStub(FluxDispatcher);
    }
});
