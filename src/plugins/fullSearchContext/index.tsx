/*
 * Majic — FullSearchContext plugin
 */

import { findGroupChildrenByChildId } from "@api/contextMenu";
import { getIntlMessage } from "@utils/discord";
import { definePlugin } from "@utils/types";
import { filters, findByCodeLazy, mapMangledModuleLazy, waitFor } from "@webpack";
import { React, Stores } from "@webpack/common";

const ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: filters.byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: filters.byCode("renderLazy:"),
    openContextMenuLazy: (e: any) => typeof e === "function" && e.toString().length < 100
});

const useMessageMenu = findByCodeLazy(".MESSAGE,commandTargetId:");

let CopyIdMenuItem: (props: { id: string; label: string }) => React.ReactElement | null = () => null;
waitFor(filters.componentByCode('"cannot copy null text"'), m => CopyIdMenuItem = m);

function MessageMenu({ message, channel, onHeightUpdate }: { message: any; channel: any; onHeightUpdate: unknown }) {
    const canReport = message.author && !(message.author.id === Stores.UserStore.getCurrentUser().id || message.author.system);

    return useMessageMenu({
        navId: "message-actions",
        ariaLabel: getIntlMessage("MESSAGE_UTILITIES_A11Y_LABEL"),

        message,
        channel,
        canReport,
        onHeightUpdate,
        onClose: () => ContextMenuApi.closeContextMenu(),

        textSelection: "",
        favoriteableType: null,
        favoriteableId: null,
        favoriteableName: null,
        itemHref: void 0,
        itemSrc: void 0,
        itemSafeSrc: void 0,
        itemTextContent: void 0,

        isFullSearchContextMenu: true
    });
}

export default definePlugin({
    name: "FullSearchContext",
    description: "Gives the message context menu in search results all the options you'd expect",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Donne au menu clic droit des messages dans les résultats de recherche toutes les options habituelles"
        }
    },

    patches: [
        {
            find: "Listbox navigator was given an unhandled action",
            replacement: {
                match: /this(?=\.handleContextMenu\(\i,\i\))/,
                replace: "$self"
            }
        }
    ],

    handleContextMenu(event: React.MouseEvent, message: any) {
        const channel = Stores.ChannelStore.getChannel(message.channel_id);
        if (!channel) return;

        event.stopPropagation();

        ContextMenuApi.openContextMenu(event, (contextMenuProps: { onHeightUpdate: unknown }) => (
            <MessageMenu message={message} channel={channel} onHeightUpdate={contextMenuProps.onHeightUpdate} />
        ));
    },

    contextMenus: {
        "message-actions"(children, props: { message?: any; isFullSearchContextMenu?: boolean } = {}) {
            if (props?.isFullSearchContextMenu == null) return;

            const group = findGroupChildrenByChildId("devmode-copy-id", children, true);
            group?.push(CopyIdMenuItem({ id: props.message.author.id, label: getIntlMessage("COPY_ID_AUTHOR") }));
        }
    }
});
