/*
 * Majic — ChatButtonsAPI core plugin
 */

import { _injectChatBarButtons, getChatBarButtonIds, isChatBarButtonEnabled, setChatBarButtonEnabled } from "@api/chatButtons";
import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { createStrings } from "@i18n";
import { definePlugin } from "@utils/types";
import { React } from "@webpack/common";

const s = createStrings({
    en: { buttons: "Majic Buttons" },
    fr: { buttons: "Boutons Majic" }
});

const buttonLabel = (id: string) => id.replace(/-[^-]+$/, "");

export default definePlugin({
    name: "ChatButtonsAPI",
    description: "Lets plugins add buttons to the chat bar",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Permet aux plugins d'ajouter des boutons à la barre de saisie"
        }
    },
    required: true,

    patches: [
        {
            find: '"sticker")',
            replacement: {
                match: /0===(\i)\.length(?=.{0,25}?\(0,\i\.jsxs?\)\(.{0,75}?children:\1)/,
                replace: "($self.injectButtons($1,arguments[0]),$&)"
            }
        }
    ],

    contextMenus: {
        "textarea-context"(children) {
            const ids = getChatBarButtonIds();
            if (!ids.length) return;

            const group = findGroupChildrenByChildId("submit-button", children);
            if (!group) return;

            const index = group.findIndex(child => child?.props?.id === "submit-button");
            if (index === -1) return;

            group.splice(index, 0,
                <Menu.MenuItem id="majic-chat-buttons" key="majic-chat-buttons" label={s("buttons")}>
                    {ids.map(id => (
                        <Menu.MenuCheckboxItem
                            key={id}
                            id={`majic-chat-button-${id}`}
                            label={buttonLabel(id)}
                            checked={isChatBarButtonEnabled(id)}
                            action={() => setChatBarButtonEnabled(id, !isChatBarButtonEnabled(id))}
                        />
                    ))}
                </Menu.MenuItem>
            );
        }
    },

    injectButtons: _injectChatBarButtons
});
