/*
 * Majic — Translate strings
 */

import { createStrings } from "@i18n";

export const s = createStrings({
    en: {
        translate: "Translate",
        google: "Google Translate",
        deepl: "DeepL Free — API key required",
        deeplPro: "DeepL Pro — API key required",
        kagi: "Kagi Translate — API key required",
        customize: "Customize translation languages & Auto-Translate",
        receivedInput: "Language incoming messages are translated from",
        receivedOutput: "Language incoming messages are translated to",
        sentInput: "Language your messages are translated from",
        sentOutput: "Language your messages are translated to",
        selectLanguage: "Select a language",
        autoTranslate: "Auto Translate",
        autoTranslateDescription: "Automatically translate your messages before sending. You can also Shift+click or right-click the translate button to toggle this",
        autoEnabledTitle: "Auto-Translate Enabled",
        autoEnabledSubtitle: "You just enabled Auto Translate! Any message will automatically be translated before being sent.",
        disableAuto: "Disable Auto-Translate",
        gotIt: "Got it",
        dontShowAgain: "Don't show this again",
        openModal: "Open Translate Modal",
        autoEnabledTooltip: "Auto Translate Enabled",
        translatedFrom: "translated from {language}",
        dismiss: "Dismiss",
        genericError: "Something went wrong. If this issue persists, please check the console.",
        deeplQuota: "DeepL API quota exceeded. Falling back to Google Translate",
        deeplNoKey: "DeepL API key is not set. Resetting to Google",
        deeplConnect: "Failed to connect to DeepL API: {error}",
        deeplInvalid: "Invalid DeepL API key or version",
        kagiInvalid: "Invalid or expired Kagi session token"
    },
    fr: {
        translate: "Traduire",
        google: "Google Traduction",
        deepl: "DeepL Free — clé API requise",
        deeplPro: "DeepL Pro — clé API requise",
        kagi: "Kagi Translate — clé API requise",
        customize: "Choisir les langues de traduction et la traduction automatique",
        receivedInput: "Langue d'origine des messages reçus",
        receivedOutput: "Langue de traduction des messages reçus",
        sentInput: "Langue d'origine de tes messages",
        sentOutput: "Langue de traduction de tes messages",
        selectLanguage: "Choisir une langue",
        autoTranslate: "Traduction automatique",
        autoTranslateDescription: "Traduit automatiquement tes messages avant l'envoi. Tu peux aussi faire Maj+clic ou clic droit sur le bouton de traduction pour l'activer ou la désactiver",
        autoEnabledTitle: "Traduction automatique activée",
        autoEnabledSubtitle: "Tu viens d'activer la traduction automatique ! Chaque message sera traduit avant d'être envoyé.",
        disableAuto: "Désactiver la traduction automatique",
        gotIt: "Compris",
        dontShowAgain: "Ne plus afficher",
        openModal: "Ouvrir la fenêtre de traduction",
        autoEnabledTooltip: "Traduction automatique activée",
        translatedFrom: "traduit depuis : {language}",
        dismiss: "Masquer",
        genericError: "Une erreur est survenue. Si le problème persiste, regarde la console.",
        deeplQuota: "Quota de l'API DeepL dépassé. Retour à Google Traduction",
        deeplNoKey: "Aucune clé API DeepL. Retour à Google Traduction",
        deeplConnect: "Impossible de joindre l'API DeepL : {error}",
        deeplInvalid: "Clé ou version de l'API DeepL invalide",
        kagiInvalid: "Jeton de session Kagi invalide ou expiré"
    }
});
