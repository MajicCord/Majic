/*
 * Majic — CopyFileContents plugin
 */

import { createStrings } from "@i18n";
import { copyWithToast } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { DiscordIcon, React, Tooltip, useState } from "@webpack/common";

const s = createStrings({
    en: { copied: "Copied!", tooLarge: "File too large to copy", copy: "Copy File Contents" },
    fr: { copied: "Copié !", tooLarge: "Fichier trop gros pour être copié", copy: "Copier le contenu du fichier" }
});

function CopyButton({ fileContents, bytesLeft }: { fileContents: string; bytesLeft: number }) {
    const [recentlyCopied, setRecentlyCopied] = useState(false);

    return (
        <Tooltip text={recentlyCopied ? s("copied") : bytesLeft > 0 ? s("tooLarge") : s("copy")}>
            {(tooltipProps: Record<string, unknown>) => (
                <div
                    {...tooltipProps}
                    className="majic-cfc-button"
                    role="button"
                    onClick={() => {
                        if (recentlyCopied || bytesLeft > 0) return;
                        void copyWithToast(fileContents);
                        setRecentlyCopied(true);
                        setTimeout(() => setRecentlyCopied(false), 2000);
                    }}
                >
                    {recentlyCopied
                        ? <DiscordIcon name="CheckmarkLargeIcon" size={18} />
                        : bytesLeft > 0
                            ? <DiscordIcon name="CircleXIcon" size={18} color="var(--channel-icon)" />
                            : <DiscordIcon name="CopyIcon" size={18} />}
                </div>
            )}
        </Tooltip>
    );
}

export default definePlugin({
    name: "CopyFileContents",
    description: "Adds a button to text file attachments to copy their contents",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton aux fichiers texte joints pour copier leur contenu"
        }
    },

    css: ".majic-cfc-button { display: flex; align-items: center; margin-left: 16px; cursor: pointer; color: var(--interactive-icon-default); } .majic-cfc-button:hover { color: var(--interactive-icon-hover); }",

    patches: [
        {
            find: "#{intl::PREVIEW_BYTES_LEFT}",
            replacement: [
                {
                    match: /fileContents:(\i),bytesLeft:(\i)\}\):null,/,
                    replace: "$&$self.addCopyButton({fileContents:$1,bytesLeft:$2}),"
                },
                {
                    match: /align:"\i"\}\),(?=\(0,\i\.jsx\)\(\i,\{wordWrap:\i,setWordWrap:\i)/,
                    replace: "$&$self.addCopyButton(arguments[0]),"
                }
            ]
        }
    ],

    addCopyButton: withErrorBoundary("CopyFileContents", CopyButton)
});
