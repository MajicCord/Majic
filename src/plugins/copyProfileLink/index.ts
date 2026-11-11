/*
 * Majic — CopyProfileLink plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";
import { createStrings } from "@i18n";
import { React, showToast } from "@webpack/common";

const s = createStrings({
    en: { label: "Copy Profile Link", copied: "Copied {name}'s profile link" },
    fr: { label: "Copier le lien du profil", copied: "Lien du profil de {name} copié" }
});

function copyToClipboard(text: string) {
    const native = (window as any).DiscordNative?.clipboard;
    if (native?.copy) native.copy(text);
    else void navigator.clipboard.writeText(text);
}

export default definePlugin({
    name: "CopyProfileLink",
    description: "Adds a \"Copy Profile Link\" item to the user context menu",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute « Copier le lien du profil » au menu clic droit des utilisateurs"
        }
    },
    enabledByDefault: true,

    contextMenus: {
        "user-context"(children, props?: { user?: { id: string; username: string } }) {
            const user = props?.user;
            if (!user || !Menu.MenuItem) return;

            const item = React.createElement(Menu.MenuItem, {
                id: "majic-copy-profile-link",
                label: s("label"),
                action: () => {
                    copyToClipboard(`https://discord.com/users/${user.id}`);
                    showToast({ text: s("copied", { name: user.username }), variant: "success" });
                }
            });

            const group = findGroupChildrenByChildId("devmode-copy-id", children);
            if (group) group.push(item);
            else children.push(item);
        }
    }
});
