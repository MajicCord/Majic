/*
 * Majic — VoiceMessages strings
 */

import { createStrings } from "@i18n";

export const s = createStrings({
    en: {
        sendVoiceMessage: "Send Voice Message",
        recordTitle: "Record Voice Message",
        send: "Send",
        sending: "Now sending voice message... Please be patient",
        uploadFailed: "Failed to upload voice message",
        uploadFile: "Upload File",
        preview: "Preview",
        parseFailed: "Failed to parse selected audio file: {error}",
        unsupported: "Voice messages have to be OggOpus to be playable on iOS. This file is {type} so it will not be playable on iOS.",
        convertHint: "To fix it, first convert it to OggOpus, for example using the",
        converter: "convertio web converter",
        startRecording: "Start recording",
        stopRecording: "Stop recording",
        pauseRecording: "Pause recording",
        resumeRecording: "Resume recording",
        recording: "RECORDING",
        startFailed: "Failed to start recording",
        finishFailed: "Failed to finish recording"
    },
    fr: {
        sendVoiceMessage: "Envoyer un message vocal",
        recordTitle: "Enregistrer un message vocal",
        send: "Envoyer",
        sending: "Envoi du message vocal en cours... Patiente un peu",
        uploadFailed: "Impossible d'envoyer le message vocal",
        uploadFile: "Choisir un fichier",
        preview: "Aperçu",
        parseFailed: "Impossible de lire le fichier audio choisi : {error}",
        unsupported: "Les messages vocaux doivent être en OggOpus pour être lus sur iOS. Ce fichier est en {type}, il ne sera donc pas lisible sur iOS.",
        convertHint: "Pour corriger ça, convertis-le d'abord en OggOpus, par exemple avec le",
        converter: "convertisseur en ligne convertio",
        startRecording: "Démarrer l'enregistrement",
        stopRecording: "Arrêter l'enregistrement",
        pauseRecording: "Mettre en pause",
        resumeRecording: "Reprendre l'enregistrement",
        recording: "ENREGISTREMENT",
        startFailed: "Impossible de démarrer l'enregistrement",
        finishFailed: "Impossible de terminer l'enregistrement"
    }
});
