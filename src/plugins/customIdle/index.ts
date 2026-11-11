/*
 * Majic — CustomIdle plugin
 */

import { dismissNotice, isNoticeShownOrQueued, showNotice } from "@api/notices";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, makeRange, OptionType } from "@utils/types";
import { FluxDispatcher } from "@webpack/common";

const s = createStrings({
    en: {
        backOnline: "Welcome back! Click the button to go online. Click the X to stay idle until reload.",
        exitIdle: "Exit idle"
    },
    fr: {
        backOnline: "Te revoilà ! Clique sur le bouton pour repasser en ligne. Clique sur la croix pour rester inactif jusqu'au rechargement.",
        exitIdle: "Repasser en ligne"
    }
});

const settings = definePluginSettings({
    idleTimeout: {
        type: OptionType.SLIDER,
        description: "Minutes before Discord goes idle (0 to disable auto-idle)",
        markers: makeRange(0, 60, 5),
        default: 10,
        stickToMarkers: false,
        restartNeeded: true
    },
    remainInIdle: {
        type: OptionType.BOOLEAN,
        description: "When you come back to Discord, stay idle until you confirm you want to go online",
        default: true
    }
});

export default definePlugin({
    name: "CustomIdle",
    description: "Sets the time before Discord goes idle, or disables auto-idle",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Règle le délai avant que Discord passe en inactif, ou désactive l'inactivité automatique",
            options: {
                idleTimeout: "Minutes avant que Discord passe en inactif (0 pour désactiver)",
                remainInIdle: "À ton retour sur Discord, rester inactif jusqu'à ce que tu confirmes vouloir repasser en ligne"
            }
        }
    },
    settings,

    patches: [
        {
            find: 'type:"IDLE",idle:',
            replacement: [
                {
                    match: /(?<=Date\.now\(\)-\i>)(?:\i\.\i|6e5)\|\|/,
                    replace: "$self.getIdleTimeout()||"
                },
                {
                    match: /Math\.min\((\i\*\i\.\i\.\i\.SECOND),(?:\i\.\i|6e5)\)/,
                    replace: "$1"
                },
                {
                    match: /\i\.\i\.dispatch\({type:"IDLE",idle:!1}\)/,
                    replace: "$self.handleOnline()"
                }
            ]
        }
    ],

    handleOnline() {
        if (!settings.store.remainInIdle) {
            FluxDispatcher.dispatch({ type: "IDLE", idle: false });
            return;
        }

        const message = s("backOnline");
        if (isNoticeShownOrQueued(message)) return;

        showNotice({
            message,
            buttonText: s("exitIdle"),
            onButtonClick() {
                dismissNotice();
                FluxDispatcher.dispatch({ type: "IDLE", idle: false });
            }
        });
    },

    getIdleTimeout() {
        const { idleTimeout } = settings.store;
        return idleTimeout === 0 ? Infinity : idleTimeout * 60000;
    }
});
