/*
 * Majic — ServerInfo modal
 */

import { createStrings } from "@i18n";
import { getGuildAcronym, openImageModal, openUserProfile } from "@utils/discord";
import { classes, useAwaiter } from "@utils/misc";
import { findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { FluxDispatcher, IconUtils, Modal, openModal, Parser, React, ScrollerThin, SnowflakeUtils, Stores, TabBar, Timestamp, useEffect, UserUtils, useState, useStateFromStores } from "@webpack/common";

export const s = createStrings({
    en: {
        serverInfo: "Server Info",
        friends: "Friends",
        blocked: "Blocked Users",
        ignored: "Ignored Users",
        owner: "Server Owner",
        createdAt: "Created At",
        joinedAt: "Joined At",
        vanity: "Vanity Link",
        locale: "Preferred Locale",
        verification: "Verification Level",
        boosts: "Server Boosts",
        boostsValue: "{count} (Level {level})",
        channels: "Channels",
        roles: "Roles",
        loading: "Loading...",
        levelNone: "None",
        levelLow: "Low",
        levelMedium: "Medium",
        levelHigh: "High",
        levelHighest: "Highest"
    },
    fr: {
        serverInfo: "Infos du serveur",
        friends: "Amis",
        blocked: "Utilisateurs bloqués",
        ignored: "Utilisateurs ignorés",
        owner: "Propriétaire",
        createdAt: "Créé le",
        joinedAt: "Rejoint le",
        vanity: "Lien personnalisé",
        locale: "Langue principale",
        verification: "Niveau de vérification",
        boosts: "Boosts",
        boostsValue: "{count} (niveau {level})",
        channels: "Salons",
        roles: "Rôles",
        loading: "Chargement...",
        levelNone: "Aucun",
        levelLow: "Faible",
        levelMedium: "Moyen",
        levelHigh: "Élevé",
        levelHighest: "Très élevé"
    }
});

const IconClasses = findCssClassesLazy("icon", "acronym", "childWrapper");
const FriendRow = findComponentByCodeLazy("discriminatorClass:", ".isMobileOnline", "avatarSrc:");

const cl = (name: string, modifiers?: Record<string, boolean>) =>
    classes(`majic-gp-${name}`, ...Object.entries(modifiers ?? {}).map(([key, on]) => on && `majic-gp-${key}`));

const Tabs = {
    ServerInfo: 0,
    Friends: 1,
    BlockedUsers: 2,
    IgnoredUsers: 3
} as const;

type Tab = typeof Tabs[keyof typeof Tabs];

const fetched = {
    friends: false,
    blocked: false,
    ignored: false
};

export function openGuildInfoModal(guild: any) {
    openModal((props: any) => <GuildInfoModal guild={guild} modalProps={props} />);
}

const renderTimestamp = (timestamp: number) => <Timestamp timestamp={new Date(timestamp)} />;

function GuildInfoModal({ guild, modalProps }: { guild: any; modalProps: any }) {
    const [friendCount, setFriendCount] = useState<number>();
    const [blockedCount, setBlockedCount] = useState<number>();
    const [ignoredCount, setIgnoredCount] = useState<number>();
    const [currentTab, setCurrentTab] = useState<Tab>(Tabs.ServerInfo);

    useEffect(() => {
        fetched.friends = false;
        fetched.blocked = false;
        fetched.ignored = false;
    }, []);

    const bannerUrl = guild.banner && IconUtils.getGuildBannerURL(guild, true)?.replace(/\?size=\d+$/, "?size=1024");
    const iconUrl = guild.icon && IconUtils.getGuildIconURL({ id: guild.id, icon: guild.icon, canAnimate: true, size: 512 });

    const count = (value?: number) => value !== undefined ? ` (${value})` : "";

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={
                <div className={cl("header")}>
                    {iconUrl
                        ? <img className={cl("icon")} src={iconUrl} alt="" onClick={() => openImageModal({ url: iconUrl, height: 512, width: 512 })} />
                        : <div aria-hidden className={classes(IconClasses.childWrapper, IconClasses.acronym)}>{getGuildAcronym(guild)}</div>}

                    <div className={cl("name-and-description")}>
                        <h2 className={cl("name")}>{guild.name}</h2>
                        {guild.description && <p className={cl("description")}>{guild.description}</p>}
                    </div>
                </div>
            }
        >
            {bannerUrl && currentTab === Tabs.ServerInfo && (
                <img className={cl("banner")} src={bannerUrl} alt="" onClick={() => openImageModal({ url: bannerUrl, width: 1024 })} />
            )}

            <TabBar type="top" look="brand" className={cl("tab-bar")} selectedItem={currentTab} onItemSelect={setCurrentTab}>
                <TabBar.Item className={cl("tab", { selected: currentTab === Tabs.ServerInfo })} id={Tabs.ServerInfo}>
                    {s("serverInfo")}
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: currentTab === Tabs.Friends })} id={Tabs.Friends}>
                    {s("friends")}{count(friendCount)}
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: currentTab === Tabs.BlockedUsers })} id={Tabs.BlockedUsers}>
                    {s("blocked")}{count(blockedCount)}
                </TabBar.Item>
                <TabBar.Item className={cl("tab", { selected: currentTab === Tabs.IgnoredUsers })} id={Tabs.IgnoredUsers}>
                    {s("ignored")}{count(ignoredCount)}
                </TabBar.Item>
            </TabBar>

            <div className={cl("tab-content")}>
                {currentTab === Tabs.ServerInfo && <ServerInfoTab guild={guild} />}
                {currentTab === Tabs.Friends && <UserList type="friends" guild={guild} ids={Stores.RelationshipStore.getFriendIDs()} setCount={setFriendCount} />}
                {currentTab === Tabs.BlockedUsers && <UserList type="blocked" guild={guild} ids={Stores.RelationshipStore.getBlockedIDs()} setCount={setBlockedCount} />}
                {currentTab === Tabs.IgnoredUsers && <UserList type="ignored" guild={guild} ids={Stores.RelationshipStore.getIgnoredIDs?.() ?? []} setCount={setIgnoredCount} />}
            </div>
        </Modal>
    );
}

