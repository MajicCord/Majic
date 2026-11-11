/*
 * Majic — NoMosaic plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";

const settings = definePluginSettings({
    inlineVideo: {
        type: OptionType.BOOLEAN,
        description: "Play videos without the carousel modal",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoMosaic",
    description: "Removes Discord's image mosaic",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Supprime la mosaïque d'images de Discord",
            options: {
                inlineVideo: "Lire les vidéos sans ouvrir le carrousel"
            }
        }
    },
    settings,

    patches: [
        {
            find: '"PLAINTEXT_PREVIEW":"OTHER"',
            replacement: {
                match: /"IMAGE"===\i\|\|"VIDEO"===\i\|\|"CLIP"===\i/,
                replace: "(false)"
            }
        },
        {
            find: "return{visualMediaItems:",
            replacement: {
                match: /return{visualMediaItems:.+?props:(\i)(?=.{0,20}?\1\.item\.uniqueId)/,
                replace: '$&,useFullWidth:["IMAGE","VIDEO","CLIP"].includes($1.item?.type)?false:undefined'
            }
        },
        {
            find: "renderAttachments(",
            predicate: () => settings.store.inlineVideo,
            replacement: {
                match: /url:(\i)\.url\}\);return /,
                replace: "$&$1.content_type?.startsWith('image/')&&"
            }
        }
    ]
});
