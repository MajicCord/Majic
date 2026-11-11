/*
 * Majic — VoiceMessages desktop recorder
 */

import { Button } from "@components/ui";
import type { PluginNative } from "@utils/types";
import { React, showToast, Stores, useRef, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
import { s } from "./strings";
import { useFluxSubscription } from "./utils";

const Native = MajicNative.pluginHelpers.VoiceMessages as PluginNative<typeof import("./native")>;

const getDiscordVoice = () => (window as any).DiscordNative.nativeModules.requireModule("discord_voice");

export const VoiceRecorderDesktop: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const closed = useRef(false);

    useFluxSubscription("MAJIC_STOP_RECORDING", () => {
        closed.current = true;
        stopRecording();
    });

    function changeRecording(recording: boolean) {
        setRecording(recording);
        onRecordingChange(recording);
    }

    function stopRecording() {
        if (!recording) return;

        getDiscordVoice().stopLocalAudioRecording(async (filePath: string) => {
            if (filePath) {
                const buf = await Native.readRecording(filePath);
                if (buf) setAudioBlob(new Blob([buf], { type: "audio/ogg; codecs=opus" }));
                else showToast({ text: s("finishFailed"), variant: "critical" });
            }
            changeRecording(false);
        });
    }

    function toggleRecording() {
        const discordVoice = getDiscordVoice();
        const nowRecording = !recording;

        if (!nowRecording) return stopRecording();

        discordVoice.startLocalAudioRecording(
            {
                echoCancellation: settings.store.echoCancellation,
                noiseCancellation: settings.store.noiseSuppression,
                deviceId: Stores.MediaEngineStore.getInputDeviceId()
            },
            (success: boolean) => {
                if (closed.current) {
                    if (success) discordVoice.stopLocalAudioRecording((filePath: string) => filePath && Native.readRecording(filePath));
                    return;
                }

                if (success) changeRecording(true);
                else showToast({ text: s("startFailed"), variant: "critical" });
            }
        );
    }

    return (
        <Button onClick={toggleRecording}>
            {recording ? s("stopRecording") : s("startRecording")}
        </Button>
    );
};
