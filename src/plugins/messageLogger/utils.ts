/*
 * Majic — MessageLogger helpers
 */

import { createStrings } from "@i18n";
import { Parser, Stores } from "@webpack/common";

export const s = createStrings({
    en: {
        redText: "Red text",
        redOverlay: "Red overlay",
        toggleHighlight: "Toggle Deleted Highlight",
        clearHistory: "Clear Message History",
        clearLog: "Clear Message Log",
        clearHistoryShort: "Clear history",
        historyTitle: "Message Edit History",
        notLogged: "This edit state was not logged so it can't be displayed.",
        noDeleted: "No deleted messages",
        deletedOne: " deleted message",
        deletedOther: " deleted messages"
    },
    fr: {
        redText: "Texte rouge",
        redOverlay: "Fond rouge",
        toggleHighlight: "Afficher / masquer le surlignage supprimé",
        clearHistory: "Effacer l'historique du message",
        clearLog: "Effacer le journal des messages",
        clearHistoryShort: "Effacer l'historique",
        historyTitle: "Historique des modifications",
        notLogged: "Cette version n'a pas été enregistrée, elle ne peut pas être affichée.",
        noDeleted: "Aucun message supprimé",
        deletedOne: " message supprimé",
        deletedOther: " messages supprimés"
    }
});

export function parseEditContent(content: string, message: any) {
    return Parser.parse(content, true, {
        channelId: message.channel_id,
        messageId: message.id,
        allowLinks: true,
        allowHeading: true,
        allowList: true,
        allowEmojiLinks: true,
        viewingChannelId: Stores.SelectedChannelStore.getChannelId()
    });
}
