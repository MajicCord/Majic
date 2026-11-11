/*
 * Majic — CustomRPC shared state
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { OptionType } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, React } from "@webpack/common";

export const s = createStrings({
    en: {
        enablePresence: "Enable Presence",
        activityType: "Activity Type",
        playing: "Playing",
        streaming: "Streaming",
        listening: "Listening",
        watching: "Watching",
        competing: "Competing",
        appId: "Application ID",
        appName: "Application Name",
        details: "Detail (line 1)",
        detailsUrl: "Detail URL",
        state: "State (line 2)",
        stateUrl: "State URL",
        streamLink: "Stream Link (Twitch or YouTube, only if activity type is Streaming)",
        partySize: "Party Size",
        partyMaxSize: "Maximum Party Size",
        imageBig: "Large Image URL/Key",
        imageBigText: "Large Image Text",
        imageBigUrl: "Large Image clickable URL",
        imageSmall: "Small Image URL/Key",
        imageSmallText: "Small Image Text",
        imageSmallUrl: "Small Image clickable URL",
        buttonOneText: "Button 1 Text",
        buttonOneUrl: "Button 1 URL",
        buttonTwoText: "Button 2 Text",
        buttonTwoUrl: "Button 2 URL",
        timestampMode: "Timestamp Mode",
        tsNone: "None",
        tsNow: "Since Discord opened",
        tsTime: "Same as your current time (not reset after 24h)",
        tsCustom: "Custom",
        startTime: "Start Timestamp (in milliseconds)",
        endTime: "End Timestamp (in milliseconds)",
        enterValue: "Enter a value",
        required: "This field is required.",
        tooLong: "Must not be longer than {max} characters.",
        invalidId: "Must be a valid Discord ID.",
        invalidStream: "Streaming link must be a valid URL.",
        streamTooLong: "Streaming link must not be longer than 512 characters.",
        notNumber: "Must be a number.",
        notPositive: "Must be a positive number.",
        invalidUrl: "Must be a valid URL.",
        discordLink: "Don't use a Discord link. Use an Imgur image link instead.",
        imgurLink: "Imgur link must be a direct link to the image (e.g. https://i.imgur.com/...). Right click the image and click 'Copy image address'",
        tenorLink: "Tenor link must be a direct link to the image (e.g. https://media.tenor.com/...). Right click the GIF and click 'Copy image address'",
        disabledTitle: "Custom RPC disabled",
        disabledText: "The \"Enable Presence\" setting is disabled, so your presence won't show. If this was unintentional, enable it below.",
        sharingTitle: "Activity Sharing disabled",
        sharingText: "Activity Sharing isn't enabled, so people won't be able to see your custom rich presence!",
        enableSharing: "Enable Activity Sharing",
        help1: "Go to the Discord Developer Portal to create an application and get the application ID.",
        portal: "Open the Discord Developer Portal",
        help2: "Upload images in the Rich Presence tab to get the image keys.",
        help3: "If you want to use an image link, upload your image to Imgur and get the image link by right-clicking the image and selecting \"Copy image address\".",
        help4: "You can't see your own buttons on your profile, but everyone else can see them fine.",
        help5: "Some unusual unicode text (\"fonts\" like this) may prevent the rich presence from showing up, try using normal letters instead."
    },
    fr: {
        enablePresence: "Activer le statut",
        activityType: "Type d'activité",
        playing: "Joue à",
        streaming: "En stream",
        listening: "Écoute",
        watching: "Regarde",
        competing: "En compétition",
        appId: "ID de l'application",
        appName: "Nom de l'application",
        details: "Détail (ligne 1)",
        detailsUrl: "Lien du détail",
        state: "État (ligne 2)",
        stateUrl: "Lien de l'état",
        streamLink: "Lien du stream (Twitch ou YouTube, seulement si le type est En stream)",
        partySize: "Taille du groupe",
        partyMaxSize: "Taille max du groupe",
        imageBig: "Grande image (lien ou clé)",
        imageBigText: "Texte de la grande image",
        imageBigUrl: "Lien cliquable de la grande image",
        imageSmall: "Petite image (lien ou clé)",
        imageSmallText: "Texte de la petite image",
        imageSmallUrl: "Lien cliquable de la petite image",
        buttonOneText: "Texte du bouton 1",
        buttonOneUrl: "Lien du bouton 1",
        buttonTwoText: "Texte du bouton 2",
        buttonTwoUrl: "Lien du bouton 2",
        timestampMode: "Mode d'horodatage",
        tsNone: "Aucun",
        tsNow: "Depuis l'ouverture de Discord",
        tsTime: "Identique à ton heure actuelle (pas remis à zéro après 24 h)",
        tsCustom: "Personnalisé",
        startTime: "Horodatage de début (en millisecondes)",
        endTime: "Horodatage de fin (en millisecondes)",
        enterValue: "Saisis une valeur",
        required: "Ce champ est obligatoire.",
        tooLong: "Ne doit pas dépasser {max} caractères.",
        invalidId: "Doit être un ID Discord valide.",
        invalidStream: "Le lien du stream doit être une URL valide.",
        streamTooLong: "Le lien du stream ne doit pas dépasser 512 caractères.",
        notNumber: "Doit être un nombre.",
        notPositive: "Doit être un nombre positif.",
        invalidUrl: "Doit être une URL valide.",
        discordLink: "N'utilise pas un lien Discord. Utilise plutôt un lien d'image Imgur.",
        imgurLink: "Le lien Imgur doit pointer directement vers l'image (ex. https://i.imgur.com/...). Clic droit sur l'image puis « Copier l'adresse de l'image »",
        tenorLink: "Le lien Tenor doit pointer directement vers l'image (ex. https://media.tenor.com/...). Clic droit sur le GIF puis « Copier l'adresse de l'image »",
        disabledTitle: "Custom RPC désactivé",
        disabledText: "Le réglage « Activer le statut » est désactivé, donc ton statut ne s'affichera pas. Si ce n'est pas voulu, active-le ci-dessous.",
        sharingTitle: "Partage d'activité désactivé",
        sharingText: "Le partage d'activité n'est pas activé, donc personne ne verra ton statut personnalisé !",
        enableSharing: "Activer le partage d'activité",
        help1: "Va sur le portail développeur de Discord pour créer une application et récupérer son ID.",
        portal: "Ouvrir le portail développeur de Discord",
        help2: "Envoie des images dans l'onglet Rich Presence pour obtenir leurs clés.",
        help3: "Pour utiliser un lien d'image, envoie ton image sur Imgur et copie son lien avec clic droit puis « Copier l'adresse de l'image ».",
        help4: "Tu ne vois pas tes propres boutons sur ton profil, mais les autres les voient bien.",
        help5: "Certains textes unicode inhabituels (« polices » fantaisie) peuvent empêcher le statut de s'afficher, utilise plutôt des lettres normales."
    }
});

export const ActivityType = {
    PLAYING: 0,
    STREAMING: 1,
    LISTENING: 2,
    WATCHING: 3,
    COMPETING: 5
} as const;

export const TimestampMode = {
    NONE: 0,
    NOW: 1,
    TIME: 2,
    CUSTOM: 3
} as const;

export interface PrivateSettings {
    appID?: string;
    appName?: string;
    details?: string;
    detailsURL?: string;
    state?: string;
    stateURL?: string;
    type?: number;
    streamLink?: string;
    timestampMode?: number;
    startTime?: number;
    endTime?: number;
    imageBig?: string;
    imageBigURL?: string;
    imageBigTooltip?: string;
    imageSmall?: string;
    imageSmallURL?: string;
    imageSmallTooltip?: string;
    buttonOneText?: string;
    buttonOneURL?: string;
    buttonTwoText?: string;
    buttonTwoURL?: string;
    partySize?: number;
    partyMaxSize?: number;
}

let RPCSettingsComponent: () => any = () => null;
export const setRPCSettingsComponent = (component: () => any) => void (RPCSettingsComponent = component);

export const settings = definePluginSettings({
    enablePresence: {
        type: OptionType.BOOLEAN,
        description: "Show the presence",
        default: true,
        onChange: (value: boolean) => void setRpc(!value)
    },
    config: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <RPCSettingsComponent />
    }
});

export const store = () => settings.store as unknown as PrivateSettings & { enablePresence: boolean; [key: string]: any };

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(store().appID, [key]))[0];
}

export async function createActivity(): Promise<Record<string, any> | undefined> {
    const {
        appID, appName, details, detailsURL, state, stateURL, type, streamLink, startTime, endTime,
        imageBig, imageBigURL, imageBigTooltip, imageSmall, imageSmallURL, imageSmallTooltip,
        buttonOneText, buttonOneURL, buttonTwoText, buttonTwoURL, partyMaxSize, partySize, timestampMode
    } = store();

    if (!appName) return;

    const activity: Record<string, any> = {
        application_id: appID || "0",
        name: appName,
        state,
        details,
        type: type ?? ActivityType.PLAYING,
        flags: 1 << 0
    };

    if (type === ActivityType.STREAMING) activity.url = streamLink;

    switch (timestampMode) {
        case TimestampMode.NOW:
            activity.timestamps = { start: Date.now() };
            break;
        case TimestampMode.TIME: {
            const now = new Date();
            activity.timestamps = { start: Date.now() - (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) * 1000 };
            break;
        }
        case TimestampMode.CUSTOM:
            if (startTime || endTime) {
                activity.timestamps = {};
                if (startTime) activity.timestamps.start = startTime;
                if (endTime) activity.timestamps.end = endTime;
            }
            break;
    }

    if (detailsURL) activity.details_url = detailsURL;
    if (stateURL) activity.state_url = stateURL;

    if (buttonOneText) {
        activity.buttons = [buttonOneText, buttonTwoText].filter(Boolean);
        activity.metadata = { button_urls: [buttonOneURL, buttonTwoURL].filter(Boolean) };
    }

    if (imageBig) {
        activity.assets = {
            large_image: await getApplicationAsset(imageBig),
            large_text: imageBigTooltip || undefined,
            large_url: imageBigURL || undefined
        };
    }

    if (imageSmall) {
        activity.assets = {
            ...activity.assets,
            small_image: await getApplicationAsset(imageSmall),
            small_text: imageSmallTooltip || undefined,
            small_url: imageSmallURL || undefined
        };
    }

    if (partyMaxSize && partySize) activity.party = { size: [partySize, partyMaxSize] };

    for (const key in activity) {
        if (key === "type") continue;
        const value = activity[key];
        if (!value || value.length === 0) delete activity[key];
    }

    return activity;
}

export async function setRpc(disable?: boolean) {
    const shouldDisable = disable ?? !store().enablePresence;
    const activity = await createActivity();

    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity: !shouldDisable ? activity : null,
        socketId: "CustomRPC"
    });
}
