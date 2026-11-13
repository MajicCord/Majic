/*
 * Majic — VcNarrator settings
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { OptionType } from "@utils/types";

import { VoiceSettingSection } from "./VoiceSetting";

export const s = createStrings({
    en: {
        voice: "Voice",
        language: "Language",
        selectVoice: "Select a voice",
        selectLanguage: "Select a language",
        noVoices: "No voices found.",
        intro: "You can customise the spoken messages below. You can disable specific messages by setting them to nothing",
        placeholders: "The special placeholders {{USER}}, {{DISPLAY_NAME}}, {{NICKNAME}} and {{CHANNEL}} will be replaced with the user's name (nothing if it's yourself), the user's display name, the user's nickname on current server and the channel's name respectively",
        examples: "Play Example Sounds",
        noVoicesError: "No narrator voices found. ",
        noVoicesLinux: "Install speech-dispatcher or espeak and run Discord with the --enable-speech-dispatcher flag",
        noVoicesOther: "Try installing some in the Narrator settings of your Operating System",
        noEnglish: "You don't have any English voices installed, so the narrator might sound weird",
        someone: "Someone",
        channel: "channel",
        join: "Join",
        leave: "Leave",
        move: "Move",
        mute: "Mute",
        unmute: "Unmute",
        deafen: "Deafen",
        undeafen: "Undeafen"
    },
    fr: {
        voice: "Voix",
        language: "Langue",
        selectVoice: "Choisis une voix",
        selectLanguage: "Choisis une langue",
        noVoices: "Aucune voix trouvée.",
        intro: "Tu peux personnaliser les messages prononcés ci-dessous. Laisse un message vide pour le désactiver",
        placeholders: "Les marqueurs {{USER}}, {{DISPLAY_NAME}}, {{NICKNAME}} et {{CHANNEL}} sont remplacés respectivement par le nom de l'utilisateur (rien si c'est toi), son nom d'affichage, son pseudo sur le serveur actuel et le nom du salon",
        examples: "Écouter des exemples",
        noVoicesError: "Aucune voix de narrateur trouvée. ",
        noVoicesLinux: "Installe speech-dispatcher ou espeak et lance Discord avec l'option --enable-speech-dispatcher",
        noVoicesOther: "Essaie d'en installer dans les paramètres du narrateur de ton système",
        noEnglish: "Tu n'as aucune voix anglaise installée, le narrateur risque de sonner bizarrement",
        someone: "Quelqu'un",
        channel: "salon",
        join: "Arrivée",
        leave: "Départ",
        move: "Changement",
        mute: "Micro coupé",
        unmute: "Micro réactivé",
        deafen: "Son coupé",
        undeafen: "Son réactivé"
    }
});

const logger = new Logger("VcNarrator", "#ff79c6");

export const getDefaultVoice = () => window.speechSynthesis?.getVoices().find(voice => voice.default);

export function getCurrentVoice(voices = window.speechSynthesis?.getVoices()) {
    if (!voices) return undefined;

    if (settings.store.voice) {
        const voice = voices.find(v => v.voiceURI === settings.store.voice);
        if (voice) return voice;
        logger.error(`Voice "${settings.store.voice}" not found. Resetting to default.`);
    }

    const voice = voices.find(v => v.default);
    settings.store.voice = voice?.voiceURI as string;
    return voice;
}

export const settings = definePluginSettings({
    voice: {
        type: OptionType.COMPONENT,
        description: "",
        component: VoiceSettingSection,
        get default() {
            return getDefaultVoice()?.voiceURI;
        }
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Narrator Volume",
        default: 1,
        markers: [0, 0.25, 0.5, 0.75, 1],
        stickToMarkers: false
    },
    rate: {
        type: OptionType.SLIDER,
        description: "Narrator Speed",
        default: 1,
        markers: [0.1, 0.5, 1, 2, 5, 10],
        stickToMarkers: false
    },
    sayOwnName: {
        type: OptionType.BOOLEAN,
        description: "Say own name",
        default: false
    },
    latinOnly: {
        type: OptionType.BOOLEAN,
        description: "Strip non latin characters from names before saying them",
        default: false
    },
    joinMessage: {
        type: OptionType.STRING,
        description: "Join Message",
        default: "{{USER}} joined"
    },
    leaveMessage: {
        type: OptionType.STRING,
        description: "Leave Message",
        default: "{{USER}} left"
    },
    moveMessage: {
        type: OptionType.STRING,
        description: "Move Message",
        default: "{{USER}} moved to {{CHANNEL}}"
    },
    muteMessage: {
        type: OptionType.STRING,
        description: "Mute Message (only self for now)",
        default: "{{USER}} muted"
    },
    unmuteMessage: {
        type: OptionType.STRING,
        description: "Unmute Message (only self for now)",
        default: "{{USER}} unmuted"
    },
    deafenMessage: {
        type: OptionType.STRING,
        description: "Deafen Message (only self for now)",
        default: "{{USER}} deafened"
    },
    undeafenMessage: {
        type: OptionType.STRING,
        description: "Undeafen Message (only self for now)",
        default: "{{USER}} undeafened"
    }
});
