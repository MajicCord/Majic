/*
 * Majic — SpotifyShareCommands plugin
 */

import { ApplicationCommandInputType, findOption, type MajicCommand, OptionalMessageOption, sendBotMessage } from "@api/commands";
import { createStrings } from "@i18n";
import { sendMessageAsReply } from "@utils/discord";
import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";

const s = createStrings({
    en: {
        description: "Share the Spotify {kind} you are listening to",
        notListening: "You are not listening to anything on Spotify.",
        notFound: "Could not find this track on Spotify."
    },
    fr: {
        description: "Partage le {kind} Spotify que tu écoutes",
        notListening: "Tu n'écoutes rien sur Spotify.",
        notFound: "Impossible de trouver ce morceau sur Spotify."
    }
});

interface SpotifyTrack {
    id: string | null;
    album: { id: string };
    artists: Array<{ external_urls: { spotify: string } }>;
}

function shareCommand(name: string, link: (track: SpotifyTrack) => string): MajicCommand {
    return {
        name,
        get description() {
            return s("description", { kind: name });
        },
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [OptionalMessageOption],
        execute(args, { channel }) {
            const track: SpotifyTrack | undefined = Stores.SpotifyStore?.getTrack();
            if (!track) return sendBotMessage(channel.id, { content: s("notListening"), author: { username: "Majic" } });
            if (track.id == null) return sendBotMessage(channel.id, { content: s("notFound"), author: { username: "Majic" } });

            const url = link(track);
            const message = findOption<string>(args, "message");
            void sendMessageAsReply(channel.id, message ? `${message} ${url}` : url);
        }
    };
}

export default definePlugin({
    name: "SpotifyShareCommands",
    description: "Share your current Spotify track, album or artist with /track, /album and /artist",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Partage le morceau, l'album ou l'artiste Spotify que tu écoutes avec /track, /album et /artist"
        }
    },

    commands: [
        shareCommand("track", track => `https://open.spotify.com/track/${track.id}`),
        shareCommand("album", track => `https://open.spotify.com/album/${track.album.id}`),
        shareCommand("artist", track => track.artists[0].external_urls.spotify)
    ]
});
