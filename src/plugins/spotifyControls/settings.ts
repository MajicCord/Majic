/*
 * Majic — SpotifyControls settings
 */

import { definePluginSettings } from "@api/settings";
import { disableStyle, enableStyle } from "@api/styles";
import { createStrings } from "@i18n";
import { OptionType } from "@utils/types";

export const s = createStrings({
    en: {
        menu: "Spotify {type} Menu",
        copyName: "Copy {type} Name",
        copyLink: "Copy {type} Link",
        openIn: "Open {type} in Spotify",
        song: "Song",
        artist: "Artist",
        album: "Album",
        albumMenu: "Spotify Album Menu",
        openAlbum: "Open Album",
        viewCover: "View Album Cover",
        volume: "Volume",
        progress: "Progress",
        totalDuration: "Total Duration",
        albumImage: "Album Image",
        by: "by",
        on: "on",
        failed: "Failed to render the Spotify player",
        checkConsole: "Check the console for errors",
        shuffle: "Shuffle",
        previous: "Previous",
        play: "Play",
        pause: "Pause",
        next: "Next",
        repeat: "Repeat"
    },
    fr: {
        menu: "Menu Spotify ({type})",
        copyName: "Copier le nom ({type})",
        copyLink: "Copier le lien ({type})",
        openIn: "Ouvrir dans Spotify ({type})",
        song: "titre",
        artist: "artiste",
        album: "album",
        albumMenu: "Menu de l'album Spotify",
        openAlbum: "Ouvrir l'album",
        viewCover: "Voir la pochette",
        volume: "Volume",
        progress: "Progression",
        totalDuration: "Durée totale",
        albumImage: "Pochette de l'album",
        by: "par",
        on: "sur",
        failed: "Impossible d'afficher le lecteur Spotify",
        checkConsole: "Regarde la console pour les erreurs",
        shuffle: "Aléatoire",
        previous: "Précédent",
        play: "Lecture",
        pause: "Pause",
        next: "Suivant",
        repeat: "Répéter"
    }
});

const HOVER_ONLY_STYLE = [
    ".majic-spotify-button-row { height: 0; opacity: 0; pointer-events: none; transition: 0.2s; transition-property: height; }",
    "#majic-spotify-player:hover .majic-spotify-button-row { opacity: 1; height: 32px; pointer-events: auto; transition-property: height, opacity; }"
].join(" ");

export function toggleHoverControls(value: boolean) {
    if (value) enableStyle("spotify-controls-hover", HOVER_ONLY_STYLE);
    else disableStyle("spotify-controls-hover");
}

export const settings = definePluginSettings({
    hoverControls: {
        type: OptionType.BOOLEAN,
        description: "Show controls on hover",
        default: false,
        onChange: (v: boolean) => toggleHoverControls(v)
    },
    useSpotifyUris: {
        type: OptionType.BOOLEAN,
        description: "Open Spotify URIs instead of Spotify URLs. Only works if Spotify is installed, and might not work on all platforms",
        default: false
    },
    previousButtonRestartsTrack: {
        type: OptionType.BOOLEAN,
        description: "Restart the current track when pressing previous if it has played for more than 3s",
        default: true
    }
});
