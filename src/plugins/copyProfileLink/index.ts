/*
 * Majic — CopyProfileLink plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";
import { React, showToast } from "@webpack/common";

function copyToClipboard(text: string) {
    const native = (window as any).DiscordNative?.clipboard;
    if (native?.copy) native.copy(text);
    else void navigator.clipboard.writeText(text);
}

export default definePlugin({
    name: "CopyProfileLink",
    description: "Adds a \"Copy Profile Link\" item to the user context menu",
    authors: [{ name: "SnailyStudios" }],
    enabledByDefault: true,

    contextMenus: {
        "user-context"(children, props?: { user?: { id: string; username: string } }) {
            const user = props?.user;
            if (!user || !Menu.MenuItem) return;

            const item = React.createElement(Menu.MenuItem, {
                id: "majic-copy-profile-link",
                label: "Copy Profile Link",
                action: () => {
                    copyToClipboard(`https://discord.com/users/${user.id}`);
                    showToast({ text: `Copied ${user.username}'s profile link`, variant: "success" });
                }
            });

            const group = findGroupChildrenByChildId("devmode-copy-id", children);
            if (group) group.push(item);
            else children.push(item);
        }
    }
});
