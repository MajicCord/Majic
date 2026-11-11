/*
 * Majic — NoDevtoolsWarning plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoDevtoolsWarning",
    description: "Removes the big \"Hold up!\" warning from the console and stops Discord from hiding your token when DevTools are open",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Supprime le gros avertissement « Attends ! » de la console et empêche Discord de cacher ton token quand les DevTools sont ouverts"
        }
    },

    patches: [
        {
            find: "setDevtoolsCallbacks",
            replacement: {
                match: /if\(null==\i\|\|"0\.0\.0"!==\i\.app\.getVersion\(\)\)/,
                replace: "if(!0)"
            }
        }
    ]
});
