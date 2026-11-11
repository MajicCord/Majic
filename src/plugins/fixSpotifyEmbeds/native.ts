/*
 * Majic — FixSpotifyEmbeds native
 */

import { RendererSettings } from "@main/settings";
import { app, type WebFrameMain, webFrameMain } from "electron";

const ids: Array<{ routingId: number; processId: number }> = [];

function cleanUpAndGetSpotifyFrames() {
    const spotifyFrames: WebFrameMain[] = [];
    for (let i = ids.length - 1; i >= 0; i--) {
        const { processId, routingId } = ids[i];
        const frame = webFrameMain.fromId(processId, routingId);
        if (!frame) {
            ids.splice(i, 1);
            continue;
        }
        spotifyFrames.push(frame);
    }
    return spotifyFrames;
}

app.on("browser-window-created", (_, win) => {
    win.webContents.on("frame-created", (_, { frame }) => {
        frame?.once("dom-ready", () => {
            if (!frame.url.startsWith("https://open.spotify.com/embed/")) return;

            cleanUpAndGetSpotifyFrames();
            ids.push({ routingId: frame.routingId, processId: frame.processId });

            const settings = RendererSettings.store.plugins?.FixSpotifyEmbeds;
            if (!settings?.enabled) return;

            frame.executeJavaScript(`
                globalThis._majicVolume = ${(settings.volume ?? 10) / 100};
                const original = Audio.prototype.play;
                Audio.prototype.play = function() {
                    this.volume = _majicVolume;
                    return original.apply(this, arguments);
                }
            `);
        });
    });
});

RendererSettings.addChangeListener("plugins.FixSpotifyEmbeds.volume", newVolume => {
    try {
        cleanUpAndGetSpotifyFrames().forEach(frame => frame.executeJavaScript(`globalThis._majicVolume = ${newVolume / 100}`));
    } catch (err) {
        console.error("[Majic] FixSpotifyEmbeds: failed to update volume", err);
    }
});
