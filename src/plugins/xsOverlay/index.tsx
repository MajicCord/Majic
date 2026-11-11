/*
 * Majic — XSOverlay plugin
 */

import { definePluginSettings } from "@api/settings";
import { Button } from "@components/ui";
import { createStrings } from "@i18n";
import { definePlugin, makeRange, OptionType, type PluginNative } from "@utils/types";
import { findByCodeLazy, findLazy } from "@webpack";
import { React, Stores } from "@webpack/common";

const s = createStrings({
    en: {
        incomingCall: "Incoming call",
        calling: "{name} is calling you...",
        reply: " (reply)",
        embed: " [embed] ",
        sentEmbeds: "sent message embed(s)",
        sticker: " [sticker] ",
        sentSticker: "sent a sticker",
        image: " [image: {name}] ",
        attachment: " [attachment: {name}] ",
        unknownUser: "unknown-user",
        testContent: "This is a test notification!",
        testTitle: "Hello from Majic!",
        sendTest: "Send test notification"
    },
    fr: {
        incomingCall: "Appel entrant",
        calling: "{name} t'appelle...",
        reply: " (réponse)",
        embed: " [intégration] ",
        sentEmbeds: "a envoyé une ou plusieurs intégrations",
        sticker: " [sticker] ",
        sentSticker: "a envoyé un sticker",
        image: " [image : {name}] ",
        attachment: " [pièce jointe : {name}] ",
        unknownUser: "utilisateur-inconnu",
        testContent: "Ceci est une notification de test !",
        testTitle: "Bonjour de la part de Majic !",
        sendTest: "Envoyer une notification de test"
    }
});

const ChannelTypes = findLazy(m => m.ANNOUNCEMENT_THREAD === 10);

interface Message {
    guild_id: string;
    attachments: Array<{ content_type?: string; filename: string }>;
    author: { id: string; username: string; avatar: string; bot?: boolean };
    channel_id: string;
    content: string;
    embeds: unknown[];
    sticker_items?: unknown[];
    id: string;
    mention_roles: string[];
    mentions: unknown[];
    referenced_message: unknown;
    type: number;
}

interface Call {
    channel_id: string;
    guild_id: string;
    message_id: string;
    region: string;
    ringing: string[];
}

interface ApiObject {
    sender: string;
    target: string;
    command: string;
    jsonData: string;
    rawData: string | null;
}

interface NotificationObject {
    type: number;
    timeout: number;
    height: number;
    opacity: number;
    volume: number;
    audioPath: string;
    title: string;
    content: string;
    useBase64Icon: boolean;
    icon: string;
    sourceApp: string;
}

const notificationsShouldNotify = findByCodeLazy(".SUPPRESS_NOTIFICATIONS))return!1");

const settings = definePluginSettings({
    webSocketPort: {
        type: OptionType.NUMBER,
        description: "Websocket port",
        default: 42070,
        async onChange() {
            await start().catch(() => { });
        }
    },
    preferUDP: {
        type: OptionType.BOOLEAN,
        description: "Enable if you use an older build of XSOverlay that cannot connect through websockets",
        default: false
    },
    botNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow bot notifications",
        default: false
    },
    serverNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow server notifications",
        default: true
    },
    dmNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow direct message notifications",
        default: true
    },
    groupDmNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow group DM notifications",
        default: true
    },
    callNotifications: {
        type: OptionType.BOOLEAN,
        description: "Allow call notifications",
        default: true
    },
    pingColor: {
        type: OptionType.STRING,
        description: "User mention color",
        default: "#7289da"
    },
    channelPingColor: {
        type: OptionType.STRING,
        description: "Channel mention color",
        default: "#8a2be2"
    },
    soundPath: {
        type: OptionType.STRING,
        description: "Notification sound (default/warning/error)",
        default: "default"
    },
    timeout: {
        type: OptionType.NUMBER,
        description: "Notification duration (seconds)",
        default: 3
    },
    lengthBasedTimeout: {
        type: OptionType.BOOLEAN,
        description: "Extend duration with message length",
        default: true
    },
    opacity: {
        type: OptionType.SLIDER,
        description: "Notification opacity",
        default: 1,
        markers: makeRange(0, 1, 0.1)
    },
    volume: {
        type: OptionType.SLIDER,
        description: "Volume",
        default: 0.2,
        markers: makeRange(0, 1, 0.1)
    }
});