function Owner(guildId: string, owner: any) {
    const guildAvatar = Stores.GuildMemberStore.getMember(guildId, owner.id)?.avatar;
    const ownerAvatarUrl = guildAvatar
        ? IconUtils.getGuildMemberAvatarURLSimple({ userId: owner.id, avatar: guildAvatar, guildId, canAnimate: true })
        : IconUtils.getUserAvatarURL(owner, true);

    return (
        <div className={cl("owner")}>
            <img className={cl("owner-avatar")} src={ownerAvatarUrl} alt="" onClick={() => openImageModal({ url: ownerAvatarUrl, height: 512, width: 512 })} />
            {Parser.parse(`<@${owner.id}>`)}
        </div>
    );
}

function ServerInfoTab({ guild }: { guild: any }) {
    const [owner] = useAwaiter(() => UserUtils.getUser(guild.ownerId), {
        deps: [guild.ownerId],
        fallbackValue: null
    });

    const levels = [s("levelNone"), s("levelLow"), s("levelMedium"), s("levelHigh"), s("levelHighest")];

    const fields: Array<[string, React.ReactNode]> = [
        [s("owner"), owner ? Owner(guild.id, owner) : s("loading")],
        [s("createdAt"), renderTimestamp(SnowflakeUtils.extractTimestamp(guild.id))],
        [s("joinedAt"), guild.joinedAt ? renderTimestamp(guild.joinedAt.getTime()) : "-"],
        [s("vanity"), guild.vanityURLCode ? <a>{`discord.gg/${guild.vanityURLCode}`}</a> : "-"],
        [s("locale"), guild.preferredLocale || "-"],
        [s("verification"), levels[guild.verificationLevel] || "?"],
        [s("boosts"), s("boostsValue", { count: guild.premiumSubscriberCount ?? 0, level: guild.premiumTier ?? 0 })],
        [s("channels"), String(Stores.GuildChannelStore.getChannels(guild.id)?.count - 1 || "?")],
        [s("roles"), String(Stores.GuildRoleStore.getSortedRoles(guild.id).length - 1)]
    ];

    return (
        <div className={cl("info")}>
            {fields.map(([name, node]) => (
                <div className={cl("server-info-pair")} key={name}>
                    <h3 className={cl("field-name")}>{name}</h3>
                    {typeof node === "string" ? <span>{node}</span> : node}
                </div>
            ))}
        </div>
    );
}

function UserList({ type, guild, ids, setCount }: { type: keyof typeof fetched; guild: any; ids: string[]; setCount(count: number): void }) {
    const missing: string[] = [];
    const members: string[] = [];

    for (const id of ids) {
        if (Stores.GuildMemberStore.isMember(guild.id, id)) members.push(id);
        else missing.push(id);
    }

    useStateFromStores(
        [Stores.GuildMemberStore],
        () => Stores.GuildMemberStore.getMemberIds(guild.id),
        undefined,
        (old, current) => old.length === current.length
    );

    useEffect(() => {
        if (!fetched[type] && missing.length) {
            fetched[type] = true;
            FluxDispatcher.dispatch({ type: "GUILD_MEMBERS_REQUEST", guildIds: [guild.id], userIds: missing });
        }
    }, []);

    useEffect(() => setCount(members.length), [members.length]);

    return (
        <ScrollerThin fade className={cl("scroller")}>
            {members.map(id => (
                <FriendRow
                    key={id}
                    user={Stores.UserStore.getUser(id)}
                    status={Stores.PresenceStore.getStatus(id) || "offline"}
                    onSelect={() => openUserProfile(id)}
                    onContextMenu={() => { }}
                />
            ))}
        </ScrollerThin>
    );
}
