/*
 * Majic — NoTrack plugin
 */

import { definePluginSettings } from "@api/settings";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";

const logger = new Logger("NoTrack", "#8caaee");

const BADGE_EVENTS = new Set(["launch_game", "running_game_heartbeat"]);
const STREAM_EVENTS = new Set(["media_session_joined", "video_stream_started", "video_stream_ended"]);

const settings = definePluginSettings({
    blockAnalytics: {
        type: OptionType.BOOLEAN,
        description: "Block Discord's analytics events",
        default: true
    },
    keepBadgeProgress: {
        type: OptionType.BOOLEAN,
        description: "Still send the few events Discord needs to track badge and quest progress (time played, time streamed)",
        default: true,
        disabled() {
            return !this.store.blockAnalytics;
        }
    }
});

function isBadgeEvent(event: string, properties?: Record<string, unknown>) {
    if (BADGE_EVENTS.has(event)) return true;
    return STREAM_EVENTS.has(event) && properties?.context === "stream" && properties.participant_type !== "receiver";
}

function trapSentry() {
    try {
        Object.defineProperty(window, "DiscordSentry", {
            configurable: false,
            get: () => undefined,
            set: () => logger.info("Blocked Sentry crash reporting")
        });
    } catch (err) {
        logger.error("Could not block Sentry", err);
    }
}

export default definePlugin({
    name: "NoTrack",
    description: "Blocks Discord's analytics, metrics, Sentry crash reporting and client mod detection",
    authors: [{ name: "SnailyStudios" }],
    required: true,
    startAt: "Init",

    settings,

    patches: [
        {
            find: "handleTrack=function(",
            replacement: {
                match: /handleTrack=function\((\i)\){/,
                replace: "$&if(!$self.shouldSend($1.event,$1.properties)){$1.resolve?.();return!1}"
            }
        },
        {
            find: ".METRICS_V2,body:{metrics:",
            replacement: {
                match: /_flush\(\){(?=if\(this\._metrics\.length>0\))/,
                replace: "$&this._metrics=[];return;"
            }
        },
        {
            find: ".BdApi",
            replacement: {
                match: /return null!=(\i)\.jQuery/,
                replace: "return false&&null!=$1.jQuery"
            }
        }
    ],

    start() {
        trapSentry();
    },

    shouldSend(event: string, properties?: Record<string, unknown>) {
        if (!settings.store.blockAnalytics) return true;
        return settings.store.keepBadgeProgress && isBadgeEvent(event, properties);
    }
});
