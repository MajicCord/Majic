/*
 * Majic — SilentTyping plugin
 */

import { ChatBarButton } from "@api/chatButtons";
import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/commands";
import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, FluxDispatcher, React, useEffect, useState } from "@webpack/common";

const s = createStrings({
    en: {
        on: "Disable silent typing",
        off: "Enable silent typing",
        menu: "Silent typing",
        commandDescription: "Turn silent typing on or off",
        valueDescription: "Whether to hide that you are typing",
        enabled: "Silent typing enabled",
        disabled: "Silent typing disabled"
    },
    fr: {
        on: "Désactiver la frappe silencieuse",
        off: "Activer la frappe silencieuse",
        menu: "Frappe silencieuse",
        commandDescription: "Active ou désactive la frappe silencieuse",
        valueDescription: "Masquer ou non que tu écris",
        enabled: "Frappe silencieuse activée",
        disabled: "Frappe silencieuse désactivée"
    }
});

const settings = definePluginSettings({
    isEnabled: {
        type: OptionType.BOOLEAN,
        description: "Hide that you are typing",
        default: true
    },
    showIcon: {
        type: OptionType.BOOLEAN,
        description: "Show a chat bar button to turn it on and off",
        default: false,
        restartNeeded: true
    },
    contextMenu: {
        type: OptionType.BOOLEAN,
        description: "Add a toggle to the chat input context menu",
        default: true
    },
    showTypingIn: {
        type: OptionType.STRING,
        description: "Channel IDs where others still see you typing, separated by commas",
        default: ""
    }
});

const listeners = new Set<() => void>();

function setEnabled(value: boolean) {
    settings.store.isEnabled = value;
    listeners.forEach(listener => listener());
}

function useEnabled() {
    const [, rerender] = useState(0);
    useEffect(() => {
        const listener = () => rerender(n => n + 1);
        listeners.add(listener);
        return () => void listeners.delete(listener);
    }, []);
    return settings.store.isEnabled;
}

function TypingButton({ isMainChat }: { isMainChat: boolean }) {
    const enabled = useEnabled();
    if (!isMainChat || !settings.store.showIcon) return null;

    return (
        <ChatBarButton tooltip={enabled ? s("on") : s("off")} onClick={() => setEnabled(!enabled)}>
            <DiscordIcon name="KeyboardIcon" color={enabled ? "var(--majic-accent)" : "currentColor"} />
        </ChatBarButton>
    );
}

export default definePlugin({
    name: "SilentTyping",
    description: "Hides your \"is typing...\" indicator from other people",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Masque ton indicateur « est en train d'écrire… » aux autres",
            options: {
                isEnabled: "Masquer que tu écris",
                showIcon: "Afficher un bouton dans la barre de saisie pour l'activer ou le désactiver",
                contextMenu: "Ajouter une case à cocher au menu clic droit de la zone de saisie",
                showTypingIn: "Identifiants des salons où les autres te voient quand même écrire, séparés par des virgules"
            }
        }
    },
    settings,

    patches: [
        {
            find: '.dispatch({type:"TYPING_START_LOCAL"',
            replacement: {
                match: /startTyping\(\i\){.+?},stop/,
                replace: "startTyping:$self.startTyping,stop"
            }
        }
    ],

    commands: [
        {
            name: "silenttype",
            get description() {
                return s("commandDescription");
            },
            options: [{
                name: "value",
                get description() {
                    return s("valueDescription");
                },
                type: ApplicationCommandOptionType.BOOLEAN
            }],
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(args, { channel }) {
                setEnabled(Boolean(findOption(args, "value", !settings.store.isEnabled)));
                sendBotMessage(channel.id, { content: settings.store.isEnabled ? s("enabled") : s("disabled"), author: { username: "Majic" } });
            }
        }
    ],

    chatBarButtons: {
        typing: props => <TypingButton isMainChat={props.isMainChat} />
    },

    contextMenus: {
        "textarea-context"(children) {
            if (!settings.store.contextMenu || !Menu.MenuCheckboxItem) return;
            const group = findGroupChildrenByChildId("submit-button", children);
            if (!group) return;

            const index = group.findIndex(child => child?.props?.id === "submit-button");
            group.splice(index + 1, 0,
                <Menu.MenuCheckboxItem
                    id="majic-silent-typing"
                    label={s("menu")}
                    checked={settings.store.isEnabled}
                    action={() => setEnabled(!settings.store.isEnabled)}
                />
            );
        }
    },

    startTyping(channelId: string) {
        const exceptions = settings.store.showTypingIn.split(",").map(id => id.trim()).filter(Boolean);
        if (settings.store.isEnabled && !exceptions.includes(channelId)) return;
        FluxDispatcher.dispatch({ type: "TYPING_START_LOCAL", channelId });
    }
});