let socket: WebSocket | undefined;

function start() {
    socket?.close();
    const ws = socket = new WebSocket(`ws://127.0.0.1:${settings.store.webSocketPort ?? 42070}/?client=Majic`);
    return new Promise((resolve, reject) => {
        ws.onopen = resolve;
        ws.onerror = reject;
        setTimeout(reject, 3000);
    });
}

const Native = MajicNative.pluginHelpers.XSOverlay as PluginNative<typeof import("./native")>;

function shouldIgnoreForChannelType(channel: { type: number }) {
    if (channel.type === ChannelTypes.DM && settings.store.dmNotifications) return false;
    if (channel.type === ChannelTypes.GROUP_DM && settings.store.groupDmNotifications) return false;
    return !settings.store.serverNotifications;
}

function makeNotification(titleString: string, content: string, icon: string | null): NotificationObject {
    return {
        type: 1,
        timeout: settings.store.lengthBasedTimeout ? calculateTimeout(content) : settings.store.timeout,
        height: calculateHeight(content),
        opacity: settings.store.opacity,
        volume: settings.store.volume,
        audioPath: settings.store.soundPath,
        title: titleString,
        content,
        useBase64Icon: icon != null,
        icon: icon ?? "default",
        sourceApp: "Majic"
    };
}

function sendMsgNotif(titleString: string, content: string, message: Message) {
    fetch(`https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`)
        .then(response => response.blob())
        .then(blob => new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(",")[1]);
            reader.readAsDataURL(blob);
        }))
        .then(result => sendToOverlay(makeNotification(titleString, content, result)));
}

function sendOtherNotif(content: string, titleString: string) {
    void sendToOverlay(makeNotification(titleString, content, null));
}

async function sendToOverlay(notif: NotificationObject) {
    if (settings.store.preferUDP) {
        void Native.sendToOverlay(notif);
        return;
    }

    const apiObject: ApiObject = {
        sender: "Majic",
        target: "xsoverlay",
        command: "SendNotification",
        jsonData: JSON.stringify(notif),
        rawData: null
    };
    if (socket?.readyState !== WebSocket.OPEN) await start();
    socket!.send(JSON.stringify(apiObject));
}

function shouldNotify(message: Message, channel: string) {
    const currentUser = Stores.UserStore.getCurrentUser();
    if (message.author.id === currentUser.id) return false;
    if (message.author.bot && !settings.store.botNotifications) return false;
    return notificationsShouldNotify(message, channel);
}

function calculateHeight(content: string) {
    if (content.length <= 100) return 100;
    if (content.length <= 200) return 150;
    if (content.length <= 300) return 200;
    return 250;
}

function calculateTimeout(content: string) {
    if (content.length <= 100) return 3;
    if (content.length <= 200) return 4;
    if (content.length <= 300) return 5;
    return 6;
}

