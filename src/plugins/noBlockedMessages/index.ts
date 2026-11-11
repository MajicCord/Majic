/*
 * Majic — NoBlockedMessages plugin
 */

import { definePluginSettings } from "@api/settings";
import { runtimeHashMessageKey } from "@utils/intlHash";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { i18n, Stores } from "@webpack/common";

const logger = new Logger("NoBlockedMessages", "#ff5555");

const settings = definePluginSettings({
    ignoreMessages: {
        type: OptionType.BOOLEAN,
        description: "Completely ignore incoming messages from blocked (and ignored, if enabled) users",
        default: false,
        restartNeeded: true
    },
    applyToIgnoredUsers: {
        type: OptionType.BOOLEAN,
        description: "Also apply to ignored users",
        default: true
    }
});

export default definePlugin({
    name: "NoBlockedMessages",
    description: "Completely hides messages from blocked and ignored users in chat",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque complètement les messages des utilisateurs bloqués et ignorés dans le chat",
            options: {
                ignoreMessages: "Ignorer complètement les messages reçus des utilisateurs bloqués (et ignorés, si activé)",
                applyToIgnoredUsers: "S'appliquer aussi aux utilisateurs ignorés"
            }
        }
    },
    settings,

    patches: [
        {
            find: ".__invalid_blocked,",
            replacement: {
                match: /let{messages:\i,[^}]*?canUncollapse[^}]*}/,
                replace: "if($self.shouldHide(arguments[0]))return null;$&"
            }
        },
        {
            find: '"MessageStore"',
            predicate: () => settings.store.ignoreMessages,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: (_: string, props: string) => `if($self.shouldIgnoreMessage(${props}.message))return;`
            }
        },
        {
            find: '"ReadStateStore"',
            predicate: () => settings.store.ignoreMessages,
            replacement: {
                match: /(?<=MESSAGE_CREATE:function\((\i)\){)/,
                replace: (_: string, props: string) => `if($self.shouldIgnoreMessage(${props}.message))return;`
            }
        }
    ],

    shouldIgnoreUser(userId: string) {
        try {
            const { RelationshipStore } = Stores;
            return RelationshipStore.isBlocked(userId) || (settings.store.applyToIgnoredUsers && RelationshipStore.isIgnored(userId));
        } catch (err) {
            logger.error("Failed to check if user is blocked or ignored", err);
            return false;
        }
    },

    shouldIgnoreMessage(message: { author?: { id: string } }) {
        return this.shouldIgnoreUser(message?.author?.id as string);
    },

    shouldHide(props: { collapsedReason?: () => unknown }): boolean {
        try {
            const collapsedReason = props.collapsedReason?.();
            const is = (key: string) => collapsedReason === i18n.t[runtimeHashMessageKey(key)]();

            return is("BLOCKED_MESSAGE_COUNT") || (settings.store.applyToIgnoredUsers && is("IGNORED_MESSAGE_COUNT"));
        } catch (err) {
            logger.error("Failed to check if message should be hidden", err);
            return false;
        }
    }
});
