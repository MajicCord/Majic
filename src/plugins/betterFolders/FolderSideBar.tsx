/*
 * Majic — BetterFolders sidebar
 */

import { withErrorBoundary } from "@utils/ErrorBoundary";
import { filters, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";
import { React, Stores, useStateFromStores } from "@webpack/common";
import type { CSSProperties } from "react";

import { ExpandedGuildFolderStore, settings, SortedGuildStore } from ".";

const GuildsBar = findComponentByCodeLazy('("guildsnav")');

const Animations = mapMangledModuleLazy(".assign({colorNames:", {
    Transition: filters.componentByCode('["items","children"]', ",null,"),
    animated: filters.byProps("div", "text")
});

function getExpandedFolderIds() {
    const expandedFolders = ExpandedGuildFolderStore.getExpandedFolders();
    const folders = SortedGuildStore.getGuildFolders();

    const expandedFolderIds = new Set<string>();
    for (const folder of folders) {
        if (expandedFolders.has(folder.folderId) && folder.guildIds?.length) expandedFolderIds.add(folder.folderId);
    }

    return expandedFolderIds;
}

function FolderSideBar(guildsBarProps: any) {
    const expandedFolderIds = useStateFromStores([ExpandedGuildFolderStore, SortedGuildStore], () => getExpandedFolderIds());
    const isFullscreen = useStateFromStores([Stores.ChannelRTCStore], () => Stores.ChannelRTCStore.isFullscreenInContext());

    const Sidebar = <GuildsBar {...guildsBarProps} isBetterFolders={true} betterFoldersExpandedIds={expandedFolderIds} />;

    const visible = !!expandedFolderIds.size;
    const guilds = document.querySelector(guildsBarProps.className.split(" ").map((c: string) => `.${c}`).join(""));

    const sidebarStyle = { display: isFullscreen ? "none" : "flex" } satisfies CSSProperties;

    if (!guilds || !settings.store.sidebarAnim) {
        return visible ? <div className="majic-better-folders-sidebar" style={sidebarStyle}>{Sidebar}</div> : null;
    }

    return (
        <Animations.Transition
            items={visible}
            from={{ width: 0 }}
            enter={{ width: guilds.getBoundingClientRect().width }}
            leave={{ width: 0 }}
            config={{ duration: 200 }}
        >
            {(animationStyle: any, show: any) =>
                show && (
                    <Animations.animated.div className="majic-better-folders-sidebar" style={{ ...animationStyle, ...sidebarStyle }}>
                        {Sidebar}
                    </Animations.animated.div>
                )}
        </Animations.Transition>
    );
}

export default withErrorBoundary("BetterFolders", FolderSideBar);