export default definePlugin({
    name: "XSOverlay",
    description: "Forwards Discord notifications to XSOverlay, for easy viewing in VR",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Transfère les notifications Discord vers XSOverlay, pour les voir facilement en VR",
            options: {
                webSocketPort: "Port du websocket",
                preferUDP: "À activer si tu utilises une ancienne version de XSOverlay qui ne se connecte pas en websocket",
                botNotifications: "Autoriser les notifications des bots",
                serverNotifications: "Autoriser les notifications des serveurs",
                dmNotifications: "Autoriser les notifications des messages privés",
                groupDmNotifications: "Autoriser les notifications des groupes privés",
                callNotifications: "Autoriser les notifications d'appel",
                pingColor: "Couleur des mentions d'utilisateur",
                channelPingColor: "Couleur des mentions de salon",
                soundPath: "Son de notification (default/warning/error)",
                timeout: "Durée de la notification (secondes)",
                lengthBasedTimeout: "Allonger la durée selon la longueur du message",
                opacity: "Opacité des notifications",
                volume: "Volume"
            }
        }
    },
    settings,

    flux: {
        CALL_UPDATE({ call }: { call: Call }) {
            if (call?.ringing?.includes(Stores.UserStore.getCurrentUser().id) && settings.store.callNotifications) {
                const channel = Stores.ChannelStore.getChannel(call.channel_id);
                sendOtherNotif(s("incomingCall"), s("calling", { name: channel.name }));
            }
        },
        MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean }) {
            if (optimistic) return;
            const channel = Stores.ChannelStore.getChannel(message.channel_id);
            if (!shouldNotify(message, message.channel_id)) return;

            const pingColor = settings.store.pingColor.replaceAll("#", "").trim();
            const channelPingColor = settings.store.channelPingColor.replaceAll("#", "").trim();
            let finalMsg = message.content;
            let titleString = "";

            if (channel.guild_id) {
                const guild = Stores.GuildStore.getGuild(channel.guild_id);
                titleString = `${message.author.username} (${guild.name}, #${channel.name})`;
            }

            switch (channel.type) {
                case ChannelTypes.DM:
                    titleString = message.author.username.trim();
                    break;
                case ChannelTypes.GROUP_DM: {
                    const channelName = channel.name.trim() ?? channel.rawRecipients.map((e: { username: string }) => e.username).join(", ");
                    titleString = `${message.author.username} (${channelName})`;
                    break;
                }
            }

            if (message.referenced_message) titleString += s("reply");

            if (message.embeds.length > 0) {
                finalMsg += s("embed");
                if (message.content === "") finalMsg = s("sentEmbeds");
            }

            if (message.sticker_items) {
                finalMsg += s("sticker");
                if (message.content === "") finalMsg = s("sentSticker");
            }

            const images = message.attachments.filter(e => typeof e?.content_type === "string" && e.content_type.startsWith("image"));
            images.forEach(img => {
                finalMsg += s("image", { name: img.filename });
            });

            message.attachments.filter(a => a && !a.content_type?.startsWith("image")).forEach(a => {
                finalMsg += s("attachment", { name: a.filename });
            });

            if (message.mentions.length > 0) {
                finalMsg = finalMsg.replace(/<@!?(\d{17,20})>/g, (_, id) => `<color=#${pingColor}><b>@${Stores.UserStore.getUser(id)?.username || s("unknownUser")}</color></b>`);
            }

            if (message.mention_roles.length > 0) {
                for (const roleId of message.mention_roles) {
                    const role = Stores.GuildRoleStore.getRole(channel.guild_id, roleId);
                    if (!role) continue;
                    const roleColor = role.colorString ?? `#${pingColor}`;
                    finalMsg = finalMsg.replace(`<@&${roleId}>`, `<b><color=${roleColor}>@${role.name}</color></b>`);
                }
            }

            const emoteMatches = finalMsg.match(new RegExp("(<a?:\\w+:\\d+>)", "g"));
            const channelMatches = finalMsg.match(new RegExp("<(#\\d+)>", "g"));

            if (emoteMatches) {
                for (const eMatch of emoteMatches) {
                    finalMsg = finalMsg.replace(new RegExp(`${eMatch}`, "g"), `:${eMatch.split(":")[1]}:`);
                }
            }

            if (channelMatches) {
                for (const cMatch of channelMatches) {
                    let channelId = cMatch.split("<#")[1];
                    channelId = channelId.substring(0, channelId.length - 1);
                    finalMsg = finalMsg.replace(new RegExp(`${cMatch}`, "g"), `<b><color=#${channelPingColor}>#${Stores.ChannelStore.getChannel(channelId).name}</color></b>`);
                }
            }

            if (shouldIgnoreForChannelType(channel)) return;
            sendMsgNotif(titleString, finalMsg, message);
        }
    },

    start() {
        start().catch(() => { });
    },

    stop() {
        socket?.close();
        void Native.closeSocket();
    },

    settingsAboutComponent: () => (
        <Button onClick={() => sendOtherNotif(s("testContent"), s("testTitle"))}>
            {s("sendTest")}
        </Button>
    )
});
