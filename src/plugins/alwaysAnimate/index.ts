/*
 * Majic — AlwaysAnimate plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "AlwaysAnimate",
    description: "Animates anything that can be animated",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Anime tout ce qui peut l'être"
        }
    },

    patches: [
        {
            find: "canAnimate:",
            all: true,
            noWarn: true,
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (m: string, rest: string) => {
                    if (/}=.+/.test(rest)) return m;
                    return `canAnimate:!0${rest}`;
                }
            }
        },
        {
            find: "#{intl::GUILD_OWNER}),children:",
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!0"
            }
        },
        {
            find: "#{intl::DISCOVERABLE_GUILD_HEADER_PUBLIC_INFO}",
            replacement: {
                match: /(guildBanner:\i,animate:)\i(?=}\):null)/,
                replace: "$1!0"
            }
        },
        {
            find: "=!1,contentOnly:",
            replacement: {
                match: /animate:\i/,
                replace: "animate:!0"
            }
        },
        {
            find: ".roleStyle);",
            replacement: {
                match: /,animateGradient:/,
                replace: ",animateGradient:!0,_oldAnimateGradient:"
            }
        },
        {
            find: ".MINI_PREVIEW,[",
            replacement: {
                match: /animate:\i,loop:(?=!0===)/,
                replace: "animate:true,loop:true,_loop:"
            }
        }
    ]
});
