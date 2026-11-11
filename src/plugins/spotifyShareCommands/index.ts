/*
 * Majic — SpotifyShareCommands plugin
 */

import { ApplicationCommandOptionType, findOption, type MajicCommand } from "@api/commands";
import { definePlugin } from "@utils/types";
import { showToast, Stores } from "@webpack/common";

interface SpotifyTrack {
    id: string | null;
    album: { id: string };
    artists: Array<{ external_urls: { spotify: string } }>;
}

function shareCommand(name: string, link: (track: SpotifyTrack) => string | undefined): MajicCommand {
    return {
        name,
        description: `Share the Spotify ${name} you are listening to`,
        options: [{ name: "message", description: "Text to send with the link", type: ApplicationCommandOptionType.STRING }],
        execute(args) {
            const track: SpotifyTrack | undefined = Stores.SpotifyStore?.getTrack();
            const url = track?.id ? link(track) : undefined;
            if (!url) {
                showToast({ text: "You are not listening to anything on Spotify", variant: "critical" });
                return;
            }

            const message = findOption<string>(args, "message");
            return { content: message ? `${message} ${url}` : url };
        }
    };
}

export default definePlugin({
    name: "SpotifyShareCommands",
    description: "Share your current Spotify track, album or artist with /track, /album and /artist",
    authors: [{ name: "SnailyStudios" }],

    commands: [
        shareCommand("track", track => `https://open.spotify.com/track/${track.id}`),
        shareCommand("album", track => `https://open.spotify.com/album/${track.album.id}`),
        shareCommand("artist", track => track.artists[0]?.external_urls.spotify)
    ]
});
