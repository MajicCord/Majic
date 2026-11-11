/*
 * Majic — SilentTyping plugin
 */

import { ChatBarButton } from "@api/chatButtons";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { findByProps } from "@webpack";
import { DiscordIcon, React, useEffect, useState } from "@webpack/common";

const s = createStrings({
    en: { on: "Typing is hidden", off: "Typing is visible" },
    fr: { on: "Ta frappe est masquée", off: "Ta frappe est visible" }
});

const settings = definePluginSettings({
    hideTyping: {
        type: OptionType.BOOLEAN,
        description: "Hide your typing indicator",
        default: true
    },
    showButton: {
        type: OptionType.BOOLEAN,
        description: "Show a chat bar button to turn it on and off",
        default: true
    },
    alwaysShowIn: {
        type: OptionType.STRING,
        description: "Channel IDs where others still see you typing, separated by commas",
        default: ""
    }
});

const listeners = new Set<(value: boolean) => void>();

function setHidden(value: boolean) {
    settings.store.hideTyping = value;
    listeners.forEach(listener => listener(value));
}

function shouldHide(channelId: string) {
    if (!settings.store.hideTyping) return false;
    const allowed = settings.store.alwaysShowIn.split(",").map(id => id.trim()).filter(Boolean);
    return !allowed.includes(channelId);
}

function TypingButton({ isMainChat }: { isMainChat: boolean }) {
    const [hidden, setHiddenState] = useState(settings.store.hideTyping);

    useEffect(() => {
        listeners.add(setHiddenState);
        return () => void listeners.delete(setHiddenState);
    }, []);

    if (!isMainChat || !settings.store.showButton) return null;

    return (
        <ChatBarButton tooltip={hidden ? s("on") : s("off")} onClick={() => setHidden(!hidden)}>
            <DiscordIcon name="KeyboardIcon" color={hidden ? "var(--majic-accent)" : "currentColor"} />
        </ChatBarButton>
    );
}

let typingActions: { startTyping(channelId: string): void } | undefined;
let originalStartTyping: ((channelId: string) => void) | undefined;

export default definePlugin({
    name: "SilentTyping",
    description: "Hides your \"is typing...\" indicator from other people",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque ton indicateur « est en train d'écrire… » aux autres",
            options: {
                hideTyping: "Masquer ton indicateur de frappe",
                showButton: "Afficher un bouton dans la barre de saisie pour l'activer ou le désactiver",
                alwaysShowIn: "Identifiants des salons où les autres te voient quand même écrire, séparés par des virgules"
            }
        }
    },
    settings,

    chatBarButtons: {
        typing: props => <TypingButton isMainChat={props.isMainChat} />
    },

    start() {
        typingActions = findByProps("startTyping", "stopTyping");
        if (!typingActions) return;
        originalStartTyping = typingActions.startTyping;
        typingActions.startTyping = function (this: unknown, channelId: string) {
            if (shouldHide(channelId)) return;
            return originalStartTyping!.call(this, channelId);
        };
    },

    stop() {
        if (typingActions && originalStartTyping) typingActions.startTyping = originalStartTyping;
    }
});
