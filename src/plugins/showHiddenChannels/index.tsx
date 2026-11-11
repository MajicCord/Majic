/*
 * Majic — ShowHiddenChannels plugin
 */

import { withErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { classes } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { DiscordIcon, Permissions, React, Stores, Tooltip } from "@webpack/common";

import HiddenChannelLockScreen, { setChannelBeginHeader } from "./components/HiddenChannelLockScreen";
import { cl, s, settings, ShowMode } from "./settings";

const logger = new Logger("ShowHiddenChannels", "#bd93f9");

const ChannelListClasses = findCssClassesLazy("modeSelected", "modeMuted", "unread", "icon");

function isUncategorized(objChannel: { channel: any; comparator: number }) {
    return objChannel.channel.id === "null" && objChannel.channel.name === "Uncategorized" && objChannel.comparator === -1;
}

function LockIcon() {
    return (
        <span className={ChannelListClasses.icon} aria-hidden={true} style={{ display: "flex" }}>
            <DiscordIcon name="LockIcon" size={18} />
        </span>
    );
}

function HiddenChannelIcon() {
    return (
        <Tooltip text={s("hiddenChannel")}>
            {({ onMouseLeave, onMouseEnter }: { onMouseLeave(): void; onMouseEnter(): void }) => (
                <span
                    onMouseLeave={onMouseLeave}
                    onMouseEnter={onMouseEnter}
                    className={classes(ChannelListClasses.icon, cl("hidden-channel-icon"))}
                    aria-hidden={true}
                    style={{ display: "flex" }}
                >
                    <DiscordIcon name="EyeSlashIcon" size={24} />
                </span>
            )}
        </Tooltip>
    );
}

const CSS = [
    ".majic-shc-container { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 0.65em; margin: 0.5em 0; min-height: 100%; }",
    ".majic-shc-logo { width: 12em; height: 12em; }",
    ".majic-shc-heading-container { display: flex; flex-direction: row; align-items: center; gap: 0.5em; }",
    ".majic-shc-heading-xxl { margin: 0; color: var(--text-strong); font-size: 24px; font-weight: 700; }",
    ".majic-shc-heading { margin: 0; color: var(--text-strong); font-size: 16px; font-weight: 600; }",
    ".majic-shc-text { margin: 0; color: var(--text-default); font-size: 16px; }",
    ".majic-shc-text-lg { margin: 0; color: var(--text-default); font-size: 18px; }",
    ".majic-shc-heading-nsfw-icon { display: flex; color: var(--text-default); }",
    ".majic-shc-topic-container { color: var(--text-default); background: var(--background-base-lower); border-radius: 5px; padding: 10px; max-width: 70vw; }",
    ".majic-shc-default-emoji-container { display: flex; flex-direction: row; align-items: center; background: var(--background-base-lower); border-radius: 8px; padding: 0.75em; margin-left: 0.75em; }",
    ".majic-shc-tags-container { display: flex; flex-direction: column; background: var(--background-base-lower); border-radius: 5px; padding: 0.75em; gap: 0.75em; max-width: 70vw; }",
    ".majic-shc-tags { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.35em; }",
    ".majic-shc-allowed-users-and-roles-container { display: flex; flex-direction: column; align-items: center; background: var(--background-base-lower); border-radius: 5px; padding: 0.75em; max-width: 70vw; }",
    ".majic-shc-allowed-users-and-roles-container-title { display: flex; flex-direction: row; align-items: center; gap: 0.5em; }",
    ".majic-shc-allowed-users-and-roles-container-toggle-btn, .majic-shc-allowed-users-and-roles-container-permdetails-btn { all: unset; cursor: pointer; display: flex; align-items: center; color: var(--text-default); }",
    ".majic-shc-allowed-users-and-roles-container > [class*=\"members\"] { margin-left: 12px; flex-wrap: wrap; justify-content: center; }",
    ".majic-shc-hidden-channel-icon { cursor: not-allowed; margin-left: 6px; z-index: 0; }"
].join(" ");

type R = (...groups: string[]) => string;

export default definePlugin({
    name: "ShowHiddenChannels",
    description: "Shows channels you don't have access to",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les salons auxquels tu n'as pas accès",
            options: {
                hideUnreads: "Masquer les non-lus",
                showMode: "Affichage des salons cachés",
                defaultAllowedUsersAndRolesDropdownState: "Ouvrir par défaut la liste des utilisateurs et rôles autorisés sur les salons cachés"
            }
        }
    },
    settings,

    css: CSS,

    patches: [
        {
            find: '"placeholder-channel-id"',
            replacement: [
                {
                    match: /if\(!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL.+?{if\(this\.id===\i\).+?threadIds:\[\]}}/,
                    replace: ""
                },
                {
                    match: /(?<=&&)(?=!\i\.\i\.hasUnread\(this\.record\.id\))/,
                    replace: "$self.isHiddenChannel(this.record)||"
                },
                {
                    match: /(this\.record\)\?{renderLevel:(.+?),threadIds.+?renderLevel:).+?(?=,threadIds)/g,
                    replace: ((_, rest, defaultRenderLevel) => `${rest}${defaultRenderLevel}`) as R
                },
                {
                    match: /(getRenderLevel\(\i\){.+?return)!\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL,this\.record\)\|\|/,
                    replace: ((_, rest) => `${rest} `) as R
                }
            ]
        },
        {
            find: "VoiceChannel, transitionTo: Channel does not have a guildId",
            replacement: [
                {
                    match: /(?<=getIgnoredUsersForVoiceChannel\((\i)\.id\)[^;]{0,300}?;return\()/,
                    replace: ((_, channel) => `!$self.isHiddenChannel(${channel})&&`) as R
                },
                {
                    match: /(?=\|\|\i\.\i\.selectVoiceChannel\((\i)\.id\))/,
                    replace: ((_, channel) => `||$self.isHiddenChannel(${channel})`) as R
                },
                {
                    match: /!__OVERLAY__&&\((?<=selectVoiceChannel\((\i)\.id\).+?)/,
                    replace: ((m, channel) => `${m}$self.isHiddenChannel(${channel},true)||`) as R
                }
            ]
        },
        {
            find: ".AUDIENCE),{isSubscriptionGated",
            replacement: {
                match: /(\i)\.isRoleSubscriptionTemplatePreviewChannel\(\)/,
                replace: ((m, channel) => `${m}||$self.isHiddenChannel(${channel})`) as R
            }
        },
        {
            find: 'tutorialId:"instant-invite"',
            replacement: ["renderEditButton", "renderInviteButton"].map(func => ({
                match: new RegExp(`(?<=${func}\\(\\){)`, "g"),
                replace: "if($self.isHiddenChannel(this?.props?.channel))return null;"
            }))
        },
        {
            find: "VoiceChannel.renderPopout: There must always be something to render",
            all: true,
            replacement: {
                match: /(?<=renderOpenChatButton(?:",|=)\(\)=>{)/,
                replace: "if($self.isHiddenChannel(this?.props?.channel))return null;"
            }
        },
        {
            find: "#{intl::CHANNEL_TOOLTIP_DIRECTORY}",
            predicate: () => settings.store.showMode === ShowMode.LockIcon,
            replacement: {
                match: /(?<=(\i)\.isNSFW\(\);)switch\(\i\.type\).{0,15}\.GUILD_ANNOUNCEMENT/,
                replace: ((m, channel) => `if($self.isHiddenChannel(${channel}))return $self.LockIcon;${m}`) as R
            }
        },
        {
            find: "UNREAD_IMPORTANT:",
            predicate: () => settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
            replacement: [
                {
                    match: /Children\.count.+?;(?=return\(0,\i\.jsxs?\)\(\i\.\i,{focusTarget:)(?<={channel:(\i),name:\i,muted:(\i).+?;)/,
                    replace: ((m, channel, muted) => `${m}${muted}=$self.isHiddenChannel(${channel})?true:${muted};`) as R
                },
                {
                    match: /\.Children\.count.+?:null(?<=,channel:(\i).+?)/,
                    replace: ((m, channel) => `${m},$self.isHiddenChannel(${channel})?$self.HiddenChannelIcon():null`) as R
                },
                {
                    match: /(?<=\?\i\.\i:\i\.\i,)(.{0,150}?)if\((\i)(?:\)return |\?)(\i\.MUTED)/,
                    replace: ((_, otherClasses, isMuted, mutedClassExpression) => `${isMuted}?${mutedClassExpression}:"",${otherClasses}if(${isMuted})return ""`) as R
                }
            ]
        },
        {
            find: "UNREAD_IMPORTANT:",
            replacement: [
                {
                    predicate: () => settings.store.hideUnreads === false && settings.store.showMode === ShowMode.HiddenIconWithMutedStyle,
                    match: /(?<=\.LOCKED;if\()(?<={channel:(\i).+?)/,
                    replace: ((_, channel) => `!$self.isHiddenChannel(${channel})&&`) as R
                },
                {
                    predicate: () => settings.store.hideUnreads === true,
                    match: /Children\.count.+?;(?=return\(0,\i\.jsxs?\)\(\i\.\i,{focusTarget:)(?<={channel:(\i),name:\i,.+?unread:(\i).+?)/,
                    replace: ((m, channel, unread) => `${m}${unread}=$self.isHiddenChannel(${channel})?false:${unread};`) as R
                }
            ]
        },
        {
            find: '"ChannelListUnreadsStore"',
            replacement: {
                match: /(?<=\.id\)\))(?=&&\(0,\i\.\i\)\((\i)\))/,
                replace: ((_, channel) => `&&!$self.isHiddenChannel(${channel})`) as R
            }
        },
        {
            find: "renderBottomUnread(){",
            replacement: {
                match: /(?<=!0\))(?=&&\(0,\i\.\i\)\((\i\.record)\))/,
                replace: "&&!$self.isHiddenChannel($1)"
            }
        },
        {
            find: "GUILD_EVENT)}),[",
            replacement: {
                match: /(?<=\.id\)\))(?=&&\(0,\i\.\i\)\((\i)\))/,
                replace: "&&!$self.isHiddenChannel($1)"
            }
        },
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: [
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_TEXT:(?=.+?(\i\.push.{0,50}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: ((m, pushNotificationButtonExpression, channel, isLurking) => `${m}if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButtonExpression};break;}`) as R
                },
                {
                    match: /renderHeaderToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_MEDIA:(?=.+?(\i\.push.{0,40}channel:(\i)},"notifications"\)\)))(?<=isLurking:(\i).+?)/,
                    replace: ((m, pushNotificationButtonExpression, channel, isLurking) => `${m}if(!${isLurking}&&$self.isHiddenChannel(${channel})){${pushNotificationButtonExpression};break;}`) as R
                },
                {
                    match: /renderMobileToolbar(?:",|=)\(\)=>{.+?case \i\.\i\.GUILD_DIRECTORY:(?<=let{channel:(\i).+?)/,
                    replace: ((m, channel) => `${m}if($self.isHiddenChannel(${channel}))break;`) as R
                },
                {
                    match: /(?<=renderHeaderBar(?:",|=)\(\)=>{.+?hideSearch:(\i)\.isDirectory\(\))/,
                    replace: ((_, channel) => `||$self.isHiddenChannel(${channel})`) as R
                },
                {
                    match: /(?<=renderSidebar\(\){)/,
                    replace: "if($self.isHiddenChannel(this?.props?.channel))return null;"
                },
                {
                    match: /(?<=renderChat\(\){)/,
                    replace: "if($self.isHiddenChannel(this?.props?.channel))return $self.HiddenChannelLockScreen(this?.props?.channel);"
                }
            ]
        },
        {
            find: '"MessageManager"',
            replacement: {
                match: /forceFetch:\i,isPreload:.+?}=\i;(?=.+?getChannel\((\i)\))/,
                replace: ((m, channelId) => `${m}if($self.isHiddenChannel({channelId:${channelId}}))return;`) as R
            }
        },
        {
            find: '"alt+shift+down"',
            replacement: {
                match: /(?<=getChannel\(\i\);return null!=(\i))(?=.{0,200}?>0\)&&\(0,\i\.\i\)\(\i\))/,
                replace: ((_, channel) => `&&!$self.isHiddenChannel(${channel})`) as R
            }
        },
        {
            find: ".APPLICATION_STORE&&null!=",
            replacement: {
                match: /getState\(\)\.channelId.+?(?=\.map\(\i=>\i\.id)/,
                replace: "$&.filter(e=>!$self.isHiddenChannel(e))"
            }
        },
        {
            find: "#{intl::ROLE_REQUIRED_SINGLE_USER_MESSAGE}",
            replacement: [
                {
                    match: /(forceRoles:.+?)(\i\.\i\(\i\.\i\.ADMINISTRATOR,\i\.\i\.VIEW_CHANNEL\))(?<=context:(\i)}.+?)/,
                    replace: ((_, rest, mergedPermissions, channel) => `${rest}$self.swapViewChannelWithConnectPermission(${mergedPermissions},${channel})`) as R
                },
                {
                    match: /permissionOverwrites\[.+?\i=(?<=context:(\i)}.+?)(?=(.+?)VIEW_CHANNEL)/,
                    replace: ((m, channel, permCheck) => `${m}!$self.canConnect(${channel})?${permCheck}CONNECT):`) as R
                },
                {
                    match: /getSortedRoles.+?\.filter\(\i=>(?=!)/,
                    replace: ((m: string) => `${m}$self.isHiddenChannel(arguments[0]?.channel)?true:`) as R
                },
                {
                    match: /forceRoles:.+?.value\(\)(?<=channel:(\i).+?)/,
                    replace: ((m, channel) => `${m}.reduce(...$self.makeAllowedRolesReduce(${channel}.guild_id))`) as R
                },
                {
                    match: /return\(0,\i\.jsxs?\)\(\i\.\i,{channelId:(\i)\.id,children:\[(?=.{0,1000}?(\(0,\i\.jsxs?\)\("div",{className:\i\.\i,children:\[.{0,100}\i\.length>0.+?\]}\)),)/,
                    replace: ((m, channel, allowedUsersAndRolesComponent) => `if($self.isHiddenChannel(${channel},true)){return${allowedUsersAndRolesComponent};}${m}`) as R
                },
                {
                    match: /maxUsers:\d+?,users:\i(?<=channel:(\i).+?)/,
                    replace: ((m, channel) => `${m},shcChannel:${channel}`) as R
                },
                {
                    match: /1!==\i\.length(?=\|\|)/,
                    replace: "true"
                }
            ]
        },
        {
            find: '="interactive-text-default",overflowCountClassName:',
            replacement: [
                {
                    match: /let{users:\i,maxUsers:\i,/,
                    replace: "let{shcChannel}=arguments[0];$&"
                },
                {
                    match: /\i>0(?=&&!\i&&!\i)/,
                    replace: ((m: string) => `($self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)?true:${m})`) as R
                },
                {
                    match: /(?<=`\+\$\{)\i(?=\})/,
                    replace: ((overflowTextAmount: string) => `$self.isHiddenChannel(typeof shcChannel!=="undefined"?shcChannel:void 0,true)&&(${overflowTextAmount}-1)<=0?"":${overflowTextAmount}`) as R
                }
            ]
        },
        {
            find: "#{intl::CHANNEL_CALL_CURRENT_SPEAKER}",
            replacement: {
                match: /(?<=&&)\i\.push\(.{0,120}"chat-spacer"/,
                replace: "(arguments[0]?.inCall||!$self.isHiddenChannel(arguments[0]?.channel,true))&&$&"
            }
        },
        {
            find: "#{intl::EMBEDDED_ACTIVITIES_DEVELOPER_ACTIVITY_SHELF_FETCH_ERROR}",
            replacement: [
                {
                    match: /renderContent\(\i\){.+?this\.renderVoiceChannelEffects.+?children:/,
                    replace: "$&!this?.props?.inCall&&$self.isHiddenChannel(this?.props?.channel,true)?$self.HiddenChannelLockScreen(this?.props?.channel):"
                },
                {
                    match: /renderContent\(\i\){.+?disableGradients:/,
                    replace: "$&!this?.props?.inCall&&$self.isHiddenChannel(this?.props?.channel,true)||"
                },
                {
                    match: /(?:{|,)render(?!Header|ExternalHeader).{0,30}?:/g,
                    replace: "$&!this?.props?.inCall&&$self.isHiddenChannel(this?.props?.channel,true)?()=>null:"
                },
                {
                    match: /(?=\i\|\|\i!==\i\.\i\.FULL_SCREEN.{0,100}?this\._callContainerRef)/,
                    replace: '$&!this?.props?.inCall&&$self.isHiddenChannel(this?.props?.channel,true)?"":'
                }
            ]
        },
        {
            find: "audience-header-",
            replacement: [
                {
                    match: /screenMessage:(\i)\?.+?children:(?=!\1)(?<=let \i,{channel:(\i).+?)/,
                    replace: ((m, _isPopoutOpen, channel) => `${m}$self.isHiddenChannel(${channel})?$self.HiddenChannelLockScreen(${channel}):`) as R
                },
                {
                    match: /render(?:BottomLeft|BottomCenter|BottomRight|ChatToasts):\(\)=>(?<=let \i,{channel:(\i).+?)/g,
                    replace: ((m, channel) => `${m}$self.isHiddenChannel(${channel})?null:`) as R
                },
                {
                    match: /"124px".+?disableGradients:(?<=let \i,{channel:(\i).+?)/,
                    replace: ((m, channel) => `${m}$self.isHiddenChannel(${channel})||`) as R
                },
                {
                    match: /"124px".+?style:(?<=let \i,{channel:(\i).+?)/,
                    replace: ((m, channel) => `${m}$self.isHiddenChannel(${channel})?void 0:`) as R
                },
                {
                    match: /\(0,\i\.jsx\)\(\i\.\i\.Divider.+?}\)]}\)(?=.+?:(\i)\.guild_id)/,
                    replace: ((m, channel) => `$self.isHiddenChannel(${channel})?null:(${m})`) as R
                },
                {
                    match: /(?<=numRequestToSpeak:\i\}\)\}\):null,!\i&&)\(0,\i\.jsxs?\).{0,280}?iconClassName:/,
                    replace: "!$self.isHiddenChannel(arguments[0]?.channel,true)&&$&"
                }
            ]
        },
        {
            find: ",queryStaticRouteChannels(",
            replacement: [
                {
                    match: /(?<=queryChannels\(\i\){.+?getChannels\(\i)(?=\))/,
                    replace: ",true"
                },
                {
                    match: /(?<=queryChannels\(\i\){.+?\)\((\i)\.type\))(?=&&!\i\.\i\.can\()/,
                    replace: "&&!$self.isHiddenChannel($1)"
                }
            ]
        },
        {
            find: "\"^/guild-stages/(\\\\d+)(?:/)?(\\\\d+)?\"",
            replacement: {
                match: /\i\.\i\.can\(\i\.\i\.VIEW_CHANNEL,\i\)/,
                replace: "true"
            }
        },
        {
            find: ",openChatWithoutConnecting:",
            replacement: {
                match: /(?<=getChannel\(\i\);if\(null!=(\i))(?=&&.{0,100}?selectVoiceChannel)/,
                replace: ((_, channel) => `&&!$self.isHiddenChannel(${channel})`) as R
            }
        },
        {
            find: '"GuildChannelStore"',
            replacement: [
                {
                    match: /isChannelGated\(.+?\)(?=&&)/,
                    replace: ((m: string) => `${m}&&false`) as R
                },
                {
                    match: /(?<=getChannels\(\i)(\){.*?)return (.+?)}/,
                    replace: ((_, rest, channels) => `,shouldIncludeHidden${rest}return $self.resolveGuildChannels(${channels},shouldIncludeHidden??arguments[0]==="@favorites");}`) as R
                }
            ]
        },
        {
            find: "GuildTooltip - ",
            replacement: {
                match: /(?<=getChannels\(\i)(?=\))/,
                replace: ",true"
            }
        },
        {
            find: '"NowPlayingViewStore"',
            replacement: {
                match: /(getVoiceStateForUser.{0,150}?)&&\i\.\i\.canWithPartialContext.{0,20}VIEW_CHANNEL.+?}\)(?=\?)/,
                replace: "$1"
            }
        },
        {
            find: "#{intl::ROLE_REQUIRED_SINGLE_USER_MESSAGE}",
            replacement: {
                match: /(?=function (\i)\(\i\){let{channel:.{0,200}?getSortedRoles\()/,
                replace: "$self.ChannelBeginHeader=$1;"
            }
        },
        {
            find: "2026-02-private-channel-hiding",
            replacement: {
                match: /(?<=enableObfuscation|enableIntegrityCheck):!0/g,
                replace: ":false"
            }
        }
    ],

    set ChannelBeginHeader(value: any) {
        setChannelBeginHeader(value);
    },

    canConnect(channel: any) {
        return Stores.PermissionStore.can(Permissions.CONNECT, channel);
    },

    swapViewChannelWithConnectPermission(mergedPermissions: bigint, channel: any) {
        if (!Stores.PermissionStore.can(Permissions.CONNECT, channel)) {
            mergedPermissions &= ~(Permissions.VIEW_CHANNEL as bigint);
            mergedPermissions |= Permissions.CONNECT as bigint;
        }
        return mergedPermissions;
    },

    isHiddenChannel(channel: any, checkConnect = false) {
        try {
            if (channel == null || (Object.hasOwn(channel, "channelId") && channel.channelId == null)) return false;

            if (channel.channelId != null) channel = Stores.ChannelStore.getChannel(channel.channelId);
            if (channel == null || channel.isDM() || channel.isGroupDM() || channel.isMultiUserDM()) return false;
            if (["browse", "customize", "guide"].includes(channel.id)) return false;

            return !Stores.PermissionStore.can(Permissions.VIEW_CHANNEL, channel) || (checkConnect && !Stores.PermissionStore.can(Permissions.CONNECT, channel));
        } catch (err) {
            logger.error("isHiddenChannel failed", err);
            return false;
        }
    },

    resolveGuildChannels(channels: Record<string | number, Array<{ channel: any; comparator: number }> | string | number>, shouldIncludeHidden: boolean) {
        if (shouldIncludeHidden) return channels;

        const res: Record<string, any> = {};
        for (const [key, maybeObjChannels] of Object.entries(channels)) {
            if (!Array.isArray(maybeObjChannels)) {
                res[key] = maybeObjChannels;
                continue;
            }

            res[key] ??= [];

            for (const objChannel of maybeObjChannels) {
                if (isUncategorized(objChannel) || objChannel.channel.id === null || !this.isHiddenChannel(objChannel.channel)) res[key].push(objChannel);
            }
        }

        return res;
    },

    makeAllowedRolesReduce(guildId: string) {
        return [
            (prev: any[], _: any, index: number, originalArray: any[]) => {
                if (index !== 0) return prev;
                const everyoneRole = originalArray.find(role => role.id === guildId);
                return everyoneRole ? [everyoneRole] : originalArray;
            },
            [] as any[]
        ];
    },

    HiddenChannelLockScreen: (channel: any) => <HiddenChannelLockScreen channel={channel} />,

    LockIcon: withErrorBoundary("ShowHiddenChannels", LockIcon),

    HiddenChannelIcon: withErrorBoundary("ShowHiddenChannels", HiddenChannelIcon)
});
