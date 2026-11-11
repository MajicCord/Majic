/*
 * Majic — MutualGroupDMs plugin
 */

import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { classes } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { filters, findByPropsLazy, findComponentLazy, findCssClassesLazy } from "@webpack";
import { Clickable, IconUtils, React, ScrollerThin, Stores, useMemo } from "@webpack/common";
import type { ComponentType, ReactNode } from "react";

const s = createStrings({
    en: {
        none: "No Mutual Groups",
        one: "1 Mutual Group",
        many: "{count} Mutual Groups",
        members: "{count} Members",
        empty: "You don't have any group chats in common",
        header: "Mutual Groups"
    },
    fr: {
        none: "Aucun groupe en commun",
        one: "1 groupe en commun",
        many: "{count} groupes en commun",
        members: "{count} membres",
        empty: "Vous n'avez aucun groupe en commun",
        header: "Groupes en commun"
    }
});

const SelectedChannelActionCreators = findByPropsLazy("selectPrivateChannel");
const UsernameUtils = findByPropsLazy("useName", "getGlobalName");
const Avatar = findComponentLazy(filters.componentByCode(".size-1.375*"));

const ProfileListClasses = findCssClassesLazy("empty", "textContainer", "connectionIcon");
const TabBarClasses = findCssClassesLazy("tabPanelScroller", "tabBarPanel");
const MutualsListClasses = findCssClassesLazy("row", "icon", "name", "details");

let ExpandableList: ComponentType<any> = () => null;

const logger = new Logger("MutualGroupDMs", "#ff79c6");

function getGroupDMName(channel: any) {
    return channel.name || channel.recipients
        .map((id: string) => Stores.UserStore.getUser(id))
        .filter((user: unknown) => user != null)
        .map((user: any) => Stores.RelationshipStore.getNickname(user.id) || UsernameUtils.getName(user))
        .join(", ");
}

const getMutualGroupDms = (userId: string): any[] =>
    Stores.ChannelStore.getSortedPrivateChannels().filter((c: any) => c.isGroupDM() && c.recipients.includes(userId));

const isBotOrSelf = (user: { bot?: boolean; id: string }) => user.bot || user.id === Stores.UserStore.getCurrentUser().id;

function getMutualGDMCountText(user: { id: string }) {
    const count = getMutualGroupDms(user.id).length;
    if (count === 0) return s("none");
    return count === 1 ? s("one") : s("many", { count });
}

function renderClickableGDMs(mutualDms: any[], onClose?: () => void) {
    return mutualDms.map(c => (
        <Clickable
            key={c.id}
            className={MutualsListClasses.row}
            onClick={() => {
                onClose?.();
                SelectedChannelActionCreators.selectPrivateChannel(c.id);
            }}
        >
            <Avatar src={IconUtils.getChannelIconURL({ id: c.id, icon: c.icon, size: 32 })} size="SIZE_40" className={MutualsListClasses.icon} />
            <div className={MutualsListClasses.details}>
                <div className={MutualsListClasses.name}>{getGroupDMName(c)}</div>
                <div className="majic-mutual-gdms-members">{s("members", { count: c.recipients.length + 1 })}</div>
            </div>
        </Clickable>
    ));
}

function MutualGDMs({ user, onClose, isLegacy }: { user: { id: string }; onClose(): void; isLegacy?: boolean }) {
    const mutualGDms = useMemo(() => getMutualGroupDms(user.id), [user.id]);
    const entries = renderClickableGDMs(mutualGDms, onClose);

    return (
        <ScrollerThin className={classes(TabBarClasses.tabPanelScroller, !isLegacy && "majic-mutual-gdms-scroller")} fade={true} onClose={onClose}>
            {entries.length > 0
                ? entries
                : (
                    <div className={ProfileListClasses.empty}>
                        <div className={ProfileListClasses.textContainer}>
                            <h2 className="majic-mutual-gdms-empty">{s("empty")}</h2>
                        </div>
                    </div>
                )}
        </ScrollerThin>
    );
}

function DMPageList({ user, hasDivider, Divider, listStyle }: { user: { id: string }; hasDivider: boolean; Divider: ReactNode; listStyle: string }) {
    const mutualGDms = getMutualGroupDms(user.id);
    if (mutualGDms.length === 0) return null;

    return (
        <>
            {hasDivider && Divider}
            <ExpandableList
                listClassName={classes(listStyle, "majic-mutual-gdms-dm-page-list")}
                header={s("header")}
                isLoading={false}
                items={renderClickableGDMs(mutualGDms)}
            />
        </>
    );
}

