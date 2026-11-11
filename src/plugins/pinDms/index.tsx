/*
 * Majic — PinDMs plugin
 */

import { Menu } from "@api/contextMenu";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { filters, findCssClassesLazy, mapMangledModuleLazy } from "@webpack";
import { Clickable, ContextMenuApi, DiscordIcon, FluxDispatcher, React } from "@webpack/common";

import { contextMenus } from "./components/contextMenu";
import { openCategoryModal, requireSettingsModal } from "./components/CreateCategoryModal";
import { DEFAULT_CHUNK_SIZE } from "./constants";
import { canMoveCategory, canMoveCategoryInDirection, type Category, categoryLen, collapseCategory, getAllUncollapsedChannels, getCategoryByIndex, getSections, init, isPinned, moveCategory, removeCategory, usePinnedDms } from "./data";
import { PinOrder, PrivateChannelSortStore, s, settings } from "./settings";

const headerClasses = findCssClassesLazy("privateChannelsHeaderContainer", "headerText");

export let instance: any;

function CategoryHeader({ section }: { section: number }) {
    const category = getCategoryByIndex(section - 1);
    if (!category) return null;

    return (
        <Clickable
            onClick={() => collapseCategory(category.id, !category.collapsed)}
            onContextMenu={(e: React.MouseEvent) => {
                ContextMenuApi.openContextMenu(e, () => (
                    <Menu.Menu
                        navId="majic-pindms-header-menu"
                        onClose={() => FluxDispatcher.dispatch({ type: "CONTEXT_MENU_CLOSE" })}
                        color="danger"
                        aria-label={s("categoryMenu")}
                    >
                        <Menu.MenuItem
                            id="majic-pindms-edit-category"
                            label={s("editCategory")}
                            action={() => openCategoryModal(category.id, null)}
                        />

                        {canMoveCategory(category.id) && (
                            <>
                                {canMoveCategoryInDirection(category.id, -1) && (
                                    <Menu.MenuItem id="majic-pindms-move-category-up" label={s("moveUp")} action={() => moveCategory(category.id, -1)} />
                                )}
                                {canMoveCategoryInDirection(category.id, 1) && (
                                    <Menu.MenuItem id="majic-pindms-move-category-down" label={s("moveDown")} action={() => moveCategory(category.id, 1)} />
                                )}
                            </>
                        )}

                        <Menu.MenuSeparator />
                        <Menu.MenuItem
                            id="majic-pindms-delete-category"
                            color="danger"
                            label={s("deleteCategory")}
                            action={() => removeCategory(category.id)}
                        />
                    </Menu.Menu>
                ));
            }}
        >
            <h2
                className={classes(headerClasses.privateChannelsHeaderContainer, "majic-pindms-section-container", category.collapsed && "majic-pindms-collapsed")}
                style={{ color: `#${category.color.toString(16).padStart(6, "0")}` }}
            >
                <span className={headerClasses.headerText}>{category.name}</span>
                <span className="majic-pindms-collapse-icon">
                    <DiscordIcon name="ChevronSmallRightIcon" size={16} />
                </span>
            </h2>
        </Clickable>
    );
}

const CSS = [
    ".majic-pindms-section-container { box-sizing: border-box; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; font-size: 14px; line-height: 16px; letter-spacing: 0.02em; font-family: var(--font-primary); font-weight: 500; flex: 1 1 auto; color: var(--channels-default); cursor: pointer; }",
    ".majic-pindms-modal-color-picker { margin-inline-end: 0; [class*=\"defaultContainer\"] { display: none; } }",
    ".majic-pindms-modal-content { display: grid; gap: 1.5em; }",
    ".majic-pindms-heading { margin: 0 0 8px; color: var(--text-strong); font-size: 14px; font-weight: 600; }",
    ".majic-pindms-collapse-icon { display: flex; width: 16px; height: 16px; color: var(--interactive-icon-default); transform: rotate(90deg); }",
    ".majic-pindms-collapsed .majic-pindms-collapse-icon { transform: rotate(0deg); }"
].join(" ");

