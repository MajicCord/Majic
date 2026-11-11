/*
 * Majic — VoiceMessages plugin
 */

import { Menu } from "@api/contextMenu";
import { Button, ensureUiStyles, SubHeading, Text } from "@components/ui";
import { useAwaiter } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { findLazy } from "@webpack";
import { DiscordIcon, Endpoints, FluxDispatcher, MessageActions, Modal, openModal, Permissions, React, RestAPI, showToast, SnowflakeUtils, Stores, useEffect, useState } from "@webpack/common";
import type { ComponentType } from "react";

import { VoiceRecorderDesktop } from "./DesktopRecorder";
import { settings } from "./settings";
import { s } from "./strings";
import { chooseFile, cl } from "./utils";
import { VoicePreview } from "./VoicePreview";
import { VoiceRecorderWeb } from "./WebRecorder";

const CloudUpload = findLazy(m => m.prototype?.trackUploadFinished);
const CLOUD_UPLOAD_PLATFORM_WEB = 1;

export type VoiceRecorder = ComponentType<{
    setAudioBlob(blob: Blob): void;
    onRecordingChange(recording: boolean): void;
}>;

export interface VoiceMessageProps {
    src: string;
    waveform: string;
}

export let VoiceMessage: ComponentType<VoiceMessageProps> = () => null;

const VoiceRecorder = (window as any).DiscordNative ? VoiceRecorderDesktop : VoiceRecorderWeb;

const MicrophoneIcon = (props: { width?: number }) => <DiscordIcon name="MicrophoneIcon" size={props.width ?? 18} />;
const ClockIcon = (props: { width?: number }) => <DiscordIcon name="ClockIcon" size={props.width ?? 16} />;

interface AudioMetadata {
    waveform: string;
    duration: number;
}

const EMPTY_META: AudioMetadata = {
    waveform: "AAAAAAAAAAAA",
    duration: 1
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function sendAudio(blob: Blob, meta: AudioMetadata) {
    const channelId = Stores.SelectedChannelStore.getChannelId();
    const reply = Stores.PendingReplyStore.getPendingReply(channelId);
    if (reply) FluxDispatcher.dispatch({ type: "DELETE_PENDING_REPLY", channelId });

    const upload = new CloudUpload({
        file: new File([blob], "voice-message.ogg", { type: "audio/ogg; codecs=opus" }),
        isThumbnail: false,
        platform: CLOUD_UPLOAD_PLATFORM_WEB
    }, channelId);

    upload.on("complete", () => {
        RestAPI.post({
            url: Endpoints.MESSAGES(channelId),
            body: {
                flags: 1 << 13,
                channel_id: channelId,
                content: "",
                nonce: SnowflakeUtils.fromTimestamp(Date.now()),
                sticker_ids: [],
                type: 0,
                attachments: [{
                    id: "0",
                    filename: upload.filename,
                    uploaded_filename: upload.uploadedFilename,
                    waveform: meta.waveform,
                    duration_secs: meta.duration
                }],
                message_reference: reply ? MessageActions.getSendMessageOptionsForReply(reply)?.messageReference : null
            }
        });
    });
    upload.on("error", () => showToast({ text: s("uploadFailed"), variant: "critical" }));

    upload.upload();
}

function useObjectUrl() {
    const [url, setUrl] = useState<string>();
    const setWithFree = (blob: Blob) => {
        if (url) URL.revokeObjectURL(url);
        setUrl(URL.createObjectURL(blob));
    };

    return [url, setWithFree] as const;
}

function VoiceMessageModal({ modalProps }: { modalProps: any }) {
    const [isRecording, setRecording] = useState(false);
    const [blob, setBlob] = useState<Blob>();
    const [blobUrl, setBlobUrl] = useObjectUrl();

    useEffect(() => () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
    }, [blobUrl]);

    const [meta, metaError] = useAwaiter<AudioMetadata>(async () => {
        if (!blob) return EMPTY_META;

        const audioContext = new AudioContext();
        const audioBuffer = await audioContext.decodeAudioData(await blob.arrayBuffer());
        const channelData = audioBuffer.getChannelData(0);

        const bins = new Uint8Array(clamp(Math.floor(audioBuffer.duration * 10), Math.min(32, channelData.length), 256));
        const samplesPerBin = Math.floor(channelData.length / bins.length);

        for (let binIdx = 0; binIdx < bins.length; binIdx++) {
            let squares = 0;
            for (let sampleOffset = 0; sampleOffset < samplesPerBin; sampleOffset++) {
                const sampleIdx = binIdx * samplesPerBin + sampleOffset;
                squares += channelData[sampleIdx] ** 2;
            }
            bins[binIdx] = ~~(Math.sqrt(squares / samplesPerBin) * 0xFF);
        }

        const maxBin = Math.max(...bins);
        const ratio = 1 + (0xFF / maxBin - 1) * Math.min(1, 100 * (maxBin / 0xFF) ** 3);
        for (let i = 0; i < bins.length; i++) bins[i] = Math.min(0xFF, ~~(bins[i] * ratio));

        return {
            waveform: window.btoa(String.fromCharCode(...bins)),
            duration: audioBuffer.duration
        };
    }, {
        deps: [blob],
        fallbackValue: EMPTY_META
    });

    const isUnsupportedFormat = blob && (
        !blob.type.startsWith("audio/ogg")
        || blob.type.includes("codecs") && !blob.type.includes("opus")
    );

    return (
        <Modal
            {...modalProps}
            title={s("recordTitle")}
            actions={[{
                text: s("send"),
                variant: "primary",
                onClick: () => {
                    sendAudio(blob!, meta ?? EMPTY_META);
                    modalProps.onClose();
                    showToast({ text: s("sending"), icon: ClockIcon, iconColor: "var(--text-default)" });
                },
                disabled: !blob
            }]}
        >
            <div className={cl("buttons")}>
                <VoiceRecorder
                    setAudioBlob={blob => {
                        setBlob(blob);
                        setBlobUrl(blob);
                    }}
                    onRecordingChange={setRecording}
                />

                <Button
                    onClick={async () => {
                        const file = await chooseFile("audio/*");
                        if (file) {
                            setBlob(file);
                            setBlobUrl(file);
                        }
                    }}
                >
                    {s("uploadFile")}
                </Button>
            </div>

            <SubHeading>{s("preview")}</SubHeading>
            {metaError
                ? <p className={cl("error")}>{s("parseFailed", { error: (metaError as Error).message })}</p>
                : <VoicePreview src={blobUrl} waveform={meta.waveform} recording={isRecording} />}

            {isUnsupportedFormat && (
                <div className="majic-notice-card" style={{ marginTop: 16 }}>
                    <Text>{s("unsupported", { type: blob.type })}</Text>
                    <div style={{ marginTop: 8 }}>
                        <Text>
                            {s("convertHint")} <a href="https://convertio.co/mp3-opus/" target="_blank" rel="noreferrer">{s("converter")}</a>
                        </Text>
                    </div>
                </div>
            )}
        </Modal>
    );
}

