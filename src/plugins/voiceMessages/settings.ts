/*
 * Majic — VoiceMessages settings
 */

import { definePluginSettings } from "@api/settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    noiseSuppression: {
        type: OptionType.BOOLEAN,
        description: "Noise Suppression",
        default: true
    },
    echoCancellation: {
        type: OptionType.BOOLEAN,
        description: "Echo Cancellation",
        default: true
    }
});
