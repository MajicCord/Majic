/*
 * Majic — AnonymiseFileNames plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { findByCodeLazy } from "@webpack";
import { DiscordIcon, React, useState } from "@webpack/common";

const s = createStrings({
    en: { random: "Random characters", consistent: "Consistent", timestamp: "Timestamp", on: "Using anonymous file name", off: "Using normal file name" },
    fr: { random: "Caractères aléatoires", consistent: "Nom fixe", timestamp: "Horodatage", on: "Nom de fichier anonyme", off: "Nom de fichier normal" }
});

const ActionBarIcon = findByCodeLazy("Children.map", "isValidElement", "dangerous:");

const Methods = {
    Random: 0,
    Consistent: 1,
    Timestamp: 2
} as const;

const ANONYMISE_UPLOAD_SYMBOL = Symbol("majicAnonymise");
const tarExtMatcher = /\.tar\.\w+$/;

const settings = definePluginSettings({
    anonymiseByDefault: {
        type: OptionType.BOOLEAN,
        description: "Anonymise file names by default",
        default: true
    },
    method: {
        type: OptionType.SELECT,
        description: "Anonymising method",
        options: [
            { get label() { return s("random"); }, value: Methods.Random, default: true },
            { get label() { return s("consistent"); }, value: Methods.Consistent },
            { get label() { return s("timestamp"); }, value: Methods.Timestamp }
        ]
    },
    randomisedLength: {
        type: OptionType.NUMBER,
        description: "Random characters length",
        default: 7,
        disabled() { return this.store.method !== Methods.Random; },
        min: 1
    },
    consistent: {
        type: OptionType.STRING,
        description: "Consistent file name",
        default: "image",
        disabled() { return this.store.method !== Methods.Consistent; }
    }
});

function AnonymiseUploadButton({ upload }: { upload: any }) {
    const [anonymise, setAnonymise] = useState<boolean>(upload[ANONYMISE_UPLOAD_SYMBOL] ?? settings.store.anonymiseByDefault);

    function onToggleAnonymise() {
        upload[ANONYMISE_UPLOAD_SYMBOL] = !anonymise;
        setAnonymise(!anonymise);
    }

    return (
        <ActionBarIcon tooltip={anonymise ? s("on") : s("off")} onClick={onToggleAnonymise}>
            <DiscordIcon name={anonymise ? "EyeSlashIcon" : "EyeIcon"} size={20} />
        </ActionBarIcon>
    );
}

export default definePlugin({
    name: "AnonymiseFileNames",
    description: "Anonymises the names of the files you upload",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Rend anonymes les noms des fichiers que tu envoies",
            options: {
                anonymiseByDefault: "Anonymiser les noms de fichiers par défaut",
                method: "Méthode d'anonymisation",
                randomisedLength: "Nombre de caractères aléatoires",
                consistent: "Nom de fichier fixe"
            }
        }
    },
    settings,

    patches: [
        {
            find: "async uploadFiles(",
            replacement: {
                match: /async uploadFiles\((\i)\){/,
                replace: "$&$1.forEach($self.anonymise);"
            }
        },
        {
            find: "#{intl::ATTACHMENT_UTILITIES_SPOILER}",
            replacement: {
                match: /(?<=children:\[)(?=.{10,80}tooltip:.{0,100}#{intl::ATTACHMENT_UTILITIES_SPOILER})/,
                replace: "arguments[0].canEdit!==false?$self.AnonymiseUploadButton(arguments[0]):null,"
            }
        }
    ],

    AnonymiseUploadButton: withErrorBoundary("AnonymiseFileNames", AnonymiseUploadButton),

    anonymise(upload: any) {
        if ((upload[ANONYMISE_UPLOAD_SYMBOL] ?? settings.store.anonymiseByDefault) === false) return;

        const originalFileName: string = upload.filename;
        const tarMatch = tarExtMatcher.exec(originalFileName);
        const extIdx = tarMatch?.index ?? originalFileName.lastIndexOf(".");
        const ext = extIdx !== -1 ? originalFileName.slice(extIdx) : "";

        switch (settings.store.method) {
            case Methods.Random: {
                const chars = "0123456789bdfhjkmnpqrstvwxz";
                upload.filename = Array.from(
                    { length: settings.store.randomisedLength },
                    () => chars[Math.floor(Math.random() * chars.length)]
                ).join("") + ext;
                break;
            }
            case Methods.Consistent:
                upload.filename = settings.store.consistent + ext;
                break;
            case Methods.Timestamp:
                upload.filename = Date.now() + ext;
                break;
        }
    }
});
