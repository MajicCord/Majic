/*
 * Majic — MusicRichPresence plugin
 */

import { definePluginSettings } from "@api/settings";
import { Button, Card, SubHeading, Text } from "@components/ui";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { ApplicationAssetUtils, FluxDispatcher, React, Stores } from "@webpack/common";

import { LastFMScrobbler } from "./lastfm";
import { invalidateListenBrainzCache, ListenBrainzScrobbler } from "./listenbrainz";

export interface TrackData {
    name: string;
    album: string;
    artist: string;
    trackURL?: string;
    artistURL?: string;
    albumURL?: string;
    imageURL?: string;
    serviceName?: string;
}

export interface ScrobblerBackend {
    name: string;
    id: string;
    fetchTrackData(): Promise<TrackData | null>;
    getUserURL(username: string): string;
}

const s = createStrings({
    en: {
        backendLastfm: "Last.FM",
        backendListenbrainz: "ListenBrainz",
        backendCompatible: "ListenBrainz Compatible (self-hosted)",
        displayOff: "Don't show (shows generic listening message)",
        displayArtist: "Show artist name",
        displayTrack: "Show track name",
        formatStatus: "Use custom status name",
        formatService: "Use music service name (falls back to custom status text)",
        formatArtistFirst: "Use format 'artist - song'",
        formatSongFirst: "Use format 'song - artist'",
        formatArtist: "Use artist name only",
        formatSong: "Use song name only",
        formatAlbum: "Use album name (falls back to custom status text if song has no album)",
        artLogo: "Use large scrobbler logo",
        artPlaceholder: "Use generic placeholder",
        profile: "{name} Profile",
        apiKeyTitle: "How to create an API key",
        apiKeyHelp: "Set Application name and Application description to anything and leave the rest blank.",
        createApiKey: "Create API Key",
        invalidInstance: "Invalid ListenBrainz compatible instance",
        invalidInstanceHelp: "Provide both the API Base URL and the Instance Base URL for your custom ListenBrainz instance, or switch back to ListenBrainz/Last.FM"
    },
    fr: {
        backendLastfm: "Last.FM",
        backendListenbrainz: "ListenBrainz",
        backendCompatible: "Compatible ListenBrainz (auto-hébergé)",
        displayOff: "Ne pas afficher (message d'écoute générique)",
        displayArtist: "Afficher le nom de l'artiste",
        displayTrack: "Afficher le titre du morceau",
        formatStatus: "Utiliser le texte de statut personnalisé",
        formatService: "Utiliser le nom du service musical (sinon le texte de statut personnalisé)",
        formatArtistFirst: "Format « artiste - morceau »",
        formatSongFirst: "Format « morceau - artiste »",
        formatArtist: "Nom de l'artiste seulement",
        formatSong: "Titre du morceau seulement",
        formatAlbum: "Nom de l'album (sinon le texte de statut personnalisé si pas d'album)",
        artLogo: "Utiliser le grand logo du service",
        artPlaceholder: "Utiliser une image générique",
        profile: "Profil {name}",
        apiKeyTitle: "Comment créer une clé d'API",
        apiKeyHelp: "Mets n'importe quoi dans Application name et Application description, et laisse le reste vide.",
        createApiKey: "Créer une clé d'API",
        invalidInstance: "Instance compatible ListenBrainz invalide",
        invalidInstanceHelp: "Renseigne à la fois l'URL de base de l'API et l'URL de base de l'instance ListenBrainz, ou repasse sur ListenBrainz/Last.FM"
    }
});

const NameFormat = {
    StatusName: "status-name",
    ArtistFirst: "artist-first",
    SongFirst: "song-first",
    ArtistOnly: "artist",
    SongOnly: "song",
    AlbumName: "album",
    ServiceName: "service-name"
} as const;

const ActivityType = { PLAYING: 0, LISTENING: 2, CUSTOM_STATUS: 4 } as const;
const ActivityFlags = { INSTANCE: 1 << 0 } as const;
const ActivityStatusDisplayType = { NAME: 0, STATE: 1, DETAILS: 2 } as const;

const DISCORD_APP_ID = "1108588077900898414";
const LASTFM_PLACEHOLDER_IMAGE_HASH = "2a96cbd8b46e442fc41c2b86b821562f";

async function getApplicationAsset(key: string): Promise<string> {
    return (await ApplicationAssetUtils.fetchAssetIds(DISCORD_APP_ID, [key]))[0];
}

function setActivity(activity: Record<string, any> | null) {
    FluxDispatcher.dispatch({
        type: "LOCAL_ACTIVITY_UPDATE",
        activity,
        socketId: "LastFM"
    });
}

