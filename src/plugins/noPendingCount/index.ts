/*
 * Majic — NoPendingCount plugin
 */

import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { Stores } from "@webpack/common";

const settings = definePluginSettings({
    hideFriendRequestsCount: {
        type: OptionType.BOOLEAN,
        description: "Hide the incoming friend requests count",
        default: true,
        restartNeeded: true
    },
    hideMessageRequestsCount: {
        type: OptionType.BOOLEAN,
        description: "Hide the message requests count",
        default: true,
        restartNeeded: true
    },
    hidePremiumOffersCount: {
        type: OptionType.BOOLEAN,
        description: "Hide the Nitro offers count",
        default: true,
        restartNeeded: true
    }
});

export default definePlugin({
    name: "NoPendingCount",
    description: "Hides the red counters for friend requests, message requests and Nitro offers",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque les compteurs rouges des demandes d'ami, des demandes de messages et des offres Nitro",
            options: {
                hideFriendRequestsCount: "Masquer le nombre de demandes d'ami reçues",
                hideMessageRequestsCount: "Masquer le nombre de demandes de messages",
                hidePremiumOffersCount: "Masquer le nombre d'offres Nitro"
            }
        }
    },
    settings,

    patches: [
        {
            find: "getPendingCount(){",
            predicate: () => settings.store.hideFriendRequestsCount,
            replacement: {
                match: /(?<=getPendingCount\(\)\{)/,
                replace: "return 0;"
            }
        },
        {
            find: "getMessageRequestsCount(){",
            predicate: () => settings.store.hideMessageRequestsCount,
            replacement: {
                match: /(?<=getMessageRequestsCount\(\)\{)/,
                replace: "return 0;"
            }
        },
        {
            find: ".getSpamChannelsCount();return",
            predicate: () => settings.store.hideMessageRequestsCount,
            replacement: {
                match: /(?<=getSpamChannelsCount\(\);return )\i\.getMessageRequestsCount\(\)/,
                replace: "$self.getRealMessageRequestCount()"
            }
        },
        {
            find: "showProgressBadge:",
            predicate: () => settings.store.hidePremiumOffersCount,
            replacement: {
                match: /(\{unviewedTrialCount:(\i),unviewedDiscountCount:(\i)\}.+?)\2\+\3/,
                replace: (_, rest) => `${rest}0`
            }
        }
    ],

    getRealMessageRequestCount() {
        return Stores.MessageRequestStore.getMessageRequestChannelIds().size;
    }
});
