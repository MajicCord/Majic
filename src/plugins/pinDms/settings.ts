/*
 * Majic — PinDMs settings
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";

import type { Category } from "./data";

export const s = createStrings({
    en: {
        lastMessage: "Most recent message",
        custom: "Custom (right click channels to reorder)",
        pinDms: "Pin DMs",
        addCategory: "Add Category",
        unpinDm: "Unpin DM",
        moveUp: "Move Up",
        moveDown: "Move Down",
        categoryMenu: "Pin DMs Category Menu",
        editCategory: "Edit Category",
        deleteCategory: "Delete Category",
        newCategoryTitle: "New Category",
        editCategoryTitle: "Edit Category",
        save: "Save",
        create: "Create",
        name: "Name",
        color: "Color",
        defaultName: "Pin Category {index}"
    },
    fr: {
        lastMessage: "Message le plus récent",
        custom: "Personnalisé (clic droit sur les salons pour les réordonner)",
        pinDms: "Épingler les MP",
        addCategory: "Ajouter une catégorie",
        unpinDm: "Désépingler le MP",
        moveUp: "Monter",
        moveDown: "Descendre",
        categoryMenu: "Menu de catégorie des MP épinglés",
        editCategory: "Modifier la catégorie",
        deleteCategory: "Supprimer la catégorie",
        newCategoryTitle: "Nouvelle catégorie",
        editCategoryTitle: "Modifier la catégorie",
        save: "Enregistrer",
        create: "Créer",
        name: "Nom",
        color: "Couleur",
        defaultName: "Catégorie épinglée {index}"
    }
});

export const PinOrder = {
    LastMessage: 0,
    Custom: 1
} as const;

export const PrivateChannelSortStore = findStoreLazy("PrivateChannelSortStore") as { getPrivateChannelIds(): string[] };

export const settings = definePluginSettings({
    pinOrder: {
        type: OptionType.SELECT,
        description: "Order in which pinned DMs are displayed",
        options: [
            { get label() { return s("lastMessage"); }, value: PinOrder.LastMessage, default: true },
            { get label() { return s("custom"); }, value: PinOrder.Custom }
        ]
    },
    canCollapseDmSection: {
        type: OptionType.BOOLEAN,
        description: "Allow the uncategorised DMs section to be collapsed",
        default: false
    },
    dmSectionCollapsed: {
        type: OptionType.BOOLEAN,
        description: "Collapse DM section",
        default: false,
        hidden() { return true; }
    },
    userBasedCategoryList: {
        type: OptionType.CUSTOM,
        description: "Pinned DM categories per account",
        default: {} as Record<string, Category[]>
    }
});