export const settings = definePluginSettings({
    scrobblerBackend: {
        type: OptionType.SELECT,
        description: "The scrobbler backend to use",
        options: [
            { get label() { return s("backendLastfm"); }, value: "lastfm", default: true },
            { get label() { return s("backendListenbrainz"); }, value: "listenbrainz" },
            { get label() { return s("backendCompatible"); }, value: "listenbrainz-compatible" }
        ]
    },
    instanceBaseURL: {
        type: OptionType.STRING,
        description: "The base URL of your ListenBrainz instance",
        placeholder: "https://example.org",
        onChange: invalidateListenBrainzCache,
        hidden() { return this.store.scrobblerBackend !== "listenbrainz-compatible"; }
    },
    instanceAPIBaseUrl: {
        type: OptionType.STRING,
        description: "The base URL of your ListenBrainz API",
        placeholder: "https://api.example.org",
        onChange: invalidateListenBrainzCache,
        hidden() { return this.store.scrobblerBackend !== "listenbrainz-compatible"; }
    },
    apiKey: {
        type: OptionType.STRING,
        description: "Last.fm API key. Not required but highly recommended to avoid rate limiting with the shared key",
        hidden() { return this.store.scrobblerBackend !== "lastfm"; }
    },
    username: {
        type: OptionType.STRING,
        description: "Username"
    },
    shareUsername: {
        type: OptionType.BOOLEAN,
        description: "Show a link to your scrobbler profile",
        default: false
    },
    clickableLinks: {
        type: OptionType.BOOLEAN,
        description: "Make track, artist and album names clickable links",
        default: true
    },
    hideWithSpotify: {
        type: OptionType.BOOLEAN,
        description: "Hide presence if Spotify is running",
        default: true
    },
    hideWithActivity: {
        type: OptionType.BOOLEAN,
        description: "Hide presence if you have any other presence",
        default: false
    },
    statusName: {
        type: OptionType.STRING,
        description: "Custom status text. You can use the following variables: {artist} | {album} | {title}",
        default: "some music"
    },
    statusDisplayType: {
        type: OptionType.SELECT,
        description: "Show the track / artist name in the member list",
        options: [
            { get label() { return s("displayOff"); }, value: "off" },
            { get label() { return s("displayArtist"); }, value: "artist", default: true },
            { get label() { return s("displayTrack"); }, value: "track" }
        ]
    },
    nameFormat: {
        type: OptionType.SELECT,
        description: "Show name of song and artist in status name",
        options: [
            { get label() { return s("formatStatus"); }, value: NameFormat.StatusName, default: true },
            { get label() { return s("formatService"); }, value: NameFormat.ServiceName },
            { get label() { return s("formatArtistFirst"); }, value: NameFormat.ArtistFirst },
            { get label() { return s("formatSongFirst"); }, value: NameFormat.SongFirst },
            { get label() { return s("formatArtist"); }, value: NameFormat.ArtistOnly },
            { get label() { return s("formatSong"); }, value: NameFormat.SongOnly },
            { get label() { return s("formatAlbum"); }, value: NameFormat.AlbumName }
        ]
    },
    useListeningStatus: {
        type: OptionType.BOOLEAN,
        description: "Show \"Listening to\" status instead of \"Playing\"",
        default: false
    },
    missingArt: {
        type: OptionType.SELECT,
        description: "When album or album art is missing",
        options: [
            { get label() { return s("artLogo"); }, value: "logo", default: true },
            { get label() { return s("artPlaceholder"); }, value: "placeholder" }
        ]
    },
    showLogo: {
        type: OptionType.BOOLEAN,
        description: "Show the scrobbler service logo by the album cover",
        default: true
    },
    showAlbumCover: {
        type: OptionType.BOOLEAN,
        description: "Show album cover. Disabling this will display a placeholder. Useful if your music has inappropriate art",
        default: true
    }
});

const hasInvalidCustomInstance = () => settings.store.scrobblerBackend === "listenbrainz-compatible" && (!settings.store.instanceAPIBaseUrl || !settings.store.instanceBaseURL);

function CustomInstanceAboutComponent() {
    const { instanceAPIBaseUrl, instanceBaseURL } = settings.use(["instanceAPIBaseUrl", "instanceBaseURL"]);
    if (instanceAPIBaseUrl && instanceBaseURL) return null;

    return (
        <Card>
            <SubHeading>{s("invalidInstance")}</SubHeading>
            <Text>{s("invalidInstanceHelp")}</Text>
        </Card>
    );
}

function About() {
    const { scrobblerBackend } = settings.use(["scrobblerBackend"]);

    if (scrobblerBackend === "lastfm") {
        return (
            <Card>
                <SubHeading>Last.FM</SubHeading>
                <Text>{s("apiKeyTitle")}</Text>
                <Text muted>{s("apiKeyHelp")}</Text>
                <div style={{ marginTop: 8 }}>
                    <Button variant="secondary" onClick={() => void MajicNative.openExternal("https://www.last.fm/api/account/create")}>
                        {s("createApiKey")}
                    </Button>
                </div>
            </Card>
        );
    }

    if (scrobblerBackend === "listenbrainz-compatible") return <CustomInstanceAboutComponent />;

    return null;
}

