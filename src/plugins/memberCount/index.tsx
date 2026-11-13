/*
 * Majic — MemberCount plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { proxyLazy } from "@utils/lazy";
import { definePlugin, OptionType } from "@utils/types";
import { ChannelActions, DiscordIcon, Flux, FluxDispatcher, Permissions, React, Stores, Tooltip, useEffect, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { online: "{count} online in this channel", total: "{count} total server members", voice: "{count} members in voice" },
    fr: { online: "{count} en ligne dans ce salon", total: "{count} membres au total sur le serveur", voice: "{count} membres en vocal" }
});

const settings = definePluginSettings({
    toolTip: {
        type: OptionType.BOOLEAN,
        description: "Show the member count in the server tooltip",
        default: true,
        restartNeeded: true
    },
    memberList: {
        type: OptionType.BOOLEAN,
        description: "Show the member count above the member list",
        default: true,
        restartNeeded: true
    },
    voiceActivity: {
        type: OptionType.BOOLEAN,
        description: "Also show how many members are in voice channels in the member list",
        default: true
    }
});

const formatter = new Intl.NumberFormat();
const format = (value: number) => formatter.format(value);

const OnlineMemberCountStore = proxyLazy(() => {
    const counts = new Map<string, number>();
    let queue = Promise.resolve();

    class OnlineMemberCountStore extends Flux.Store {
        getCount(guildId?: string) {
            return guildId ? counts.get(guildId) : undefined;
        }

        ensureCount(guildId?: string) {
            if (!guildId || counts.has(guildId)) return;
            queue = queue
                .then(() => {
                    if (counts.has(guildId)) return;
                    return ChannelActions.preload(guildId, Stores.GuildChannelStore.getDefaultChannel(guildId)?.id);
                })
                .catch(() => { })
                .then(() => new Promise(resolve => setTimeout(resolve, 200)));
        }
    }

    const onlineOf = (groups: Array<{ count: number; id: string }>) =>
        groups.reduce((total, group) => total + (group.id === "offline" ? 0 : group.count), 0);

    return new OnlineMemberCountStore(FluxDispatcher, {
        GUILD_MEMBER_LIST_UPDATE({ guildId, groups }: { guildId: string; groups: Array<{ count: number; id: string }> }) {
            counts.set(guildId, onlineOf(groups));
        },
        ONLINE_GUILD_MEMBER_COUNT_UPDATE({ guildId, count }: { guildId: string; count: number }) {
            counts.set(guildId, count);
        }
    });
});

function Stat({ tooltip, icon, value, className }: { tooltip: string; icon: React.ReactNode; value: string; className: string }) {
    return (
        <Tooltip text={tooltip} position="bottom">
            {(props: Record<string, unknown>) => (
                <div {...props} className="majic-membercount-stat">
                    {icon}
                    <span className={className}>{value}</span>
                </div>
            )}
        </Tooltip>
    );
}

function MemberCount({ isTooltip, tooltipGuildId }: { isTooltip?: boolean; tooltipGuildId?: string }) {
    const { voiceActivity } = settings.use(["voiceActivity"]);
    const includeVoice = voiceActivity && !isTooltip;

    const currentChannel = useStateFromStores(
        [Stores.SelectedChannelStore],
        () => (isTooltip ? undefined : Stores.ChannelStore.getChannel(Stores.SelectedChannelStore.getChannelId())),
        [],
        (a: any, b: any) => a?.id === b?.id
    );
    const guildId: string | undefined = tooltipGuildId ?? currentChannel?.guild_id;

    const voiceCount = useStateFromStores([Stores.VoiceStateStore], () => {
        if (!includeVoice || !guildId) return 0;
        return Object.values(Stores.VoiceStateStore.getVoiceStates(guildId) ?? {}).filter(({ channelId }: any) => {
            const channel = channelId && Stores.ChannelStore.getChannel(channelId);
            return channel && Stores.PermissionStore.can(Permissions.VIEW_CHANNEL, channel);
        }).length;
    });

    const totalCount = useStateFromStores([Stores.GuildMemberCountStore], () => (guildId ? Stores.GuildMemberCountStore.getMemberCount(guildId) : null));
    let onlineCount = useStateFromStores([OnlineMemberCountStore], () => (guildId ? OnlineMemberCountStore.getCount(guildId) : null));

    const memberListOnline = useStateFromStores([Stores.ChannelMemberStore], () => {
        if (isTooltip || !guildId) return null;
        const { groups } = Stores.ChannelMemberStore.getProps(guildId, currentChannel?.id);
        if (groups.length >= 1) {
            return groups.reduce((total: number, group: any) => total + (group.id === "offline" ? 0 : group.count), 0);
        }
        return null;
    });

    const threadOnline = useStateFromStores([Stores.ThreadMemberListStore], () => {
        if (isTooltip) return null;
        const sections = Object.values(Stores.ThreadMemberListStore.getMemberListSections(currentChannel?.id) ?? {}) as Array<{ sectionId: string; userIds: string[] }>;
        return sections.length ? sections.reduce((total, section) => total + (section.sectionId === "offline" ? 0 : section.userIds.length), 0) : null;
    });

    if (memberListOnline != null) onlineCount = memberListOnline;
    if (threadOnline != null) onlineCount = threadOnline;

    useEffect(() => {
        if (guildId) OnlineMemberCountStore.ensureCount(guildId);
    }, [guildId]);

    if (totalCount == null) return null;

    const online = onlineCount != null ? format(onlineCount) : "?";

    return (
        <div className={`majic-membercount ${isTooltip ? "majic-membercount-tooltip" : "majic-membercount-list"}`}>
            <Stat tooltip={s("online", { count: online })} icon={<span className="majic-membercount-dot majic-membercount-dot-online" />} value={online} className="majic-membercount-online" />
            <Stat tooltip={s("total", { count: format(totalCount) })} icon={<span className="majic-membercount-dot majic-membercount-dot-total" />} value={format(totalCount)} className="majic-membercount-total" />
            {includeVoice && voiceCount > 0 && (
                <Stat tooltip={s("voice", { count: format(voiceCount) })} icon={<DiscordIcon name="VoiceNormalIcon" size={15} color="var(--majic-membercount-muted)" />} value={format(voiceCount)} className="majic-membercount-voice" />
            )}
        </div>
    );
}

export default definePlugin({
    name: "MemberCount",
    description: "Shows how many members are online, in total and in voice, in the member list and the server tooltip",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche le nombre de membres en ligne, au total et en vocal, dans la liste des membres et l'infobulle des serveurs",
            options: {
                toolTip: "Afficher le nombre de membres dans l'infobulle des serveurs",
                memberList: "Afficher le nombre de membres au-dessus de la liste des membres",
                voiceActivity: "Afficher aussi le nombre de membres en vocal dans la liste des membres"
            }
        }
    },
    settings,

    css: `
.majic-membercount { display: flex; align-content: center; gap: .85em; --majic-membercount-muted: var(--primary-400, #87898c); }
.majic-membercount-tooltip { margin-top: .25em; margin-left: 2px; }
.majic-membercount-list { justify-content: center; flex-wrap: wrap; margin-top: 1em; padding-inline: 1em; line-height: 1.2em; }
.majic-membercount-stat { display: flex; align-items: center; gap: .5em; }
.majic-membercount-dot { display: inline-block; border-radius: 50%; }
.majic-membercount-dot-online { width: 10px; height: 10px; background: var(--status-online, #23a55a); }
.majic-membercount-dot-total { width: 8px; height: 8px; border: 2px solid var(--icon-status-offline, #80848e); }
.majic-membercount-online { color: var(--green-360, #23a55a); }
.majic-membercount-total, .majic-membercount-voice { color: var(--majic-membercount-muted); }
`,

    patches: [
        {
            find: "{isSidebarVisible:",
            predicate: () => settings.store.memberList,
            replacement: {
                match: /children:\[(\i\.useMemo[^}]+"aria-multiselectable")(?<=className:(\i),.+?)/,
                replace: "children:[$2?.includes('members')?$self.render():null,$1"
            }
        },
        {
            find: "GuildTooltip - ",
            predicate: () => settings.store.toolTip,
            replacement: {
                match: /#{intl::VIEW_AS_ROLES_MENTIONS_WARNING}.{0,100}(?=])/,
                replace: "$&,$self.renderTooltip(arguments[0].guild)"
            }
        },
        {
            find: '"GuildSubscriptionsStore"',
            replacement: {
                match: /(\i\.\i\.getSection\(\i\))===(\i\.\i)\.MEMBERS/,
                replace: (code, section, sectionTypes) => `(${code}||${section}===${sectionTypes}.NONE)`
            }
        }
    ],

    render: withErrorBoundary("MemberCount", () => <MemberCount />),
    renderTooltip: (guild: { id: string }) => withErrorBoundary("MemberCount", MemberCount)({ isTooltip: true, tooltipGuildId: guild.id })
});