export default definePlugin({
    name: "VoiceMessages",
    description: "Lets you send voice messages like on mobile. Right click the upload button and click Send Voice Message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet d'envoyer des messages vocaux comme sur mobile. Fais un clic droit sur le bouton d'envoi de fichier puis « Envoyer un message vocal »",
            options: {
                noiseSuppression: "Suppression du bruit",
                echoCancellation: "Annulation de l'écho"
            }
        }
    },
    settings,

    css: [
        ".majic-vmsg-buttons { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.5em; margin-bottom: 1em; }",
        ".majic-vmsg-preview { color: var(--text-default); border-radius: 24px; background-color: var(--background-base-lower); position: relative; display: flex; align-items: center; padding: 0 16px; height: 48px; }",
        ".majic-vmsg-preview-indicator { background: var(--control-secondary-background-default); width: 16px; height: 16px; border-radius: 50%; transition: background 0.2s ease-in-out; }",
        ".majic-vmsg-preview-recording .majic-vmsg-preview-indicator { background: var(--status-danger); }",
        ".majic-vmsg-preview-time { opacity: 0.8; margin: 0 0.5em; font-size: 80%; font-family: var(--font-code); }",
        ".majic-vmsg-preview-label { opacity: 0.5; letter-spacing: 0.125em; font-weight: 600; flex: 1; text-align: center; }",
        ".majic-vmsg-error { color: var(--text-feedback-critical, #ff5c5c); }"
    ].join(" "),

    patches: [
        {
            find: "#{intl::VOICE_MESSAGES_A11Y_LABEL}",
            replacement: {
                match: /(?<=\i=)(?=\i\.memo\(.{0,50}?=1,onVolumeChange:[^}]+?waveform:[^}]+?playbackCacheKey:)/,
                replace: "$self.VoiceMessage="
            }
        }
    ],

    set VoiceMessage(value: ComponentType<VoiceMessageProps>) {
        VoiceMessage = value;
    },

    contextMenus: {
        "channel-attach"(children, props: { channel?: any } = {}) {
            const { channel } = props;
            if (!channel) return;
            if (channel.guild_id && !(Stores.PermissionStore.can(Permissions.SEND_VOICE_MESSAGES, channel) && Stores.PermissionStore.can(Permissions.SEND_MESSAGES, channel))) return;

            children.push(
                <Menu.MenuItem
                    id="majic-send-vmsg"
                    key="majic-send-vmsg"
                    iconLeft={MicrophoneIcon}
                    leadingAccessory={{ type: "icon", icon: MicrophoneIcon }}
                    label={s("sendVoiceMessage")}
                    action={() => {
                        ensureUiStyles();
                        openModal((modalProps: any) => <VoiceMessageModal modalProps={modalProps} />, {
                            onCloseCallback: () => FluxDispatcher.dispatch({ type: "MAJIC_STOP_RECORDING" })
                        });
                    }}
                />
            );
        }
    }
});