export default definePlugin({
    name: "MusicRichPresence",
    description: "Rich Presence for Last.FM / ListenBrainz",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Statut d'activité Last.FM / ListenBrainz",
            options: {
                scrobblerBackend: "Service de scrobbling à utiliser",
                instanceBaseURL: "URL de base de ton instance ListenBrainz",
                instanceAPIBaseUrl: "URL de base de l'API ListenBrainz",
                apiKey: "Clé d'API Last.fm. Facultative mais fortement conseillée pour éviter les limites de la clé partagée",
                username: "Nom d'utilisateur",
                shareUsername: "Afficher un lien vers ton profil",
                clickableLinks: "Rendre le morceau, l'artiste et l'album cliquables",
                hideWithSpotify: "Masquer le statut si Spotify tourne",
                hideWithActivity: "Masquer le statut si tu as une autre activité",
                statusName: "Texte de statut personnalisé. Variables possibles : {artist} | {album} | {title}",
                statusDisplayType: "Afficher le morceau / l'artiste dans la liste des membres",
                nameFormat: "Afficher le titre et l'artiste dans le nom du statut",
                useListeningStatus: "Afficher « Écoute » au lieu de « Joue à »",
                missingArt: "Quand l'album ou sa pochette manque",
                showLogo: "Afficher le logo du service à côté de la pochette",
                showAlbumCover: "Afficher la pochette de l'album. Désactivé, une image générique s'affiche. Pratique si ta musique a des pochettes inappropriées"
            }
        }
    },
    settings,

    settingsAboutComponent: About,

    updateInterval: undefined as ReturnType<typeof setInterval> | undefined,

    start() {
        void this.updatePresence();
        this.updateInterval = setInterval(() => void this.updatePresence(), 16000);
    },

    stop() {
        clearInterval(this.updateInterval);
    },

    async updatePresence() {
        if (!settings.store.username) return;
        if (hasInvalidCustomInstance()) return;

        setActivity(await this.getActivity());
    },

    getLargeImage(track: TrackData): string | undefined {
        if (settings.store.showAlbumCover && track.imageURL && !track.imageURL.includes(LASTFM_PLACEHOLDER_IMAGE_HASH)) return track.imageURL;
        if (settings.store.missingArt === "placeholder") return "placeholder";
    },

    async getActivity(): Promise<Record<string, any> | null> {
        const activities: Array<{ application_id?: string; type: number }> = Stores.PresenceStore.getActivities(Stores.AuthenticationStore.getId());

        if (settings.store.hideWithActivity && activities.some(a => a.application_id !== DISCORD_APP_ID && a.type !== ActivityType.CUSTOM_STATUS)) return null;
        if (settings.store.hideWithSpotify && activities.some(a => a.type === ActivityType.LISTENING && a.application_id !== DISCORD_APP_ID)) return null;

        const scrobbler = settings.store.scrobblerBackend === "lastfm" ? LastFMScrobbler : ListenBrainzScrobbler;

        const trackData = await scrobbler.fetchTrackData();
        if (!trackData) return null;

        const largeImage = this.getLargeImage(trackData);
        const assets: Record<string, string | undefined> = largeImage
            ? {
                large_image: await getApplicationAsset(largeImage),
                large_text: trackData.album || undefined,
                ...(settings.store.showLogo && {
                    small_image: await getApplicationAsset(`${scrobbler.id}-small`),
                    small_text: scrobbler.id
                })
            }
            : {
                large_image: await getApplicationAsset(`${scrobbler.id}-large`),
                large_text: trackData.album || undefined
            };

        const buttons: Array<{ label: string; url: string }> = [];
        if (settings.store.shareUsername) {
            buttons.push({
                label: s("profile", { name: scrobbler.name }),
                url: scrobbler.getUserURL(settings.store.username!)
            });
        }

        const customStatus = () => settings.store.statusName
            .replaceAll("{artist}", trackData.artist || "")
            .replaceAll("{album}", trackData.album || "")
            .replaceAll("{title}", trackData.name || "");

        const statusName = (() => {
            switch (settings.store.nameFormat) {
                case NameFormat.ArtistFirst: return trackData.artist + " - " + trackData.name;
                case NameFormat.SongFirst: return trackData.name + " - " + trackData.artist;
                case NameFormat.ArtistOnly: return trackData.artist;
                case NameFormat.SongOnly: return trackData.name;
                case NameFormat.AlbumName: return trackData.album || customStatus();
                case NameFormat.ServiceName: return trackData.serviceName || customStatus();
                default: return customStatus();
            }
        })();

        const activity: Record<string, any> = {
            application_id: DISCORD_APP_ID,
            name: statusName,
            details: trackData.name,
            state: trackData.artist,
            status_display_type: {
                off: ActivityStatusDisplayType.NAME,
                artist: ActivityStatusDisplayType.STATE,
                track: ActivityStatusDisplayType.DETAILS
            }[settings.store.statusDisplayType as "off" | "artist" | "track"],
            assets,
            buttons: buttons.length ? buttons.map(v => v.label) : undefined,
            metadata: { button_urls: buttons.map(v => v.url) },
            type: settings.store.useListeningStatus ? ActivityType.LISTENING : ActivityType.PLAYING,
            flags: ActivityFlags.INSTANCE
        };

        if (settings.store.clickableLinks) {
            activity.details_url = trackData.trackURL;
            activity.state_url = trackData.artistURL;
            if (trackData.album) activity.assets.large_url = trackData.albumURL;
        }

        return activity;
    }
});
