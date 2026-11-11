/*
 * Majic — VoiceMessages web recorder
 */

import { Button } from "@components/ui";
import { Logger } from "@utils/logger";
import { React, Stores, useRef, useState } from "@webpack/common";

import type { VoiceRecorder } from ".";
import { settings } from "./settings";
import { s } from "./strings";
import { useFluxSubscription } from "./utils";
import { webmToOgg } from "./webmToOgg";

const OGG_OPUS = "audio/ogg; codecs=opus";

async function tryRemux(webm: Blob) {
    try {
        return webmToOgg(await webm.arrayBuffer());
    } catch (err) {
        new Logger("VoiceMessages", "#ff79c6").error("Failed to remux WebM to Ogg, falling back to WebM", err);
        return webm;
    }
}

export const VoiceRecorderWeb: VoiceRecorder = ({ setAudioBlob, onRecordingChange }) => {
    const [recording, setRecording] = useState(false);
    const [paused, setPaused] = useState(false);
    const [recorder, setRecorder] = useState<MediaRecorder>();
    const [chunks, setChunks] = useState<Blob[]>([]);
    const closed = useRef(false);

    useFluxSubscription("MAJIC_STOP_RECORDING", () => {
        closed.current = true;
        stopRecording();
    });

    function changeRecording(recording: boolean) {
        setRecording(recording);
        onRecordingChange?.(recording);
    }

    function stopRecording() {
        if (!recording || !recorder) return;

        recorder.addEventListener("stop", async () => {
            const blob = new Blob(chunks, { type: recorder.mimeType });
            setAudioBlob(blob.type.startsWith("audio/webm") ? await tryRemux(blob) : blob);
            changeRecording(false);
        });
        recorder.stop();
        recorder.stream.getTracks().forEach(track => track.stop());
    }

    function toggleRecording() {
        if (recording) return stopRecording();

        navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: settings.store.echoCancellation,
                noiseSuppression: settings.store.noiseSuppression,
                deviceId: Stores.MediaEngineStore.getInputDeviceId()
            }
        }).then(stream => {
            if (closed.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            const chunks: Blob[] = [];
            setChunks(chunks);

            const recorder = new MediaRecorder(stream, {
                mimeType: MediaRecorder.isTypeSupported(OGG_OPUS) ? OGG_OPUS : "audio/webm; codecs=opus"
            });
            setRecorder(recorder);
            recorder.addEventListener("dataavailable", e => chunks.push(e.data));
            recorder.start();

            changeRecording(true);
        });
    }

    return (
        <>
            <Button onClick={toggleRecording}>
                {recording ? s("stopRecording") : s("startRecording")}
            </Button>

            <Button
                disabled={!recording}
                onClick={() => {
                    setPaused(!paused);
                    if (paused) recorder?.resume();
                    else recorder?.pause();
                }}
            >
                {paused ? s("resumeRecording") : s("pauseRecording")}
            </Button>
        </>
    );
};
