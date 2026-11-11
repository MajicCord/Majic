/*
 * Majic — ThemeAttributes plugin
 */

import { Logger } from "@utils/logger";
import { definePlugin } from "@utils/types";
import { Stores } from "@webpack/common";

const logger = new Logger("ThemeAttributes", "#ff79c6");

export default definePlugin({
    name: "ThemeAttributes",
    description: "Adds data attributes to various elements for theming",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute des attributs de données à divers éléments pour les thèmes"
        }
    },

    patches: [
        {
            find: ".tabBarRef",
            replacement: {
                match: /style:this\.getStyle\(\),role:\i/,
                replace: "$&,'data-tab-id':this?.props?.id"
            }
        },
        {
            find: "Message must not be a thread starter message",
            replacement: {
                match: /"aria-setsize":-1,(?=.{0,150}?#{intl::MESSAGE_A11Y_ROLE_DESCRIPTION})/,
                replace: "...$self.getMessageProps(arguments[0]),$&"
            }
        },
        {
            find: "#{intl::LABEL_WITH_ONLINE_STATUS}",
            replacement: {
                match: /src:(\i)\?\?void 0.{1,50}"aria-hidden":!0/,
                replace: "$&,style:$self.getAvatarStyles($1)"
            }
        },
        {
            find: "showCommunicationDisabledStyles",
            replacement: {
                match: /src:(\i),"aria-hidden":!0/,
                replace: "$&,style:$self.getAvatarStyles($1)"
            }
        }
    ],

    getAvatarStyles(src: string | null) {
        if (typeof src !== "string" || src.startsWith("data:")) return {};

        return Object.fromEntries(
            [128, 256, 512, 1024, 2048, 4096].map(size => [
                `--avatar-url-${size}`,
                `url(${src.replace(/\d+$/, String(size))})`
            ])
        );
    },

    getMessageProps(props: { message?: { author?: { id: string; username: string } } }) {
        try {
            const author = props.message?.author;
            const authorId = author?.id;
            return {
                "data-author-id": authorId,
                "data-author-username": author?.username,
                "data-is-self": authorId && authorId === Stores.UserStore.getCurrentUser()?.id
            };
        } catch (err) {
            logger.error("Error in getMessageProps", err);
            return {};
        }
    }
});
