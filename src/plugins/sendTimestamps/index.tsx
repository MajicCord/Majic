/*
 * Majic — SendTimestamps plugin
 */

import { ChatBarButton, type ChatBarButtonRenderer } from "@api/chatButtons";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { copyWithToast, getTheme, insertTextIntoChatInputBox, Theme } from "@utils/discord";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, Modal, openModal, Parser, React, useState } from "@webpack/common";

const s = createStrings({
    en: {
        title: "Timestamp Picker",
        copy: "Copy",
        insert: "Insert",
        format: "Format",
        raw: "Raw Markdown:",
        button: "Insert Timestamp",
        aboutShortcut: "To quickly send a time-only timestamp, write it as `HH:MM` (with the backticks) in your message.",
        aboutPicker: "See the examples below. For anything more specific, use the calendar button in the chat bar.",
        examples: "Examples"
    },
    fr: {
        title: "Choisir un horaire",
        copy: "Copier",
        insert: "Insérer",
        format: "Format",
        raw: "Markdown brut :",
        button: "Insérer un horaire",
        aboutShortcut: "Pour envoyer vite une heure, écris-la sous la forme `HH:MM` (avec les accents graves) dans ton message.",
        aboutPicker: "Exemples ci-dessous. Pour quelque chose de plus précis, utilise le bouton calendrier de la barre de saisie.",
        examples: "Exemples"
    }
});

const settings = definePluginSettings({
    replaceMessageContents: {
        type: OptionType.BOOLEAN,
        description: "Replace timestamps in message contents",
        default: true
    }
});

const Formats = ["R", "t", "T", "d", "s", "S", "D", "f", "F"] as const;
type Format = typeof Formats[number];

function parseTime(time: string) {
    const cleanTime = time.slice(1, -1).replace(/(\d)(AM|PM)$/i, "$1 $2");

    const date = new Date(`${new Date().toDateString()} ${cleanTime}`);
    if (Number.isNaN(date.getTime())) return time;

    if (Date.now() > date.getTime()) date.setDate(date.getDate() + 1);

    return `<t:${Math.round(date.getTime() / 1000)}:t>`;
}

const formatTimestamp = (time: number, format: Format) => `<t:${time}${format && `:${format}`}>`;

function PickerModal(props: { onClose(): void; [key: string]: unknown }) {
    const [value, setValue] = useState<string>();
    const [format, setFormat] = useState<Format>("f");
    const time = Math.round((new Date(value!).getTime() || Date.now()) / 1000);
    const formatted = formatTimestamp(time, format);

    return (
        <Modal
            {...props}
            title={s("title")}
            actions={[
                {
                    text: s("copy"),
                    variant: "secondary",
                    onClick() {
                        void copyWithToast(formatted);
                    }
                },
                {
                    text: s("insert"),
                    variant: "primary",
                    onClick() {
                        insertTextIntoChatInputBox(formatted + " ");
                        props.onClose();
                    }
                }
            ]}
        >
            <input
                className="majic-st-date-picker"
                type="datetime-local"
                value={value}
                onChange={e => setValue(e.currentTarget.value)}
                style={{ colorScheme: getTheme() === Theme.Light ? "light" : "dark" }}
            />

            <h3 className="majic-st-heading majic-st-format-heading">{s("format")}</h3>
            <div className="majic-st-format-grid">
                {Formats.map(m => (
                    <button
                        type="button"
                        key={m}
                        className="majic-button majic-st-format-button"
                        data-variant={format === m ? "primary" : "secondary"}
                        onClick={() => setFormat(m)}
                    >
                        {Parser.parse(formatTimestamp(time, m))}
                    </button>
                ))}
            </div>

            <h3 className="majic-st-heading">
                {s("raw")}
                <code className="majic-st-raw-code">{formatted}</code>
            </h3>
        </Modal>
    );
}

const SendTimestampButton: ChatBarButtonRenderer = ({ isAnyChat }) => {
    if (!isAnyChat) return null;

    return (
        <ChatBarButton
            tooltip={s("button")}
            onClick={() => {
                openModal((props: any) => <PickerModal {...props} />);
            }}
        >
            <DiscordIcon name="CalendarIcon" size={20} />
        </ChatBarButton>
    );
};

function About() {
    const samples = ["12:00", "3:51", "17:59", "24:00", "12:00 AM", "0:13PM"].map(sample => `\`${sample}\``);

    return (
        <div className="majic-st-about">
            <p>{s("aboutShortcut")}</p>
            <p>{s("aboutPicker")}</p>
            <h3 className="majic-st-heading majic-st-desc-heading">{s("examples")}</h3>
            <ul>
                {samples.map(sample => (
                    <li key={sample}>
                        <code>{sample}</code> → {Parser.parse(parseTime(sample))}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default definePlugin({
    name: "SendTimestamps",
    description: "Send timestamps easily with a chat bar button and `HH:MM` text shortcuts",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Envoie facilement des horaires avec un bouton dans la barre de saisie et le raccourci `HH:MM`",
            options: {
                replaceMessageContents: "Remplacer les heures écrites dans les messages"
            }
        }
    },
    settings,

    css: [
        ".majic-st-date-picker { background-color: var(--input-background-default); color: var(--text-default); width: 95%; padding: 8px 8px 8px 12px; margin-bottom: 1em; outline: none; border: 1px solid var(--input-background-default); border-radius: 4px; font-weight: 500; font-style: inherit; font-size: 100%; }",
        ".majic-st-heading { color: var(--text-strong); font-size: 14px; font-weight: 600; margin: 0 0 0.5em; }",
        ".majic-st-format-grid { display: grid; grid-template-columns: repeat(3, 1fr); margin-bottom: 1em; gap: 0.5em; }",
        ".majic-st-format-button { text-wrap: wrap; text-align: center; font-size: 0.9em; }",
        ".majic-st-format-button * { background-color: transparent; }",
        ".majic-st-raw-code { display: inline-block; margin-left: 0.33rem; }",
        ".majic-st-about { color: var(--text-default); display: flex; flex-direction: column; gap: 6px; }",
        ".majic-st-about ul { margin: 0; padding-left: 20px; }",
        ".majic-st-desc-heading { margin-top: 1em; }"
    ].join(" "),

    chatBarButtons: {
        timestamp: SendTimestampButton
    },

    onBeforeMessageSend(_: string, message: { content: string }) {
        if (settings.store.replaceMessageContents) {
            message.content = message.content.replace(/`\d{1,2}:\d{2} ?(?:AM|PM)?`/gi, parseTime);
        }
    },

    settingsAboutComponent: About
});