export default definePlugin({
    name: "MutualGroupDMs",
    description: "Shows mutual group DMs in profiles",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les groupes privés en commun dans les profils"
        }
    },

    css: [
        ".majic-mutual-gdms-modal-tab-bar { gap: 0; }",
        ".majic-mutual-gdms-modal-v2-tab-bar { --space-xl: 16px; }",
        ".majic-mutual-gdms-scroller { gap: 12px; margin-inline-start: -12px; }",
        ".majic-mutual-gdms-dm-page-list { gap: 0; margin-inline-start: -8px; }",
        ".majic-mutual-gdms-members { color: var(--text-muted); font-size: 12px; font-weight: 500; }",
        ".majic-mutual-gdms-empty { margin: 0; color: var(--text-strong); font-size: 16px; font-weight: 600; }"
    ].join(" "),

    patches: [
        {
            find: ".BOT_DATA_ACCESS?(",
            replacement: [
                {
                    match: /(?<=initialSection:\i=\i\.\i\.USER_INFO,onClose:\i\}=)(\i)/,
                    replace: "$self.getProps($1)"
                },
                {
                    match: /\(0,\i\.jsx\)\(\i,\{items:\i,section:(\i)/,
                    replace: "$1==='MUTUAL_GDMS'?$self.renderMutualGDMs({...arguments[0],isLegacy:true}):$&"
                },
                {
                    match: /className:\i\.\i(?=,type:"top")/,
                    replace: '$& + " majic-mutual-gdms-modal-tab-bar"'
                }
            ]
        },
        {
            find: ".WIDGETS?",
            replacement: [
                {
                    match: /(?<=items:\i,initialSection:\i,onClose:\i\}=)(\i)/,
                    replace: "$self.getProps($1)"
                },
                {
                    match: /children:(?=.{0,100}?component:.+?section:(\i))/,
                    replace: "$&$1.section==='MUTUAL_GDMS'?$self.renderMutualGDMs(arguments[0]):"
                },
                {
                    match: /type:"top",/,
                    replace: '$&className:"majic-mutual-gdms-modal-v2-tab-bar",'
                }
            ]
        },
        {
            find: 'section:"MUTUAL_FRIENDS"',
            replacement: [
                {
                    match: /\i\|\|\i(?=\?\(0,\i\.jsxs?\)\(\i\.\i\.Overlay,)/,
                    replace: "$&||$self.getMutualGroupDms(arguments[0].user.id).length>0"
                },
                {
                    match: /\.openUserProfileModal.+?\)}\)}\)(?<=,(\i)&&(\i)&&(\(0,\i\.jsxs?\)\(\i\.\i,{className:(\i)\.\i}\)).{0,50}?"MUTUAL_FRIENDS".+?)/,
                    replace: (m: string, hasMutualGuilds: string, hasMutualFriends: string, Divider: string, listClasses: string) =>
                        `${m},$self.renderDMPageList({user:arguments[0].user,hasDivider:${hasMutualGuilds}||${hasMutualFriends},Divider:${Divider},listStyle:${listClasses}.list})`
                },
                {
                    match: /(?=function (\i)\(\i\){let{section:\i,header:\i[^}]+?onExpand:)/,
                    replace: "$self.ExpandableList=$1;"
                }
            ]
        }
    ],

    set ExpandableList(value: ComponentType<any>) {
        ExpandableList = value;
    },

    getMutualGroupDms(userId: string) {
        try {
            return getMutualGroupDms(userId);
        } catch (err) {
            logger.error("Failed to get mutual group DMs", err);
        }
        return [];
    },

    getProps(props: { user: { id: string; bot?: boolean }; items: any[] }) {
        try {
            if (isBotOrSelf(props.user)) return props;

            const section = { text: getMutualGDMCountText(props.user), section: "MUTUAL_GDMS" };
            return { ...props, items: [...props.items, section] };
        } catch (err) {
            logger.error("Failed to append the mutual group DMs section", err);
        }
        return props;
    },

    renderMutualGDMs: withErrorBoundary("MutualGroupDMs", MutualGDMs),

    renderDMPageList: withErrorBoundary("MutualGroupDMs", DMPageList)
});