export default definePlugin({
    name: "PinDMs",
    description: "Pin private channels to the top of your DM list. Right click DMs to pin, unpin or reorder them",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Épingle des conversations privées en haut de ta liste de MP. Clic droit sur un MP pour l'épingler, le désépingler ou le réordonner",
            options: {
                pinOrder: "Ordre d'affichage des MP épinglés",
                canCollapseDmSection: "Permettre de replier la section des MP non classés"
            }
        }
    },
    settings,
    contextMenus,

    css: CSS,

    patches: [
        {
            find: '"dm-quick-launcher"===',
            replacement: [
                {
                    match: /(?<=channels:\i,)privateChannelIds:(\i)(?=,listRef:)/,
                    replace: "privateChannelIds:$1.filter(c=>!$self.isPinned(c))"
                },
                {
                    match: /(?<=renderRow:this\.renderRow,)sections:\[.+?1\)]/,
                    replace: "...$self.makeProps(this,{$&})"
                },
                {
                    match: /renderRow(?:",|=)(\i)=>{(?<=renderDM(?:",|=).+?(\i\.\i),\{channel:.+?)/,
                    replace: "$&if($self.isChannelIndex($1.section, $1.row))return $self.renderChannel($1.section,$1.row,$2)();"
                },
                {
                    match: /renderSection(?:",|=)(\i)=>{/,
                    replace: "$&if($self.isCategoryIndex($1.section))return $self.renderCategory($1);"
                },
                {
                    match: /renderSection(?:",|=).{0,300}?"span",{/,
                    replace: "$&...$self.makeSpanProps(),"
                },
                {
                    match: /(\.startsWith\("section-divider"\).+?return 1===)(\i)/,
                    replace: "$1($2-$self.categoryLen())"
                },
                {
                    match: /getRowHeight(?:",|=)\((\i),(\i)\)=>{/,
                    replace: "$&if($self.isChannelHidden($1,$2))return 0;"
                },
                {
                    match: /(?<=scrollTo\(\{to:\i\}\):\(\i\+=)(\d+)\*\(.+?(?=,)/,
                    replace: "$self.getScrollOffset(arguments[0],$1,this?.props?.padding,this?.state?.preRenderedChildren,$&)"
                },
                {
                    match: /(scrollToChannel\(\i\){.{1,300})(this\.props\.privateChannelIds)/,
                    replace: "$1[...$2,...$self.getAllUncollapsedChannels()]"
                }
            ]
        },
        {
            find: ".FRIENDS},\"friends\"",
            replacement: {
                match: /let{showLibrary:\i,/,
                replace: "$self.usePinnedDms();$&"
            }
        },
        {
            find: ".APPLICATION_STORE&&",
            replacement: {
                match: /(?<=\i=__OVERLAY__\?\i:\[\.\.\.\i\(\),\.\.\.)\i/,
                replace: "$self.getAllUncollapsedChannels().concat($&.filter(c=>!$self.isPinned(c)))"
            }
        },
        {
            find: "=()=>!1,ensureChatIsVisible:",
            replacement: {
                match: /(?<=\i===\i\.ME\?)\i\.\i\.getPrivateChannelIds\(\)/,
                replace: "$self.getAllUncollapsedChannels().concat($&.filter(c=>!$self.isPinned(c)))"
            }
        }
    ],

    sections: null as number[] | null,
    instance: null as any,

    set _instance(i: any) {
        this.instance = i;
        instance = i;
    },

    startAt: "WebpackReady",
    start: init,
    flux: {
        CONNECTION_OPEN: init
    },

    usePinnedDms,
    isPinned,
    categoryLen,
    getSections,
    getAllUncollapsedChannels,
    requireSettingsMenu: requireSettingsModal,

    makeProps(componentInstance: any, { sections }: { sections: number[] }) {
        this._instance = componentInstance;
        this.sections = sections;

        this.sections.splice(1, 0, ...this.getSections());

        if (this.instance?.props?.privateChannelIds?.length === 0) {
            this.sections[this.sections.length - 1] = 0;
        }

        return {
            sections: this.sections,
            chunkSize: this.getChunkSize()
        };
    },

    makeSpanProps() {
        return settings.store.canCollapseDmSection ? {
            onClick: () => this.collapseDMList(),
            role: "button",
            style: { cursor: "pointer" }
        } : undefined;
    },

    getChunkSize() {
        const sections = this.getSections();
        const sectionHeaderSizePx = sections.length * 40;
        return (sectionHeaderSizePx + sections.reduce((acc, v) => acc + v * 44, 0) + DEFAULT_CHUNK_SIZE) * 1.5;
    },

    isCategoryIndex(sectionIndex: number) {
        return this.sections && sectionIndex > 0 && sectionIndex < this.sections.length - 1;
    },

    isChannelIndex(sectionIndex: number, channelIndex: number) {
        if (settings.store.canCollapseDmSection && settings.store.dmSectionCollapsed && sectionIndex !== 0) return true;

        const category = getCategoryByIndex(sectionIndex - 1);
        return this.isCategoryIndex(sectionIndex) && (category?.channels?.length === 0 || category?.channels[channelIndex]);
    },

    collapseDMList() {
        settings.store.dmSectionCollapsed = !settings.store.dmSectionCollapsed;
    },

    isChannelHidden(categoryIndex: number, channelIndex: number) {
        if (categoryIndex === 0) return false;

        if (settings.store.canCollapseDmSection && settings.store.dmSectionCollapsed && this.getSections().length + 1 === categoryIndex) return true;

        if (!this.instance || !this.isChannelIndex(categoryIndex, channelIndex)) return false;

        const category = getCategoryByIndex(categoryIndex - 1);
        if (!category) return false;

        return category.collapsed && this.instance.props.selectedChannelId !== this.getCategoryChannels(category)[channelIndex];
    },

    getScrollOffset(channelId: string, rowHeight: number, padding: number, preRenderedChildren: number, originalOffset: number) {
        if (!isPinned(channelId)) {
            return (rowHeight + padding) * 2
                + rowHeight * this.getAllUncollapsedChannels().length
                + originalOffset;
        }

        return rowHeight * (this.getAllUncollapsedChannels().indexOf(channelId) + preRenderedChildren) + padding;
    },

    renderCategory: withErrorBoundary("PinDMs", CategoryHeader),

    renderChannel(sectionIndex: number, index: number, ChannelComponent: React.ComponentType<{ children: React.ReactNode; channel: any; selected: boolean }>) {
        return withErrorBoundary("PinDMs", () => {
            const { channel, category } = this.getChannel(sectionIndex, index, this.instance.props.channels);

            if (!channel || !category) return null;
            if (this.isChannelHidden(sectionIndex, index)) return null;

            return (
                <ChannelComponent channel={channel} selected={this.instance.props.selectedChannelId === channel.id}>
                    {channel.id}
                </ChannelComponent>
            );
        });
    },

    getChannel(sectionIndex: number, index: number, channels: Record<string, any>) {
        const category = getCategoryByIndex(sectionIndex - 1);
        if (!category) return { channel: null, category: null };

        const channelId = this.getCategoryChannels(category)[index];
        return { channel: channels[channelId], category };
    },

    getCategoryChannels(category: Category) {
        if (category.channels.length === 0) return [];

        if (settings.store.pinOrder === PinOrder.LastMessage) {
            return PrivateChannelSortStore.getPrivateChannelIds().filter(c => category.channels.includes(c));
        }

        return category.channels ?? [];
    }
});
