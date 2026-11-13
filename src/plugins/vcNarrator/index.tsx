/*
 * Majic — VcNarrator plugin
 */

import { Button, SubHeading, Text } from "@components/ui";
import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";
import { React, Stores, useMemo } from "@webpack/common";
import type { ReactElement } from "react";

import { getCurrentVoice, s, settings } from "./settings";

interface VoiceStateChangeEvent {
    userId: string;
    channelId?: string;
    oldChannelId?: string;
    deaf: boolean;
    mute: boolean;
    selfDeaf: boolean;
    selfMute: boolean;
    sessionId: string;
}

const MESSAGE_TYPES = ["join", "leave", "move", "mute", "unmute", "deafen", "undeafen"] as const;
type MessageType = typeof MESSAGE_TYPES[number];

const IS_LINUX = navigator.platform.toLowerCase().includes("linux");

const message = (type: string): string => (settings.store as Record<string, any>)[`${type}Message`] ?? "";

function speak(text: string) {
    if (!text || (window as any).__OVERLAY__) return;

    const { volume, rate } = settings.store;
    const speech = new SpeechSynthesisUtterance(text);
    speech.voice = getCurrentVoice()!;
    speech.volume = volume;
    speech.rate = rate;
    speechSynthesis.speak(speech);
}

function clean(text: string) {
    const replacer = settings.store.latinOnly
        ? /[^\p{Script=Latin}\p{Number}\p{Punctuation}\s]/gu
        : /[^\p{Letter}\p{Number}\p{Punctuation}\s]/gu;

    return text.normalize("NFKC").replace(replacer, "").replace(/_{2,}/g, "_").trim();
}

function formatText(text: string, user: string, channel: string, displayName: string, nickname: string) {
    return text
        .replaceAll("{{USER}}", clean(user) || (user ? s("someone") : ""))
        .replaceAll("{{CHANNEL}}", clean(channel) || s("channel"))
        .replaceAll("{{DISPLAY_NAME}}", clean(displayName) || (displayName ? s("someone") : ""))
        .replaceAll("{{NICKNAME}}", clean(nickname) || (nickname ? s("someone") : ""));
}

let myLastChannelId: string | undefined;

function getTypeAndChannelId({ channelId, oldChannelId }: VoiceStateChangeEvent, isMe: boolean): [string, string] {
    if (isMe && channelId !== myLastChannelId) {
        oldChannelId = myLastChannelId;
        myLastChannelId = channelId;
    }

    if (channelId !== oldChannelId) {
        if (channelId) return [oldChannelId ? "move" : "join", channelId];
        if (oldChannelId) return ["leave", oldChannelId];
    }
    return ["", ""];
}

function playSample(type: MessageType) {
    const currentUser = Stores.UserStore.getCurrentUser();
    const myGuildId = Stores.SelectedGuildStore.getGuildId();

    speak(formatText(
        message(type),
        currentUser.username,
        "general",
        currentUser.globalName ?? currentUser.username,
        Stores.GuildMemberStore.getNick(myGuildId, currentUser.id) ?? currentUser.username
    ));
}

function announceSelfToggle(kind: "mute" | "deaf") {
    const channelId = Stores.SelectedChannelStore.getVoiceChannelId();
    const state = Stores.VoiceStateStore.getVoiceStateForChannel(channelId);
    if (!state) return;

    const event = kind === "mute"
        ? state.mute || state.selfMute ? "unmute" : "mute"
        : state.deaf || state.selfDeaf ? "undeafen" : "deafen";
    speak(formatText(message(event), "", Stores.ChannelStore.getChannel(channelId).name, "", ""));
}

function About() {
    const [hasVoices, hasEnglishVoices] = useMemo(() => {
        const voices = speechSynthesis.getVoices();
        return [voices.length !== 0, voices.some(voice => voice.lang.startsWith("en"))];
    }, []);

    let error: ReactElement | null = null;
    if (!hasVoices) {
        error = <div className="majic-notice-card"><Text>{s("noVoicesError") + (IS_LINUX ? s("noVoicesLinux") : s("noVoicesOther"))}</Text></div>;
    } else if (!hasEnglishVoices) {
        error = <div className="majic-notice-card"><Text>{s("noEnglish")}</Text></div>;
    }

    return (
        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text>{s("intro")}</Text>
            <Text>{s("placeholders")}</Text>
            {hasEnglishVoices && (
                <>
                    <SubHeading>{s("examples")}</SubHeading>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                        {MESSAGE_TYPES.map(type => (
                            <Button key={type} onClick={() => playSample(type)}>{s(type)}</Button>
                        ))}
                    </div>
                </>
            )}
            {error}
        </section>
    );
}

export default definePlugin({
    name: "VcNarrator",
    description: "Announces when users join, leave, or move voice channels via narrator",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Annonce avec le narrateur quand des utilisateurs rejoignent, quittent ou changent de salon vocal",
            options: {
                volume: "Volume du narrateur",
                rate: "Vitesse du narrateur",
                sayOwnName: "Dire ton propre nom",
                latinOnly: "Retirer les caractères non latins des noms avant de les prononcer",
                joinMessage: "Message d'arrivée",
                leaveMessage: "Message de départ",
                moveMessage: "Message de changement de salon",
                muteMessage: "Message de micro coupé (seulement toi pour l'instant)",
                unmuteMessage: "Message de micro réactivé (seulement toi pour l'instant)",
                deafenMessage: "Message de son coupé (seulement toi pour l'instant)",
                undeafenMessage: "Message de son réactivé (seulement toi pour l'instant)"
            }
        }
    },
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateChangeEvent[] }) {
            const myGuildId = Stores.SelectedGuildStore.getGuildId();
            const myChannelId = Stores.SelectedChannelStore.getVoiceChannelId();
            const myId = Stores.UserStore.getCurrentUser().id;

            if (Stores.ChannelStore.getChannel(myChannelId)?.type === 13) return;

            for (const state of voiceStates) {
                const { userId, channelId, oldChannelId } = state;
                const isMe = userId === myId;
                if (isMe && state.sessionId !== Stores.AuthenticationStore.getSessionId()) continue;
                if (!isMe) {
                    if (!myChannelId) continue;
                    if (channelId !== myChannelId && oldChannelId !== myChannelId) continue;
                }

                const [type, id] = getTypeAndChannelId(state, isMe);
                if (!type) continue;

                const user = isMe && !settings.store.sayOwnName ? "" : Stores.UserStore.getUser(userId).username;
                const displayName = user && (Stores.UserStore.getUser(userId).globalName ?? user);
                const nickname = user && (Stores.GuildMemberStore.getNick(myGuildId, userId) ?? displayName);
                const channel = Stores.ChannelStore.getChannel(id).name;

                speak(formatText(message(type), user, channel, displayName, nickname));
            }
        },

        AUDIO_TOGGLE_SELF_MUTE() {
            announceSelfToggle("mute");
        },

        AUDIO_TOGGLE_SELF_DEAF() {
            announceSelfToggle("deaf");
        }
    },

    start() {
        if (typeof speechSynthesis === "undefined" || speechSynthesis.getVoices().length === 0) {
            new Logger("VcNarrator", "#ff79c6").warn("SpeechSynthesis not supported or no Narrator voices found. Thus, this plugin will not work. Check my Settings for more info");
        }
    },

    settingsAboutComponent: About
});
