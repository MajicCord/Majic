/*
 * Majic — VcNarrator plugin
 */

import { Button, Select } from "@components/ui";
import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { React, Stores, useEffect, useState } from "@webpack/common";

type EventType = "join" | "leave" | "move";

interface VoiceStateUpdate {
    userId: string;
    channelId?: string | null;
    oldChannelId?: string | null;
    sessionId?: string;
}

function VoicePicker({ setValue }: { setValue(value: string): void }) {
    const [voices, setVoices] = useState(() => speechSynthesis.getVoices());
    const [selected, setSelected] = useState<string>(settings.store.voice ?? "");

    useEffect(() => {
        const update = () => setVoices(speechSynthesis.getVoices());
        speechSynthesis.addEventListener("voiceschanged", update);
        return () => speechSynthesis.removeEventListener("voiceschanged", update);
    }, []);

    const options = [{ label: "System default", value: "" }, ...voices.map(v => ({ label: `${v.name} (${v.lang})`, value: v.voiceURI }))];

    return (
        <div className="majic-row">
            <div className="majic-row-grow">
                <Select value={selected} options={options} onChange={value => { setSelected(value); setValue(value); }} />
            </div>
            <Button variant="secondary" onClick={() => speak(format(settings.store.joinMessage, "Majic", "general"))}>Test</Button>
        </div>
    );
}

const settings = definePluginSettings({
    voice: {
        type: OptionType.COMPONENT,
        description: "Narrator voice",
        component: VoicePicker,
        default: ""
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Volume",
        markers: [0, 0.25, 0.5, 0.75, 1],
        default: 1
    },
    rate: {
        type: OptionType.SLIDER,
        description: "Speed",
        markers: [0.5, 1, 1.5, 2, 3],
        default: 1
    },
    sayOwnName: {
        type: OptionType.BOOLEAN,
        description: "Say your own name when you join, leave or move",
        default: false
    },
    joinMessage: {
        type: OptionType.STRING,
        description: "Join message ({{USER}} and {{CHANNEL}} are replaced)",
        default: "{{USER}} joined"
    },
    leaveMessage: {
        type: OptionType.STRING,
        description: "Leave message",
        default: "{{USER}} left"
    },
    moveMessage: {
        type: OptionType.STRING,
        description: "Move message",
        default: "{{USER}} moved to {{CHANNEL}}"
    }
});

function speak(text: string) {
    if (!text.trim()) return;
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = speechSynthesis.getVoices().find(v => v.voiceURI === settings.store.voice);
    if (voice) utterance.voice = voice;
    utterance.volume = settings.store.volume;
    utterance.rate = settings.store.rate;
    speechSynthesis.speak(utterance);
}

const cleanName = (name: string) => name.normalize("NFKC").replace(/[^\p{Letter}\p{Number}\p{Punctuation}\s]/gu, "").trim();

function format(template: string, user: string, channel: string) {
    return template
        .replaceAll("{{USER}}", user ? cleanName(user) || "Someone" : "")
        .replaceAll("{{CHANNEL}}", cleanName(channel) || "a channel");
}

let myChannelId: string | null | undefined;

function eventOf(update: VoiceStateUpdate, isMe: boolean): [EventType, string] | null {
    let previous = update.oldChannelId;
    if (isMe) {
        previous = myChannelId;
        myChannelId = update.channelId;
    }

    if (update.channelId === previous) return null;
    if (update.channelId) return [previous ? "move" : "join", update.channelId];
    if (previous) return ["leave", previous];
    return null;
}

function displayName(userId: string) {
    const user = Stores.UserStore.getUser(userId);
    const guildId = Stores.SelectedGuildStore.getGuildId();
    return (guildId && Stores.GuildMemberStore.getNick(guildId, userId)) ?? user?.globalName ?? user?.username ?? "";
}

export default definePlugin({
    name: "VcNarrator",
    description: "Reads out loud when people join, leave or move in your voice channel",
    authors: [{ name: "SnailyStudios" }],
    settings,

    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceStateUpdate[] }) {
            const myId = Stores.UserStore.getCurrentUser()?.id;
            const myVoiceChannel = Stores.SelectedChannelStore.getVoiceChannelId();

            for (const update of voiceStates) {
                const isMe = update.userId === myId;
                if (isMe && update.sessionId && update.sessionId !== Stores.AuthenticationStore?.getSessionId()) continue;
                if (!isMe && (!myVoiceChannel || (update.channelId !== myVoiceChannel && update.oldChannelId !== myVoiceChannel))) continue;

                const event = eventOf(update, isMe);
                if (!event) continue;

                const [type, channelId] = event;
                const user = isMe && !settings.store.sayOwnName ? "" : displayName(update.userId);
                const channel = Stores.ChannelStore.getChannel(channelId)?.name ?? "";
                speak(format(settings.store[`${type}Message`], user, channel));
            }
        }
    }
});
