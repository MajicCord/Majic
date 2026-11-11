/*
 * Majic — OverrideForumDefaults plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";

const s = createStrings({
    en: { list: "List", gallery: "Gallery", recentlyActive: "Recently Active", datePosted: "Date Posted" },
    fr: { list: "Liste", gallery: "Galerie", recentlyActive: "Activité récente", datePosted: "Date de publication" }
});

const settings = definePluginSettings({
    defaultLayout: {
        type: OptionType.SELECT,
        description: "Default layout",
        options: [
            { get label() { return s("list"); }, value: 1, default: true },
            { get label() { return s("gallery"); }, value: 2 }
        ]
    },
    defaultSortOrder: {
        type: OptionType.SELECT,
        description: "Default sort order",
        options: [
            { get label() { return s("recentlyActive"); }, value: 0, default: true },
            { get label() { return s("datePosted"); }, value: 1 }
        ]
    }
});

export default definePlugin({
    name: "OverrideForumDefaults",
    description: "Overrides the default forum layout and sort order (you can still change them per channel)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Change la disposition et le tri par défaut des forums (tu peux toujours les changer par salon)",
            options: {
                defaultLayout: "Disposition par défaut",
                defaultSortOrder: "Tri par défaut"
            }
        }
    },
    settings,

    patches: [
        {
            find: "getDefaultLayout(){",
            replacement: [
                {
                    match: /}getDefaultLayout\(\){/,
                    replace: "$&return $self.getLayout();"
                },
                {
                    match: /}getDefaultSortOrder\(\){/,
                    replace: "$&return $self.getSortOrder();"
                }
            ]
        }
    ],

    getLayout: () => settings.store.defaultLayout,
    getSortOrder: () => settings.store.defaultSortOrder
});
