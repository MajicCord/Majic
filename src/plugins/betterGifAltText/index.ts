/*
 * Majic — BetterGifAltText plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "BetterGifAltText",
    description: "Changes GIF alt text from just \"GIF\" to include the GIF's tags or file name",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Remplace le texte alternatif « GIF » des GIF par leurs tags ou leur nom de fichier"
        }
    },

    patches: [
        {
            find: ".modalContext})};",
            replacement: {
                match: /(return.{0,10}\.jsx.{0,50}isWindowFocused)/,
                replace: "$self.altify(e);$1"
            }
        },
        {
            find: "#{intl::GIF}",
            replacement: {
                match: /alt:(\i)=(\i\.\i\.string\(\i\.\i#{intl::GIF}\))(?=,[^}]*\}=(\i))/,
                replace: "alt_$$:$1=$self.altify($3)||$2"
            }
        }
    ],

    altify(props: any) {
        if (props.contentType && props.contentType !== "image/gif") return props.alt;

        props.alt ??= "GIF";
        if (props.alt !== "GIF") return props.alt;

        let url: string = props.original || props.src;
        try {
            url = decodeURI(url);
        } catch { }

        let name = url
            .slice(url.lastIndexOf("/") + 1)
            .replace(/\d/g, "")
            .replace(/.gif$/, "")
            .split(/[,\-_ ]+/g)
            .slice(0, 20)
            .join(" ");
        if (name.length > 300) name = name.slice(0, 300) + "...";

        if (name) props.alt += ` - ${name}`;
        return props.alt;
    }
});
