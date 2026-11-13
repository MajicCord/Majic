/*
 * Majic — SilentMessageToggle plugin
 */

import { ChatBarButton } from "@api/chatButtons";
import { addMessagePreSendListener, type MessageSendListener, removeMessagePreSendListener } from "@api/messageEvents";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, React, useEffect, useState } from "@webpack/common";

const s = createStrings({
    en: { disable: "Disable Silent Message", enable: "Enable Silent Message" },
    fr: { disable: "Désactiver le message silencieux", enable: "Activer le message silencieux" }
});

let lastState = false;

const settings = definePluginSettings({
    persistState: {
        type: OptionType.BOOLEAN,
        description: "Keep the state of the silent message toggle when changing channels",
        default: false,
        onChange(value: boolean) {
            if (value === false) lastState = false;
        }
    },
    autoDisable: {
        type: OptionType.BOOLEAN,
        description: "Automatically disable the silent message toggle again after sending one",
        default: true
    }
});

function SilentMessageToggle({ isMainChat }: { isMainChat: boolean }) {
    const [enabled, setEnabled] = useState(lastState);

    const setValue = (value: boolean) => {
        if (settings.store.persistState) lastState = value;
        setEnabled(value);
    };

    useEffect(() => {
        const listener: MessageSendListener = (_, message) => {
            if (!enabled) return;
            if (settings.store.autoDisable) setValue(false);
            if (!message.content.startsWith("@silent ")) message.content = "@silent " + message.content;
        };

        addMessagePreSendListener(listener);
        return () => void removeMessagePreSendListener(listener);
    }, [enabled]);

    if (!isMainChat) return null;

    return (
        <ChatBarButton tooltip={enabled ? s("disable") : s("enable")} onClick={() => setValue(!enabled)}>
            <DiscordIcon name={enabled ? "BellSlashIcon" : "BellIcon"} color={enabled ? "var(--majic-accent)" : "currentColor"} />
        </ChatBarButton>
    );
}

export default definePlugin({
    name: "SilentMessageToggle",
    description: "Adds a button to the chat bar to toggle sending a silent message",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton à la barre de saisie pour envoyer un message silencieux",
            options: {
                persistState: "Garder l'état du bouton en changeant de salon",
                autoDisable: "Désactiver automatiquement le message silencieux après en avoir envoyé un"
            }
        }
    },
    settings,

    chatBarButtons: {
        silent: props => <SilentMessageToggle isMainChat={props.isMainChat} />
    }
});
