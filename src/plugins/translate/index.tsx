/*
 * Majic — Translate plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";
import { React } from "@webpack/common";

import { settings } from "./settings";
import { s } from "./strings";
import { setShouldShowTranslateEnabledTooltip, TranslateChatBarIcon, TranslateIcon } from "./TranslateIcon";
import { handleTranslate, TranslationAccessory } from "./TranslationAccessory";
import { translate } from "./utils";

function getMessageContent(message: any): string {
    return message.content
        || message.messageSnapshots?.[0]?.message.content
        || message.embeds?.find((embed: any) => embed.type === "auto_moderation_message")?.rawDescription || "";
}

let tooltipTimeout: ReturnType<typeof setTimeout> | undefined;

export default definePlugin({
    name: "Translate",
    description: "Translates messages with Google Translate, DeepL or Kagi",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Traduit les messages avec Google Traduction, DeepL ou Kagi",
            options: {
                service: "Service de traduction",
                deeplApiKey: "Ta clé API DeepL (sur deepl.com/your-account)",
                kagiSession: "Ton jeton de session Kagi (sur kagi.com/settings?p=user_details)",
                autoTranslate: "Traduire automatiquement tes messages avant l'envoi. Tu peux aussi faire Maj+clic ou clic droit sur le bouton de traduction pour l'activer ou la désactiver",
                showAutoTranslateTooltip: "Afficher une infobulle sur le bouton de la barre de saisie quand un message est traduit automatiquement"
            }
        }
    },
    settings,

    css: [
        ".majic-trans-accessory { color: var(--text-muted); margin-top: 0.5em; font-style: italic; font-weight: 400; line-height: 1.2rem; white-space: break-spaces; }",
        ".majic-trans-accessory-icon { margin-right: 0.25em; vertical-align: middle; }",
        ".majic-trans-dismiss { all: unset; cursor: pointer; color: var(--text-link); }",
        ".majic-trans-dismiss:is(:hover, :focus) { text-decoration: underline; }",
        ".majic-trans-auto-translate { color: var(--green-360); }",
        ".majic-trans-chat-button { scale: 1.085; }",
        ".majic-trans-divider { height: 1px; margin-bottom: 16px; background: var(--border-subtle); }"
    ].join(" "),

    contextMenus: {
        message(children, { message }: { message?: any } = {}) {
            if (!message) return;
            const content = document.getSelection()?.toString() || getMessageContent(message);
            if (!content) return;

            const group = findGroupChildrenByChildId("copy-text", children);
            if (!group) return;

            group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, (
                <Menu.MenuItem
                    id="majic-trans"
                    key="majic-trans"
                    label={s("translate")}
                    icon={TranslateIcon}
                    leadingAccessory={{ type: "icon", icon: TranslateIcon }}
                    action={async () => {
                        const trans = await translate("received", content);
                        handleTranslate(message.id, trans);
                    }}
                />
            ));
        }
    },

    translate,

    messageAccessories: {
        translation: props => !props.isMessageSnapshot ? <TranslationAccessory message={props.message} /> : null
    },

    chatBarButtons: {
        translate: TranslateChatBarIcon
    },

    messagePopoverButtons: {
        translate(message) {
            const content = getMessageContent(message);
            if (!content) return null;

            return {
                label: s("translate"),
                icon: TranslateIcon,
                onClick: async () => {
                    const trans = await translate("received", content);
                    handleTranslate(message.id, trans);
                }
            };
        }
    },

    async onBeforeMessageSend(_channelId, message) {
        if (!settings.store.autoTranslate) return;
        if (!message.content) return;

        setShouldShowTranslateEnabledTooltip?.(true);
        clearTimeout(tooltipTimeout);
        tooltipTimeout = setTimeout(() => setShouldShowTranslateEnabledTooltip?.(false), 2000);

        const trans = await translate("sent", message.content);
        message.content = trans.text;
    }
});
