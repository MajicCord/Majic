/*
 * Majic — ImageFilename plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const ImageExtensionRe = /\.(png|jpg|jpeg|gif|webp|avif)$/i;
const GifHostRegex = /^(.+?\.)?(tenor|giphy|imgur)\.com$/i;

const settings = definePluginSettings({
    showFullUrl: {
        type: OptionType.BOOLEAN,
        description: "Show the full URL of the image instead of just the file name. Always on for GIFs, which usually have no meaningful file name",
        default: false
    }
});

export default definePlugin({
    name: "ImageFilename",
    description: "Shows the file name of images and GIFs as a tooltip when hovering them",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche le nom de fichier des images et GIF en infobulle au survol",
            options: {
                showFullUrl: "Afficher l'URL complète de l'image au lieu du nom de fichier. Toujours actif pour les GIF, qui n'ont souvent pas de nom parlant"
            }
        }
    },
    settings,

    patches: [
        {
            find: ".RESPONSIVE?",
            replacement: {
                match: /(?="data-role":"img","data-safe-src":)(?<=href:(\i).+?)/,
                replace: "title:$self.getTitle($1),"
            }
        }
    ],

    getTitle(src: string) {
        try {
            const url = new URL(src);
            const isGif = GifHostRegex.test(url.hostname);
            if (!isGif && !ImageExtensionRe.test(url.pathname)) return undefined;

            return isGif || settings.store.showFullUrl ? src : url.pathname.split("/").pop();
        } catch {
            return undefined;
        }
    }
});
