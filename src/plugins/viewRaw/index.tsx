/*
 * Majic — ViewRaw plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { copyWithToast, getIntlMessage } from "@utils/discord";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { DiscordIcon, Modal, openModal, Parser, React, showToast, Stores } from "@webpack/common";

const s = createStrings({
    en: {
        viewRaw: "View Raw",
        title: "Raw {type} Data",
        copyData: "Copy {type} Data",
        copiedData: "{type} data copied to clipboard!",
        copyContent: "Copy Raw Content",
        copiedContent: "Content copied to clipboard!",
        messageContent: "Message Content",
        messageData: "Message Data",
        emptyMessage: "Can't copy an empty message.",
        leftClick: "Left click to view the raw content",
        rightClick: "Right click to view the raw content",
        labelRight: "Copy Raw (Left Click) / View Raw (Right Click)",
        labelLeft: "View Raw (Left Click) / Copy Raw (Right Click)",
        Guild: "Server",
        Role: "Role",
        User: "User",
        Channel: "Channel",
        Message: "Message",
        Profile: "Profile"
    },
    fr: {
        viewRaw: "Voir le brut",
        title: "Données brutes ({type})",
        copyData: "Copier les données ({type})",
        copiedData: "Données ({type}) copiées dans le presse-papiers !",
        copyContent: "Copier le contenu brut",
        copiedContent: "Contenu copié dans le presse-papiers !",
        messageContent: "Contenu du message",
        messageData: "Données du message",
        emptyMessage: "Impossible de copier un message vide.",
        leftClick: "Clic gauche pour voir le contenu brut",
        rightClick: "Clic droit pour voir le contenu brut",
        labelRight: "Copier le brut (clic gauche) / Voir le brut (clic droit)",
        labelLeft: "Voir le brut (clic gauche) / Copier le brut (clic droit)",
        Guild: "serveur",
        Role: "rôle",
        User: "utilisateur",
        Channel: "salon",
        Message: "message",
        Profile: "profil"
    }
});

type DataType = "Guild" | "Role" | "User" | "Channel" | "Message" | "Profile";

const CodeContainerClasses = findCssClassesLazy("markup", "codeContainer");

const CopyRawIcon = (props: { width?: number; height?: number }) => <DiscordIcon name="AngleBracketsIcon" size={props.width ?? 18} />;

function CodeBlock({ className, ...props }: { content?: string; lang: string; className?: string }) {
    return (
        <div className={classes(CodeContainerClasses.markup, className)}>
            {Parser.defaultRules.codeBlock.react(props, null, {})}
        </div>
    );
}

const settings = definePluginSettings({
    clickMethod: {
        type: OptionType.SELECT,
        description: "Which click views the raw content or data of a message",
        options: [
            { get label() { return s("leftClick"); }, value: "Left", default: true },
            { get label() { return s("rightClick"); }, value: "Right" }
        ]
    },
    messageContextMenu: {
        type: OptionType.BOOLEAN,
        description: "Show in the message context menu",
        default: false
    },
    sortKeys: {
        type: OptionType.BOOLEAN,
        description: "Sort the keys of the raw data alphabetically",
        default: true
    },
    stripSensitiveData: {
        type: OptionType.BOOLEAN,
        description: "Remove sensitive data from the raw data, such as your email and phone number",
        default: true
    }
});

function cloneObject<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

function sortObject<T>(obj: T): T {
    if (!settings.store.sortKeys) return obj;

    if (Array.isArray(obj)) return obj.map(sortObject) as T;

    if (obj !== null && typeof obj === "object") {
        return Object.fromEntries(
            Object.entries(obj)
                .sort(([k1], [k2]) => k1.localeCompare(k2))
                .map(([key, value]) => [key, sortObject(value)])
        ) as T;
    }

    return obj;
}

const deleteProperties = (obj: Record<string, unknown>, keys: string[]) => keys.forEach(key => delete obj[key]);

function redactUser(data: any) {
    if (settings.store.stripSensitiveData) {
        deleteProperties(data, ["email", "phone", "storeCountry", "personalConnectionId"]);
    }
    return data;
}

function cleanMessage(message: any) {
    message = cloneObject(message);
    redactUser(message.author);

    deleteProperties(message, ["editHistory", "deleted", "firstEditTimestamp"]);
    message.attachments?.forEach((attachment: any) => delete attachment.deleted);

    return message;
}

function openViewRawModal(data: object, type: DataType, messageContent?: string) {
    const json = JSON.stringify(sortObject(data), null, 4);
    const typeLabel = s(type);

    openModal((props: any) => (
        <ErrorBoundary name="ViewRaw">
            <Modal
                {...props}
                title={s("title", { type: typeLabel })}
                size="xl"
                actions={[
                    {
                        text: s("copyData", { type: typeLabel }),
                        variant: "secondary",
                        onClick: () => copyWithToast(json, s("copiedData", { type: typeLabel }))
                    },
                    messageContent && {
                        text: s("copyContent"),
                        variant: "secondary",
                        onClick: () => copyWithToast(messageContent, s("copiedContent"))
                    }
                ].filter(Boolean)}
            >
                {!!messageContent && (
                    <>
                        <h3 className="majic-viewRaw-heading">{s("messageContent")}</h3>
                        <CodeBlock className="majic-viewRaw-codeBlock" content={messageContent} lang="" />
                        <h3 className="majic-viewRaw-heading majic-viewRaw-spaced">{s("messageData")}</h3>
                    </>
                )}
                <CodeBlock className="majic-viewRaw-codeBlock" content={json} lang="json" />
            </Modal>
        </ErrorBoundary>
    ));
}

const openViewRawModalMessage = (message: any) => openViewRawModal(cleanMessage(message), "Message", message.content);

function copyMessage(message: any) {
    const target = message.messageSnapshots?.[0]?.message ?? message;
    if (!target.content) return showToast({ text: s("emptyMessage"), variant: "critical" });
    void copyWithToast(target.content);
}

function makeContextCallback(name: DataType, getData?: (props: any) => any) {
    return (children: any[], props: any) => {
        const value = getData ? getData(props) : props?.[name.toLowerCase()];
        if (!value) return;
        if (props.label === getIntlMessage("CHANNEL_ACTIONS_MENU_LABEL")) return;
        const isMessage = name === "Message";
        if (isMessage && !settings.store.messageContextMenu) return;

        const id = `majic-view-${name.toLowerCase()}-raw`;
        const action = isMessage
            ? () => openViewRawModalMessage(value)
            : name === "User"
                ? () => openViewRawModal(redactUser(cloneObject(value)), name)
                : () => openViewRawModal(value, name);

        const devContainer = findGroupChildrenByChildId(`devmode-copy-id-${value.id}`, children);

        (devContainer ?? children).splice(-1, 0,
            <Menu.MenuItem
                id={id}
                key={id}
                label={s("viewRaw")}
                action={action}
                icon={CopyRawIcon}
                leadingAccessory={{ type: "icon", icon: CopyRawIcon }}
            />
        );
    };
}

export default definePlugin({
    name: "ViewRaw",
    description: "Copy and view the raw content or data of any message, channel or server",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["MessagePopoverAPI"],
    translations: {
        fr: {
            description: "Copie et affiche le contenu ou les données brutes de n'importe quel message, salon ou serveur",
            options: {
                clickMethod: "Quel clic affiche le contenu ou les données brutes d'un message",
                messageContextMenu: "Afficher dans le menu clic droit des messages",
                sortKeys: "Trier les clés des données brutes par ordre alphabétique",
                stripSensitiveData: "Retirer les données sensibles, comme ton e-mail et ton numéro de téléphone"
            }
        }
    },
    settings,

    css: ".majic-viewRaw-codeBlock, .majic-viewRaw-codeBlock :is(pre, code, [class*=\"codeContainer\"]) { max-width: unset; width: 100%; box-sizing: border-box; } .majic-viewRaw-heading { margin: 0 0 8px; color: var(--text-strong); font-size: 14px; font-weight: 600; } .majic-viewRaw-spaced { margin-top: 16px; }",

    contextMenus: {
        "guild-context": makeContextCallback("Guild"),
        "guild-settings-role-context": makeContextCallback("Role"),
        "channel-context": makeContextCallback("Channel"),
        "thread-context": makeContextCallback("Channel"),
        "gdm-context": makeContextCallback("Channel"),
        "user-context": makeContextCallback("User"),
        "dev-context"(children, { id }: { id?: string } = {}) {
            const guild = Stores.GuildStore.getGuild(Stores.SelectedGuildStore.getGuildId());
            if (!guild || !id) return;

            const role = Stores.GuildRoleStore.getRole(guild.id, id);
            if (!role) return;

            children.push(
                <Menu.MenuItem
                    id="majic-view-role-raw"
                    key="majic-view-role-raw"
                    label={s("viewRaw")}
                    action={() => openViewRawModal(role, "Role")}
                    icon={CopyRawIcon}
                    leadingAccessory={{ type: "icon", icon: CopyRawIcon }}
                />
            );
        },
        message: makeContextCallback("Message"),
        "user-profile-overflow-menu": makeContextCallback("Profile", props =>
            Stores.UserProfileStore.getGuildMemberProfile(props.user?.id, props.guildId) ?? Stores.UserProfileStore.getUserProfile(props.user?.id))
    },

    messagePopoverButtons: {
        viewRaw(message) {
            const handleClick = () => {
                if (settings.store.clickMethod === "Right") copyMessage(message);
                else openViewRawModalMessage(message);
            };

            const handleContextMenu = (e: MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (settings.store.clickMethod === "Left") copyMessage(message);
                else openViewRawModalMessage(message);
            };

            return {
                label: settings.store.clickMethod === "Right" ? s("labelRight") : s("labelLeft"),
                icon: CopyRawIcon,
                onClick: handleClick,
                onContextMenu: handleContextMenu
            } as any;
        }
    }
});
