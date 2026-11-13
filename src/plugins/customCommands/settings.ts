/*
 * Majic — CustomCommands settings
 */

import { unregisterCommand } from "@api/commands";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { OptionType } from "@utils/types";

import { registerTagCommand } from ".";
import { SettingsTagList } from "./SettingsTagList";

export const s = createStrings({
    en: {
        description: "Allows you to create custom slash commands / tags",
        ephemeral: "Whether the response should only be visible to you",
        manage: "Manage all custom commands",
        create: "Create a new tag",
        list: "List all your tags",
        delete: "Remove a tag by name",
        tagName: "The name of the tag",
        notFound: "A Tag with the name **{name}** does not exist!",
        deleted: "Successfully deleted the tag **{name}**!",
        noTags: "Woops! There are no tags yet, use `/tags create` to create one!",
        registered: "Registered Tags",
        createTag: "Create Tag",
        editTag: "Edit Tag",
        deleteTag: "Delete Tag",
        createTitle: "Create New Tag",
        editSubtitle: "Edit your custom command.",
        createSubtitle: "Create a new tag which will be registered as a slash command.",
        cancel: "Cancel",
        save: "Save",
        createButton: "Create",
        reserved: "The argument name \"ephemeral\" is reserved and cannot be used.",
        overwrite: "A tag with the name \"{name}\" already exists and will be overwritten.",
        name: "Name",
        response: "Response",
        detected: "Detected Arguments",
        defaultValue: " (default: {value})",
        guideTitle: "View Arguments guide",
        guideVariables: "Your response can include variables wrapped in double curly braces which will become command arguments, for example",
        guideDefaults: "You can specify arguments with default values by using an equals sign, for example",
        exampleResponse: "Example Command response:",
        exampleUsage: "Example usage:",
        exampleOutput: "Example output:"
    },
    fr: {
        description: "Permet de créer tes propres commandes slash / tags",
        ephemeral: "La réponse ne doit être visible que par toi",
        manage: "Gérer toutes les commandes perso",
        create: "Créer un nouveau tag",
        list: "Lister tous tes tags",
        delete: "Supprimer un tag par son nom",
        tagName: "Le nom du tag",
        notFound: "Aucun tag nommé **{name}** n'existe !",
        deleted: "Le tag **{name}** a bien été supprimé !",
        noTags: "Oups ! Tu n'as encore aucun tag, utilise `/tags create` pour en créer un !",
        registered: "Tags enregistrés",
        createTag: "Créer un tag",
        editTag: "Modifier le tag",
        deleteTag: "Supprimer le tag",
        createTitle: "Nouveau tag",
        editSubtitle: "Modifie ta commande perso.",
        createSubtitle: "Crée un nouveau tag, qui sera enregistré comme commande slash.",
        cancel: "Annuler",
        save: "Enregistrer",
        createButton: "Créer",
        reserved: "Le nom d'argument « ephemeral » est réservé et ne peut pas être utilisé.",
        overwrite: "Un tag nommé « {name} » existe déjà et sera remplacé.",
        name: "Nom",
        response: "Réponse",
        detected: "Arguments détectés",
        defaultValue: " (par défaut : {value})",
        guideTitle: "Voir le guide des arguments",
        guideVariables: "Ta réponse peut contenir des variables entre doubles accolades, qui deviennent des arguments de la commande, par exemple",
        guideDefaults: "Tu peux donner une valeur par défaut à un argument avec un signe égal, par exemple",
        exampleResponse: "Exemple de réponse :",
        exampleUsage: "Exemple d'utilisation :",
        exampleOutput: "Exemple de résultat :"
    }
});

export interface Tag {
    name: string;
    message: string;
}

export const settings = definePluginSettings({
    tagsList: {
        type: OptionType.CUSTOM,
        description: "Saved tags",
        default: {} as Record<string, Tag>
    },
    tagComponent: {
        type: OptionType.COMPONENT,
        description: "",
        component: SettingsTagList
    }
});

const tagsList = () => settings.store.tagsList as Record<string, Tag>;

export function getTags() {
    return Object.values(tagsList());
}

export function getTag(name: string): Tag | undefined {
    return tagsList()[name];
}

export function addTag(tag: Tag) {
    unregisterCommand(tag.name);
    tagsList()[tag.name] = tag;
    registerTagCommand(tag);
}

export function removeTag(name: string) {
    delete tagsList()[name];
    unregisterCommand(name);
}
