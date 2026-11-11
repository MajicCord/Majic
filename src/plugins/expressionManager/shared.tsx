/*
 * Majic — ExpressionManager shared helpers
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { DiscordIcon, openModal, React } from "@webpack/common";

export const s = createStrings({
    en: {
        cloneEmoji: "Clone Emoji",
        cloneSticker: "Clone Sticker",
        editEmoji: "Edit Emoji",
        editSticker: "Edit Sticker",
        deleteEmoji: "Delete Emoji",
        deleteSticker: "Delete Sticker",
        deleteTitle: "Delete {name}",
        deleteSubtitle: "Are you sure you want to delete this {type}?",
        delete: "Delete",
        emojiDeleted: "Emoji deleted successfully.",
        stickerDeleted: "Sticker deleted successfully.",
        emojiDeleteFailed: "Failed to delete Emoji",
        stickerDeleteFailed: "Failed to delete Sticker",
        removeFromRecents: "Remove From Recents",
        removeSubtitle: "This will reset all usage history for this {type} and cannot be undone. Are you sure?",
        doIt: "Do it",
        uploadAsEmoji: "Upload as Emoji",
        emojiModalFailed: "Failed to open Emoji Modal: {error}",
        customName: "Custom Name",
        nameInvalid: "Name must be between 2 and 30 characters",
        cloneTitle: "Clone {name}",
        cloneSuccess: "Successfully cloned {name} to {guild}!",
        yourServer: "your server",
        cloneFailed: "Failed to clone: {message}",
        somethingWrong: "Something went wrong (check console!)",
        copyStickerLink: "Copy Sticker Link",
        openStickerLink: "Open Sticker Link",
        linkCopied: "Link copied!",
        emojiType: "emoji",
        stickerType: "sticker"
    },
    fr: {
        cloneEmoji: "Cloner l'emoji",
        cloneSticker: "Cloner l'autocollant",
        editEmoji: "Modifier l'emoji",
        editSticker: "Modifier l'autocollant",
        deleteEmoji: "Supprimer l'emoji",
        deleteSticker: "Supprimer l'autocollant",
        deleteTitle: "Supprimer {name}",
        deleteSubtitle: "Veux-tu vraiment supprimer cet {type} ?",
        delete: "Supprimer",
        emojiDeleted: "Emoji supprimé.",
        stickerDeleted: "Autocollant supprimé.",
        emojiDeleteFailed: "Impossible de supprimer l'emoji",
        stickerDeleteFailed: "Impossible de supprimer l'autocollant",
        removeFromRecents: "Retirer des récents",
        removeSubtitle: "Cela efface tout l'historique d'utilisation de cet {type}, sans retour possible. Continuer ?",
        doIt: "Continuer",
        uploadAsEmoji: "Envoyer comme emoji",
        emojiModalFailed: "Impossible d'ouvrir la fenêtre d'emoji : {error}",
        customName: "Nom personnalisé",
        nameInvalid: "Le nom doit faire entre 2 et 30 caractères",
        cloneTitle: "Cloner {name}",
        cloneSuccess: "{name} a été cloné sur {guild} !",
        yourServer: "ton serveur",
        cloneFailed: "Échec du clonage : {message}",
        somethingWrong: "Une erreur est survenue (voir la console)",
        copyStickerLink: "Copier le lien de l'autocollant",
        openStickerLink: "Ouvrir le lien de l'autocollant",
        linkCopied: "Lien copié !",
        emojiType: "emoji",
        stickerType: "autocollant"
    }
});

export const logger = new Logger("ExpressionManager", "#ff79c6");

export const settings = definePluginSettings({
    editAndDelete: {
        type: OptionType.BOOLEAN,
        description: "Add \"Edit\" and \"Delete\" options to the expression picker context menu",
        default: true
    },
    stickerCopyAndOpen: {
        type: OptionType.BOOLEAN,
        description: "Add \"Copy Sticker Link\" and \"Open Sticker Link\" options to the sticker context menu",
        default: true
    },
    recents: {
        type: OptionType.BOOLEAN,
        description: "Add \"Remove from Recents\" option to the context menu of frequently used expressions",
        default: true
    }
});

export const menuIcon = (name: string) => (props: { width?: number }) => <DiscordIcon name={name} size={props.width ?? 18} />;

export const PlusIcon = menuIcon("PlusSmallIcon");
export const PencilIcon = menuIcon("PencilIcon");
export const DeleteIcon = menuIcon("TrashIcon");
export const HistoryIcon = menuIcon("ClockIcon");
export const CopyIcon = menuIcon("CopyIcon");
export const LinkIcon = menuIcon("LinkIcon");
export const ExternalIcon = menuIcon("LinkExternalSmallIcon");

export function buildCloneItem(label: string, action: () => void) {
    return (
        <Menu.MenuItem
            id="majic-em-clone"
            key="majic-em-clone"
            label={label}
            leadingAccessory={{ type: "icon", icon: PlusIcon }}
            action={action}
        />
    );
}

const ConfirmModal = findByCodeLazy("actionBarInput:", '"critical"', '"secondary');

interface ConfirmOptions {
    title: string;
    subtitle: string;
    confirmText: string;
    cancelText?: string;
    variant?: string;
    onConfirm?(): unknown;
    onCancel?(): unknown;
    onCloseCallback?(): unknown;
}

export function confirmAction({ variant, confirmText, title, cancelText, subtitle, onConfirm, onCancel, onCloseCallback }: ConfirmOptions) {
    return new Promise<boolean>((resolve, reject) => {
        const wrap = (fn: ((...args: any[]) => unknown) | undefined, value: boolean) => async (...args: any[]) => {
            try {
                await fn?.(...args);
                resolve(value);
            } catch (err) {
                reject(err);
            }
        };

        openModal((modalProps: any) => (
            <ConfirmModal
                {...modalProps}
                variant={variant}
                confirmText={confirmText}
                cancelText={cancelText}
                title={title}
                subtitle={subtitle}
                onConfirm={wrap(onConfirm, true)}
                onCancel={wrap(onCancel, false)}
                onCloseCallback={wrap(onCloseCallback, false)}
            />
        ));
    });
}
