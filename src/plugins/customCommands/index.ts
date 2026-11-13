/*
 * Majic — CustomCommands plugin
 */

import { ApplicationCommandOptionType, findOption, registerCommand, unregisterCommand } from "@api/commands";
import { definePluginSettings } from "@api/settings";
import { Button, Card, Text, TextInput } from "@components/ui";
import { createStrings, t } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { React, showToast, useState } from "@webpack/common";

const s = createStrings({
    en: {
        commandDescription: "Custom command: {message}",
        argumentDefault: "{name} (default: {fallback})",
        createFailed: "Could not create /{name}: {error}",
        invalidName: "Use 1-32 letters, numbers, - or _ for the name",
        emptyMessage: "The message cannot be empty",
        help: "Use {{name}} for a required argument and {{name=default}} for an optional one. Write \\n for a new line.",
        namePlaceholder: "name",
        messagePlaceholder: "Message to send"
    },
    fr: {
        commandDescription: "Commande perso : {message}",
        argumentDefault: "{name} (par défaut : {fallback})",
        createFailed: "Impossible de créer /{name} : {error}",
        invalidName: "Le nom doit faire 1 à 32 caractères : lettres, chiffres, - ou _",
        emptyMessage: "Le message ne peut pas être vide",
        help: "Utilise {{nom}} pour un argument obligatoire et {{nom=défaut}} pour un argument optionnel. Écris \\n pour un retour à la ligne.",
        namePlaceholder: "nom",
        messagePlaceholder: "Message à envoyer"
    }
});

interface CustomCommand {
    name: string;
    message: string;
}

const ARGUMENT = /{{\s*([\w-]+)\s*(?:=\s*([^}]*))?}}/g;
const VALID_NAME = /^[\w-]{1,32}$/;

function argumentsOf(message: string) {
    const seen = new Map<string, string | null>();
    for (const [, name, fallback] of message.matchAll(ARGUMENT)) {
        const key = name.toLowerCase();
        if (!seen.has(key)) seen.set(key, fallback?.trim() ?? null);
    }
    return seen;
}

const registered = new Set<string>();

function register(command: CustomCommand) {
    const args = argumentsOf(command.message);
    try {
        registerCommand({
            name: command.name,
            description: s("commandDescription", { message: command.message.slice(0, 80) }),
            options: [...args].map(([name, fallback]) => ({
                name,
                description: fallback == null ? name : s("argumentDefault", { name, fallback }),
                type: ApplicationCommandOptionType.STRING,
                required: fallback == null
            })),
            execute(values) {
                const content = command.message
                    .replace(ARGUMENT, (match, name: string, fallback?: string) => findOption<string>(values, name.toLowerCase()) ?? fallback?.trim() ?? match)
                    .replaceAll("\\n", "\n");
                return { content };
            }
        }, "CustomCommands");
        registered.add(command.name);
    } catch (err) {
        showToast({ text: s("createFailed", { name: command.name, error: err instanceof Error ? err.message : String(err) }), variant: "critical" });
    }
}

function syncCommands() {
    for (const name of registered) unregisterCommand(name);
    registered.clear();
    for (const command of settings.store.commands ?? []) register(command);
}

function CommandEditor() {
    const [commands, setCommands] = useState<CustomCommand[]>(() => [...(settings.store.commands ?? [])]);
    const [name, setName] = useState("");
    const [message, setMessage] = useState("");

    const save = (next: CustomCommand[]) => {
        settings.store.commands = next;
        setCommands(next);
        syncCommands();
    };

    const add = () => {
        const clean = name.trim().toLowerCase();
        if (!VALID_NAME.test(clean)) return showToast({ text: s("invalidName"), variant: "critical" });
        if (!message.trim()) return showToast({ text: s("emptyMessage"), variant: "critical" });
        save([...commands.filter(c => c.name !== clean), { name: clean, message }]);
        setName("");
        setMessage("");
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Text muted>{s("help")}</Text>
            {commands.map(command => (
                <Card key={command.name}>
                    <div className="majic-row">
                        <div className="majic-row-grow">
                            <Text><strong>/{command.name}</strong></Text>
                            <Text muted>{command.message}</Text>
                        </div>
                        <Button variant="danger" onClick={() => save(commands.filter(c => c.name !== command.name))}>{t("ui.delete")}</Button>
                    </div>
                </Card>
            ))}
            <div className="majic-row">
                <div style={{ width: 160 }}><TextInput value={name} onChange={setName} placeholder={s("namePlaceholder")} /></div>
                <div className="majic-row-grow"><TextInput value={message} onChange={setMessage} placeholder={s("messagePlaceholder")} /></div>
                <Button onClick={add}>{t("ui.add")}</Button>
            </div>
        </div>
    );
}

const settings = definePluginSettings({
    commands: {
        type: OptionType.CUSTOM,
        description: "Saved custom commands",
        default: [] as CustomCommand[]
    },
    editor: {
        type: OptionType.COMPONENT,
        description: "Your commands",
        component: CommandEditor
    }
});

export default definePlugin({
    name: "CustomCommands",
    description: "Create your own slash commands that send a message, with optional arguments",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Crée tes propres commandes slash qui envoient un message, avec des arguments optionnels",
            options: {
                editor: "Tes commandes"
            }
        }
    },
    settings,

    start: syncCommands,

    stop() {
        for (const name of registered) unregisterCommand(name);
        registered.clear();
    }
});
