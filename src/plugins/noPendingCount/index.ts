/*
 * Majic — NoPendingCount plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { Stores } from "@webpack/common";

const settings = definePluginSettings({
    hideFriendRequests: {
        type: OptionType.BOOLEAN,
        description: "Hide the incoming friend requests count",
        default: true
    },
    hideMessageRequests: {
        type: OptionType.BOOLEAN,
        description: "Hide the message requests count",
        default: true
    }
});

const restores: Array<() => void> = [];

function override(storeName: string, method: string, enabled: () => boolean) {
    const store = Stores[storeName];
    if (typeof store?.[method] !== "function") return;

    const original = store[method];
    store[method] = function (this: unknown, ...args: unknown[]) {
        return enabled() ? 0 : original.apply(this, args);
    };
    store.emitChange?.();
    restores.push(() => {
        store[method] = original;
        store.emitChange?.();
    });
}

export default definePlugin({
    name: "NoPendingCount",
    description: "Hides the red counters for incoming friend requests and message requests",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque les compteurs rouges des demandes d'ami et des demandes de messages",
            options: {
                hideFriendRequests: "Masquer le nombre de demandes d'ami reçues",
                hideMessageRequests: "Masquer le nombre de demandes de messages"
            }
        }
    },
    settings,

    start() {
        override("RelationshipStore", "getPendingCount", () => settings.store.hideFriendRequests);
        override("MessageRequestStore", "getMessageRequestsCount", () => settings.store.hideMessageRequests);
    },

    stop() {
        restores.splice(0).forEach(restore => restore());
    }
});
