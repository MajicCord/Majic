/*
 * Majic — NoOnboardingDelay plugin
 */

import { definePlugin } from "@utils/types";

export default definePlugin({
    name: "NoOnboardingDelay",
    description: "Skips the slow server onboarding delay",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Supprime l'attente pendant l'accueil des nouveaux serveurs"
        }
    },

    patches: [
        {
            find: "#{intl::ONBOARDING_COVER_WELCOME_SUBTITLE}",
            replacement: {
                match: "3e3",
                replace: "0"
            }
        }
    ]
});
