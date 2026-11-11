/*
 * Majic — SilentMessageToggle plugin
 */

import { ChatBarButton } from "@api/chatButtons";
import { definePluginSettings } from "@api/settings";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, React, useEffect, useState } from "@webpack/common";

const settings = definePluginSettings({
    keepAcrossChannels: {
        type: OptionType.BOOLEAN,
        description: "Keep silent mode on when switching channels",
        default: false
    },
    turnOffAfterSending: {
        type: OptionType.BOOLEAN,
        description: "Turn silent mode off after sending a message",
        default: true
    }
});

let silent = false;
const listeners = new Set<(value: boolean) => void>();

function setSilent(value: boolean) {
    silent = value;
    listeners.forEach(listener => listener(value));
}

function SilentButton({ isMainChat }: { isMainChat: boolean }) {
    const [enabled, setEnabled] = useState(silent);

    useEffect(() => {
        if (!settings.store.keepAcrossChannels) setSilent(false);
        listeners.add(setEnabled);
        return () => void listeners.delete(setEnabled);
    }, []);

    if (!isMainChat) return null;

    return (
        <ChatBarButton tooltip={enabled ? "Silent mode on" : "Send silently"} onClick={() => setSilent(!enabled)}>
            <DiscordIcon name={enabled ? "BellSlashIcon" : "BellIcon"} color={enabled ? "var(--majic-accent)" : "currentColor"} />
        </ChatBarButton>
    );
}

export default definePlugin({
    name: "SilentMessageToggle",
    description: "Adds a chat bar button to send messages without notifying anyone",
    authors: [{ name: "SnailyStudios" }],
    settings,

    chatBarButtons: {
        silent: props => <SilentButton isMainChat={props.isMainChat} />
    },

    onBeforeMessageSend(_, message) {
        if (!silent) return;
        if (!message.content.startsWith("@silent ")) message.content = `@silent ${message.content}`;
        if (settings.store.turnOffAfterSending) setSilent(false);
    }
});
