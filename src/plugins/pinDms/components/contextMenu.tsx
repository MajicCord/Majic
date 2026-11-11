/*
 * Majic — PinDMs context menus
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { React } from "@webpack/common";

import { addChannelToCategory, canMoveChannelInDirection, currentUserCategories, isPinned, moveChannel, removeChannelFromCategory } from "../data";
import { PinOrder, s, settings } from "../settings";
import { openCategoryModal } from "./CreateCategoryModal";

function createPinMenuItem(channelId: string) {
    const pinned = isPinned(channelId);
    const showSeparator = pinned || currentUserCategories.length > 0;

    return (
        <Menu.MenuItem id="majic-pin-dm" key="majic-pin-dm" label={s("pinDms")}>
            {!pinned && (
                <>
                    <Menu.MenuItem
                        id="majic-add-category"
                        label={s("addCategory")}
                        color="brand"
                        action={() => openCategoryModal(null, channelId)}
                    />
                    {showSeparator && <Menu.MenuSeparator />}

                    {currentUserCategories.map(category => (
                        <Menu.MenuItem
                            key={category.id}
                            id={`pin-category-${category.id}`}
                            label={category.name}
                            action={() => addChannelToCategory(channelId, category.id)}
                        />
                    ))}
                </>
            )}

            {pinned && (
                <>
                    <Menu.MenuItem
                        id="majic-unpin-dm"
                        label={s("unpinDm")}
                        color="danger"
                        action={() => removeChannelFromCategory(channelId)}
                    />

                    {settings.store.pinOrder === PinOrder.Custom && canMoveChannelInDirection(channelId, -1) && (
                        <Menu.MenuItem id="move-up" label={s("moveUp")} action={() => moveChannel(channelId, -1)} />
                    )}

                    {settings.store.pinOrder === PinOrder.Custom && canMoveChannelInDirection(channelId, 1) && (
                        <Menu.MenuItem id="move-down" label={s("moveDown")} action={() => moveChannel(channelId, 1)} />
                    )}
                </>
            )}
        </Menu.MenuItem>
    );
}

export const contextMenus = {
    "gdm-context"(children: any[], props: any) {
        if (!props?.channel) return;
        findGroupChildrenByChildId("leave-channel", children)?.unshift(createPinMenuItem(props.channel.id));
    },
    "user-context"(children: any[], props: any) {
        if (!props?.channel) return;
        const container = findGroupChildrenByChildId("close-dm", children);
        if (container) {
            const idx = container.findIndex(c => c?.props?.id === "close-dm");
            container.splice(idx, 0, createPinMenuItem(props.channel.id));
        }
    }
};
