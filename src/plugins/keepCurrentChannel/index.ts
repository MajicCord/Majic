/*
 * Majic — KeepCurrentChannel plugin
 */

import { DataStore } from "@api/dataStore";
import { definePlugin } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { Stores } from "@webpack/common";

interface PreviousChannel {
    guildId: string | null;
    channelId: string | null;
}

const KEY = "KeepCurrentChannel_previousData";

const NavigationRouter = mapMangledModuleLazy("transitionTo - Transitioning to", {
    transitionTo: filters.byCode("transitionTo -"),
    transitionToGuild: filters.byCode("transitionToGuild -"),
    back: filters.byCode("goBack()"),
    forward: filters.byCode("goForward()")
});

const ChannelRouter = mapMangledModuleLazy('"Thread must have a parent ID."', {
    transitionToChannel: filters.byCode(".openTextInVoiceIfVoiceChannel"),
    transitionToThread: filters.byCode('"Thread must have a parent ID."')
});

let isSwitchingAccount = false;
let previousCache: PreviousChannel | undefined;

export default definePlugin({
    name: "KeepCurrentChannel",
    description: "Tries to go back to the channel you were in before switching accounts or loading Discord",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Essaie de revenir au salon où tu étais avant de changer de compte ou de relancer Discord"
        }
    },

    patches: [
        {
            find: '"Switching accounts"',
            replacement: {
                match: /goHomeAfterSwitching:\i/,
                replace: "goHomeAfterSwitching:!1"
            }
        }
    ],

    flux: {
        LOGOUT(event: { isSwitchingAccount: boolean }) {
            ({ isSwitchingAccount } = event);
        },

        CONNECTION_OPEN() {
            if (!isSwitchingAccount) return;
            isSwitchingAccount = false;

            if (previousCache?.channelId) {
                if (Stores.ChannelStore.hasChannel(previousCache.channelId)) {
                    ChannelRouter.transitionToChannel(previousCache.channelId);
                } else {
                    NavigationRouter.transitionToGuild("@me");
                }
            }
        },

        async CHANNEL_SELECT({ guildId, channelId }: { guildId: string | null; channelId: string | null }) {
            if (isSwitchingAccount) return;

            previousCache = { guildId, channelId };
            await DataStore.set(KEY, previousCache);
        }
    },

    async start() {
        previousCache = await DataStore.get<PreviousChannel>(KEY);
        if (!previousCache) {
            previousCache = {
                guildId: Stores.SelectedGuildStore.getGuildId(),
                channelId: Stores.SelectedChannelStore.getChannelId() ?? null
            };
            await DataStore.set(KEY, previousCache);
        } else if (previousCache.channelId) {
            ChannelRouter.transitionToChannel(previousCache.channelId);
        }
    }
});
