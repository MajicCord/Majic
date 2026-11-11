/*
 * Majic — CopyEmojiMarkdown plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { copyWithToast } from "@utils/discord";
import { definePlugin, OptionType } from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { DiscordIcon, React } from "@webpack/common";

const s = createStrings({
    en: { copy: "Copy Emoji Markdown", copied: "Success! Copied emoji markdown." },
    fr: { copy: "Copier le markdown de l'emoji", copied: "Markdown de l'emoji copié !" }
});

const { convertNameToSurrogate } = findByPropsLazy("convertNameToSurrogate");

const CopyIcon = () => <DiscordIcon name="CopyIcon" size={18} />;

interface Target {
    dataset: { type: string; id: string; name: string };
    firstChild: HTMLImageElement;
}

function getEmojiMarkdown(target: Target, copyUnicode: boolean): string {
    const { id: emojiId, name: emojiName } = target.dataset;

    if (!emojiId) return copyUnicode ? convertNameToSurrogate(emojiName) : `:${emojiName}:`;

    const url = new URL(target.firstChild.src);
    const hasParam = url.searchParams.get("animated") === "true";
    const isGif = url.pathname.endsWith(".gif");

    return `<${(hasParam || isGif) ? "a" : ""}:${emojiName.replace(/~\d+$/, "")}:${emojiId}>`;
}

const settings = definePluginSettings({
    copyUnicode: {
        type: OptionType.BOOLEAN,
        description: "Copy the raw unicode character instead of :name: for default emojis",
        default: true
    }
});

export default definePlugin({
    name: "CopyEmojiMarkdown",
    description: "Lets you copy emojis as formatted strings (<:name:id>)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet de copier les emojis sous forme de texte formaté (<:nom:id>)",
            options: {
                copyUnicode: "Copier le caractère unicode brut au lieu de :nom: pour les emojis par défaut"
            }
        }
    },
    settings,

    contextMenus: {
        "expression-picker"(children, { target }: { target?: Target } = {}) {
            if (target?.dataset.type !== "emoji" || !target.dataset.id) return;

            children.push(
                <Menu.MenuItem
                    id="majic-copy-emoji-markdown"
                    key="majic-copy-emoji-markdown"
                    label={s("copy")}
                    action={() => copyWithToast(getEmojiMarkdown(target, settings.store.copyUnicode), s("copied"))}
                    leadingAccessory={{ type: "icon", icon: CopyIcon }}
                />
            );
        }
    }
});
