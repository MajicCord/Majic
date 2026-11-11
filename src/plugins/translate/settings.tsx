/*
 * Majic — Translate settings
 */

import { definePluginSettings } from "@api/settings";
import { Button } from "@components/ui";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { s } from "./strings";
import { openTranslateModal } from "./TranslateModal";

export const settings = definePluginSettings({
    receivedInput: {
        type: OptionType.STRING,
        description: "Language incoming messages are translated from",
        default: "auto",
        hidden() { return true; }
    },
    receivedOutput: {
        type: OptionType.STRING,
        description: "Language incoming messages are translated to",
        default: "en",
        hidden() { return true; }
    },
    sentInput: {
        type: OptionType.STRING,
        description: "Language your messages are translated from",
        default: "auto",
        hidden() { return true; }
    },
    sentOutput: {
        type: OptionType.STRING,
        description: "Language your messages are translated to",
        default: "en",
        hidden() { return true; }
    },
    service: {
        type: OptionType.SELECT,
        description: "Translation provider",
        options: [
            { get label() { return s("google"); }, value: "google", default: true },
            { get label() { return s("deepl"); }, value: "deepl" },
            { get label() { return s("deeplPro"); }, value: "deepl-pro" },
            { get label() { return s("kagi"); }, value: "kagi" }
        ],
        onChange: () => resetLanguageDefaults()
    },
    deeplApiKey: {
        type: OptionType.STRING,
        description: "Your DeepL API key (from deepl.com/your-account)",
        default: "",
        hidden() { return this.store.service !== "deepl" && this.store.service !== "deepl-pro"; }
    },
    kagiSession: {
        type: OptionType.STRING,
        description: "Your Kagi session token (from kagi.com/settings?p=user_details)",
        default: "",
        hidden() { return this.store.service !== "kagi"; }
    },
    autoTranslate: {
        type: OptionType.BOOLEAN,
        description: "Automatically translate your messages before sending. You can also Shift+click or right-click the translate button to toggle this",
        default: false
    },
    showAutoTranslateTooltip: {
        type: OptionType.BOOLEAN,
        description: "Show a tooltip on the chat bar button when a message is auto-translated",
        default: true
    },
    manageTranslateSettings: {
        type: OptionType.COMPONENT,
        description: "",
        component: () => <Button onClick={openTranslateModal}>{s("customize")}</Button>
    },
    dismissedAutoTranslateAlert: {
        type: OptionType.CUSTOM,
        description: "",
        default: false
    }
});

export function resetLanguageDefaults() {
    if (settings.store.service === "google" || settings.store.service === "kagi") {
        settings.store.receivedInput = "auto";
        settings.store.receivedOutput = "en";
        settings.store.sentInput = "auto";
        settings.store.sentOutput = "en";
    } else {
        settings.store.receivedInput = "";
        settings.store.receivedOutput = "en-us";
        settings.store.sentInput = "";
        settings.store.sentOutput = "en-us";
    }
}
