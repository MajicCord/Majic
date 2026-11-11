/*
 * Majic — AutoDNDWhilePlaying plugin
 */

import { definePluginSettings } from "@api/settings";
import { getUserSettingLazy } from "@api/userSettings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { Stores } from "@webpack/common";

const s = createStrings({
    en: { online: "Online", idle: "Idle", dnd: "Do Not Disturb", invisible: "Invisible" },
    fr: { online: "En ligne", idle: "Inactif", dnd: "Ne pas déranger", invisible: "Invisible" }
});

let savedStatus: string | null = null;
let lastStatus: string | null = null;

const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const settings = definePluginSettings({
    statusToSet: {
        type: OptionType.SELECT,
        description: "Status to set while playing a game",
        options: [
            { get label() { return s("online"); }, value: "online" },
            { get label() { return s("idle"); }, value: "idle" },
            { get label() { return s("dnd"); }, value: "dnd", default: true },
            { get label() { return s("invisible"); }, value: "invisible" }
        ]
    }
});

function handleUserSettingsChange() {
    const status = StatusSettings.getSetting();
    if (status !== lastStatus) {
        lastStatus = status;
        savedStatus = null;
    }
}

async function setStatus(status: string) {
    lastStatus = status;
    await StatusSettings.updateSetting(status);
}

export default definePlugin({
    name: "AutoDNDWhilePlaying",
    description: "Automatically updates your status (online, idle, do not disturb) when you launch a game",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Change automatiquement ton statut (en ligne, inactif, ne pas déranger) quand tu lances un jeu",
            options: {
                statusToSet: "Statut à mettre pendant que tu joues"
            }
        }
    },
    settings,

    flux: {
        async RUNNING_GAMES_CHANGE({ games }: { games: unknown[] }) {
            const status = StatusSettings.getSetting();
            const target = String(settings.store.statusToSet);

            if (games.length > 0) {
                if (status !== target && status !== "invisible") {
                    savedStatus = status;
                    await setStatus(target);
                }
            } else if (savedStatus) {
                const toRestore = savedStatus;
                savedStatus = null;
                if (status !== toRestore) await setStatus(toRestore);
            }
        }
    },

    start() {
        lastStatus = StatusSettings.getSetting();
        Stores.UserSettingsProtoStore.addChangeListener(handleUserSettingsChange);
    },

    stop() {
        Stores.UserSettingsProtoStore.removeChangeListener(handleUserSettingsChange);
    }
});
