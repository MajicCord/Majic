/*
 * Majic — BetterFolders plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, React } from "@webpack/common";
import type { ReactNode } from "react";

import FolderSideBar from "./FolderSideBar";

const s = createStrings({
    en: { never: "Never", always: "Always", moreThanOne: "When more than one folder is expanded" },
    fr: { never: "Jamais", always: "Toujours", moreThanOne: "Quand plus d'un dossier est ouvert" }
});

const FolderIconDisplay = {
    Never: 0,
    Always: 1,
    MoreThanOneFolderExpanded: 2
} as const;

const logger = new Logger("BetterFolders", "#8be9fd");

export const ExpandedGuildFolderStore = findStoreLazy("ExpandedGuildFolderStore");
export const SortedGuildStore = findStoreLazy("SortedGuildStore");
const FolderUtils = findByPropsLazy("move", "toggleGuildFolderExpand");

let lastGuildId = null as string | null;
let dispatchingFoldersClose = false;

function getGuildFolder(id: string) {
    return SortedGuildStore.getGuildFolders().find((folder: { guildIds: string[] }) => folder.guildIds.includes(id));
}

function closeFolders() {
    for (const id of ExpandedGuildFolderStore.getExpandedFolders()) FolderUtils.toggleGuildFolderExpand(id);
}

function filterTreeWithTargetNode(children: any, predicate: (node: any) => boolean): boolean {
    if (children == null) return false;

    if (!Array.isArray(children)) {
        if (predicate(children)) return true;
        return filterTreeWithTargetNode(children.props?.children, predicate);
    }

    let childIsTargetChild = false;
    for (let i = 0; i < children.length; i++) {
        if (filterTreeWithTargetNode(children[i], predicate)) {
            childIsTargetChild = true;
            continue;
        }
        children.splice(i--, 1);
    }

    return childIsTargetChild;
}

export const settings = definePluginSettings({
    sidebar: {
        type: OptionType.BOOLEAN,
        description: "Display servers from folders in a dedicated sidebar",
        restartNeeded: true,
        default: true
    },
    sidebarAnim: {
        type: OptionType.BOOLEAN,
        description: "Animate opening the folder sidebar",
        default: true
    },
    closeAllFolders: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when selecting a server not in a folder",
        default: false
    },
    closeAllHomeButton: {
        type: OptionType.BOOLEAN,
        description: "Close all folders when clicking on the home button",
        restartNeeded: true,
        default: false
    },
    closeOthers: {
        type: OptionType.BOOLEAN,
        description: "Close other folders when opening a folder",
        default: false
    },
    closeServerFolder: {
        type: OptionType.BOOLEAN,
        description: "Close a folder when selecting a server in that folder",
        default: false
    },
    forceOpen: {
        type: OptionType.BOOLEAN,
        description: "Force a folder to open when switching to a server of that folder",
        default: false
    },
    keepIcons: {
        type: OptionType.BOOLEAN,
        description: "Keep showing server icons in the main server bar folder when it's open in the folder sidebar",
        restartNeeded: true,
        default: false
    },
    showFolderIcon: {
        type: OptionType.SELECT,
        description: "Show the folder icon above the folder servers in the folder sidebar",
        options: [
            { get label() { return s("never"); }, value: FolderIconDisplay.Never },
            { get label() { return s("always"); }, value: FolderIconDisplay.Always, default: true },
            { get label() { return s("moreThanOne"); }, value: FolderIconDisplay.MoreThanOneFolderExpanded }
        ],
        restartNeeded: true
    }
});

const IS_BETTER_FOLDERS_VAR = "typeof isBetterFolders!=='undefined'?isBetterFolders:arguments[0]?.isBetterFolders";
const BETTER_FOLDERS_EXPANDED_IDS_VAR = "typeof betterFoldersExpandedIds!=='undefined'?betterFoldersExpandedIds:arguments[0]?.betterFoldersExpandedIds";
const GRID_STYLE_NAME = "majic-better-folders-sidebar-grid";

export default definePlugin({
    name: "BetterFolders",
    description: "Shows server folders in a dedicated sidebar and adds folder related improvements",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les dossiers de serveurs dans une barre latérale dédiée et améliore la gestion des dossiers",
            options: {
                sidebar: "Afficher les serveurs des dossiers dans une barre latérale dédiée",
                sidebarAnim: "Animer l'ouverture de la barre latérale des dossiers",
                closeAllFolders: "Fermer tous les dossiers en choisissant un serveur hors dossier",
                closeAllHomeButton: "Fermer tous les dossiers en cliquant sur le bouton d'accueil",
                closeOthers: "Fermer les autres dossiers à l'ouverture d'un dossier",
                closeServerFolder: "Fermer un dossier en choisissant un de ses serveurs",
                forceOpen: "Ouvrir le dossier d'un serveur quand tu passes sur ce serveur",
                keepIcons: "Garder les icônes des serveurs dans le dossier de la barre principale quand il est ouvert dans la barre latérale",
                showFolderIcon: "Afficher l'icône du dossier au-dessus de ses serveurs dans la barre latérale"
            }
        }
    },
    settings,

    css: [
        ".majic-better-folders-sidebar { grid-area: betterFoldersSidebar; }",
        `.${GRID_STYLE_NAME} { grid-template-columns: [start] min-content [guildsEnd] min-content [sidebarEnd] min-content [channelsEnd] 1fr [end]; grid-template-areas: "titleBar titleBar titleBar titleBar" "guildsList betterFoldersSidebar notice notice" "guildsList betterFoldersSidebar channelsList page"; }`
    ].join(" "),

    patches: [
        {
            find: '("guildsnav")',
            predicate: () => settings.store.sidebar,
            replacement: [
                {
                    match: /{disableAppDownload:\i=\i\.isPlatformEmbedded,isOverlay:.+?(?=}=\i)/,
                    replace: "$&,isBetterFolders,betterFoldersExpandedIds"
                },
                {
                    match: /,{guildDiscoveryButton:\i,/g,
                    replace: "$&isBetterFolders:arguments[0]?.isBetterFolders,betterFoldersExpandedIds:arguments[0]?.betterFoldersExpandedIds,"
                },
                {
                    match: /switch\((\i)\.type\){.+?default:return null}/,
                    replace: `return $self.wrapGuildNodeComponent($1,()=>{$&},${IS_BETTER_FOLDERS_VAR},${BETTER_FOLDERS_EXPANDED_IDS_VAR});`
                },
                {
                    match: /switch\(\i\.type\){case \i\.\i\.FOLDER:.+?folderNode:\i,/,
                    replace: `$&isBetterFolders:${IS_BETTER_FOLDERS_VAR},`
                },
                {
                    match: /switch\(\i\.type\).+?,\i,\i\.setNodeRef/,
                    replace: "$&,arguments[0]?.isBetterFolders,arguments[0]?.betterFoldersExpandedIds"
                },
                {
                    match: /lastTargetNode:\i\[\i\.length-1\].+?}\)(?::null)?\](?=}\))/,
                    replace: "$&.filter($self.makeGuildsBarGuildListFilter(!!arguments[0]?.isBetterFolders))"
                },
                {
                    match: /reverse:!0,.{0,150}?barClassName:.+?\}\)\]/,
                    replace: "$&.filter($self.makeGuildsBarSidebarFilter(!!arguments[0]?.isBetterFolders))"
                }
            ]
        },
        {
            find: ".toggleGuildFolderExpand(",
            predicate: () => settings.store.sidebar && settings.store.showFolderIcon !== FolderIconDisplay.Always,
            replacement: [
                {
                    match: /(\],\(\)=>)(\i\.\i)\.isFolderExpanded\(\i\)\)/,
                    replace: (_: string, rest: string, store: string) => `${rest}${store}.getExpandedFolders())`
                },
                {
                    match: /(?<=\.\.\.\i,folderNode:(\i),expanded:)\i(?=,)/,
                    replace: (isExpandedOrExpandedIds: string, folderNode: string) => ""
                        + `typeof ${isExpandedOrExpandedIds}==="boolean"?${isExpandedOrExpandedIds}:${isExpandedOrExpandedIds}.has(${folderNode}.id),`
                        + `betterFoldersExpandedIds:${isExpandedOrExpandedIds} instanceof Set?${isExpandedOrExpandedIds}:void 0`
                }
            ]
        },
        {
            find: ".FOLDER_ITEM_ANIMATION_DURATION),",
            predicate: () => settings.store.sidebar,
            replacement: [
                {
                    predicate: () => settings.store.keepIcons,
                    match: /{folderNode:\i,setNodeRef:\i,.+?expanded:(\i),.+?;(?=let)/,
                    replace: (m: string, isExpanded: string) => `${m}${isExpanded}=!!arguments[0]?.isBetterFolders&&${isExpanded};`
                },
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /(?=,\{from:\{height)/,
                    replace: "&&$self.shouldShowTransition(arguments[0])"
                },
                {
                    predicate: () => !settings.store.keepIcons,
                    match: /"--custom-folder-color".+?(?=\i\(\(\i,\i,\i\)=>{let{key:.{0,70}"ul")(?<=selected:\i,expanded:(\i),.+?)/,
                    replace: (m: string, isExpanded: string) => `${m}$self.shouldRenderContents(arguments[0],${isExpanded})?null:`
                },
                {
                    predicate: () => settings.store.showFolderIcon !== FolderIconDisplay.Always,
                    match: /"--custom-folder-color".{0,110}?children:\[/,
                    replace: "$&$self.shouldShowFolderIconAndBackground(!!arguments[0]?.isBetterFolders,arguments[0]?.betterFoldersExpandedIds)&&"
                },
                {
                    predicate: () => settings.store.showFolderIcon !== FolderIconDisplay.Always,
                    match: /"--custom-folder-color".+?className:\i\.\i}\),(?=\i,)/,
                    replace: "$&!$self.shouldShowFolderIconAndBackground(!!arguments[0]?.isBetterFolders,arguments[0]?.betterFoldersExpandedIds)?null:"
                }
            ]
        },
        {
            find: "APPLICATION_LIBRARY,render:",
            predicate: () => settings.store.sidebar,
            group: true,
            replacement: [
                {
                    match: /(?<=[[,])((?:!?\i&&)+)\(.{0,50}({className:\i\.\i,themeOverride:\i})\)/g,
                    replace: (m: string, conditions: string, props: string) => `${m},${conditions}$self.FolderSideBar(${props})`
                },
                {
                    match: /(?<=className:)\i\.\i(?=,"data-fullscreen")/,
                    replace: `"${GRID_STYLE_NAME} "+$&`
                },
                {
                    match: /(?<="aria-valuemax":\d+,className:\i\.\i,onClick:\i,onMouseDown:)(\i)/,
                    replace: "majicEvent=>$1($self.fixChannelsResizeSliderOffset(majicEvent))"
                }
            ]
        },
        {
            find: "#{intl::DISCODO_DISABLED}",
            predicate: () => settings.store.closeAllHomeButton,
            replacement: {
                match: /(?<=onClick:(?:function)?\(\)(?:=>)?{)(?=.{0,300}"discodo")/,
                replace: "$self.closeFolders();"
            }
        }
    ],

    flux: {
        CHANNEL_SELECT(data: { guildId: string }) {
            if (!settings.store.closeAllFolders && !settings.store.forceOpen && !settings.store.closeServerFolder) return;
            if (lastGuildId === data.guildId) return;

            lastGuildId = data.guildId;
            const guildFolder = getGuildFolder(data.guildId);

            if (guildFolder?.folderId) {
                const wasExpanded = ExpandedGuildFolderStore.isFolderExpanded(guildFolder.folderId);

                if (settings.store.forceOpen && !wasExpanded) FolderUtils.toggleGuildFolderExpand(guildFolder.folderId);
                if (settings.store.closeServerFolder && wasExpanded) FolderUtils.toggleGuildFolderExpand(guildFolder.folderId);
            } else if (settings.store.closeAllFolders) {
                closeFolders();
            }
        },

        TOGGLE_GUILD_FOLDER_EXPAND(data: { folderId: unknown }) {
            if (!settings.store.closeOthers || dispatchingFoldersClose) return;
            dispatchingFoldersClose = true;

            FluxDispatcher.wait(() => {
                const expandedFolders = ExpandedGuildFolderStore.getExpandedFolders();

                if (expandedFolders.size > 1) {
                    for (const id of expandedFolders) if (id !== data.folderId) FolderUtils.toggleGuildFolderExpand(id);
                }

                dispatchingFoldersClose = false;
            });
        },

        LOGOUT() {
            closeFolders();
        }
    },

    FolderSideBar,
    closeFolders,

    wrapGuildNodeComponent(node: any, originalComponent: () => ReactNode, isBetterFolders: boolean, expandedFolderIds?: Set<any>) {
        if (
            !isBetterFolders
            || node.type === "folder" && expandedFolderIds?.has(node.id)
            || node.type === "guild" && expandedFolderIds?.has(node.parentId)
        ) {
            return originalComponent();
        }

        return <div style={{ display: "none" }}>{originalComponent()}</div>;
    },

    makeGuildsBarGuildListFilter(isBetterFolders: boolean) {
        return (child: any) => {
            if (!isBetterFolders) return true;

            try {
                const serversIntlMsg = getIntlMessage("SERVERS");
                if (!serversIntlMsg) {
                    logger.error("Failed to get SERVERS intl message");
                    return true;
                }
                return child?.props?.["aria-label"] === serversIntlMsg;
            } catch (err) {
                logger.error(err);
                return true;
            }
        };
    },

    makeGuildsBarSidebarFilter(isBetterFolders: boolean) {
        return (child: any) => {
            if (!isBetterFolders) return true;

            try {
                return filterTreeWithTargetNode(child, node => node?.props?.renderTreeNode != null);
            } catch (err) {
                logger.error(err);
                return true;
            }
        };
    },

    shouldShowFolderIconAndBackground(isBetterFolders: boolean, expandedFolderIds?: Set<any>) {
        if (!isBetterFolders) return true;

        switch (settings.store.showFolderIcon) {
            case FolderIconDisplay.Never:
                return false;
            case FolderIconDisplay.Always:
                return true;
            case FolderIconDisplay.MoreThanOneFolderExpanded:
                return (expandedFolderIds?.size ?? 0) > 1;
            default:
                return true;
        }
    },

    fixChannelsResizeSliderOffset(event: MouseEvent) {
        const sidebar = document.querySelector<HTMLElement>(".majic-better-folders-sidebar");
        if (sidebar != null) Object.defineProperty(event, "screenX", { value: event.screenX + sidebar.offsetWidth });
        return event;
    },

    shouldShowTransition(props: any) {
        if (props?.folderNode?.id === 1) return true;
        return !!props?.isBetterFolders;
    },

    shouldRenderContents(props: any, isExpanded: boolean) {
        if (props?.folderNode?.id === 1) return false;
        return !props?.isBetterFolders && isExpanded;
    }
});
