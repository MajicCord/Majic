/*
 * Majic — CharacterCounter plugin
 */

import { definePluginSettings } from "@api/settings";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { React, Stores, useEffect, useState } from "@webpack/common";

const settings = definePluginSettings({
    colorEffects: {
        type: OptionType.BOOLEAN,
        description: "Turn the counter yellow, orange then red as you get close to the limit",
        default: true
    }
});

function counterColor(percent: number) {
    if (!settings.store.colorEffects) return "var(--text-muted)";
    if (percent < 50) return "var(--text-muted)";
    if (percent < 75) return "var(--yellow-330, #f0b232)";
    if (percent < 90) return "var(--orange-330, #f57731)";
    return "var(--red-360, #f23f43)";
}

function CharacterCounter({ editorRef, text }: { editorRef: any; text: string }) {
    const [selected, setSelected] = useState(0);
    const showSelected = selected > 0 && (editorRef?.current?.state?.focused ?? false);

    useEffect(() => {
        const listener = () => setSelected(document.getSelection()?.toString()?.length ?? 0);
        document.addEventListener("selectionchange", listener);
        return () => document.removeEventListener("selectionchange", listener);
    }, []);

    if (!text.length) return null;

    const max = editorRef?.current?.props?.maxCharacterCount ?? (Stores.UserStore.getCurrentUser()?.premiumType === 2 ? 4000 : 2000);

    return (
        <div className="majic-char-counter" style={{ color: counterColor((text.length / max) * 100) }}>
            {showSelected && <><span className="majic-char-counter-selected">{selected}</span>/</>}
            <span>{text.length}</span>/<span>{max}</span>
        </div>
    );
}

export default definePlugin({
    name: "CharacterCounter",
    description: "Adds a character counter to the chat input",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un compteur de caractères à la zone de saisie",
            options: {
                colorEffects: "Colorer le compteur en jaune, orange puis rouge à l'approche de la limite"
            }
        }
    },
    settings,

    css: `
.majic-char-counter { position: absolute; bottom: 4px; right: 11px; z-index: 2; font-size: 12px; pointer-events: none; background: transparent; transition: color .3s ease; }
.majic-char-counter-selected { color: var(--majic-accent); }
`,

    patches: [
        {
            find: ".CREATE_FORUM_POST||",
            replacement: {
                match: /(?<=,editorRef:(\i),.{0,200}textValue:(\i),editorHeight:\i,channelId:\i\.id\}\)),\i/,
                replace: ",$self.renderCounter({editorRef:$1,text:$2})"
            }
        },
        {
            find: "#{intl::PREMIUM_MESSAGE_LENGTH_UPSELL_TOOLTIP}",
            replacement: {
                match: /(?<=\.PREMIUM_UPSELL\);)(?=.{0,50}\.PREMIUM_UPSELL_VIEWED)/,
                replace: "return null;"
            }
        }
    ],

    renderCounter: withErrorBoundary("CharacterCounter", CharacterCounter)
});
