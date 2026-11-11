/*
 * Majic — VoiceMessages preview
 */

import { useTimer } from "@utils/misc";
import { React } from "@webpack/common";

import { VoiceMessage } from ".";
import { s } from "./strings";
import { cl } from "./utils";

export interface VoicePreviewOptions {
    src?: string;
    waveform: string;
    recording?: boolean;
}

export function VoicePreview({ src, waveform, recording }: VoicePreviewOptions) {
    const durationMs = useTimer({ deps: [recording] });

    const durationSeconds = recording ? Math.floor(durationMs / 1000) : 0;
    const durationDisplay = Math.floor(durationSeconds / 60) + ":" + (durationSeconds % 60).toString().padStart(2, "0");

    if (src && !recording) return <VoiceMessage key={src} src={src} waveform={waveform} />;

    return (
        <div className={cl("preview", recording ? ["preview-recording"] : [])}>
            <div className={cl("preview-indicator")} />
            <div className={cl("preview-time")}>{durationDisplay}</div>
            <div className={cl("preview-label")}>{recording ? s("recording") : "----"}</div>
        </div>
    );
}
