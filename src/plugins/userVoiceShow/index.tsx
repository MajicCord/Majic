/*
 * Majic — UserVoiceShow plugin
 */

import { addMemberListDecorator, removeMemberListDecorator } from "@api/memberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/messageDecorations";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { isPluginEnabled } from "@renderer/plugins";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { definePlugin, OptionType } from "@utils/types";
import { filters, findByPropsLazy, findCssClassesLazy, mapMangledModuleLazy } from "@webpack";
import { DiscordIcon, Parser, Permissions, React, showToast, Stores, Tooltip, useMemo, UserSummaryItem, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { inVoice: "In Voice Chat", cannotJoin: "You cannot join the user's Voice Channel" },
    fr: { inVoice: "En vocal", cannotJoin: "Tu ne peux pas rejoindre le salon vocal de cette personne" }
});

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

const ChannelRouter = mapMangledModuleLazy('"Thread must have a parent ID."', {
    transitionToChannel: filters.byCode(".openTextInVoiceIfVoiceChannel"),
    transitionToThread: filters.byCode('"Thread must have a parent ID."')
});

const ActionButtonClasses = findCssClassesLazy("actionButton", "highlight");

const settings = definePluginSettings({
    showInUserProfileModal: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel indicator in their profile next to the name",
        default: true,
        restartNeeded: true
    },
    showInMemberList: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel indicator in the member and DM lists",
        default: true,
        restartNeeded: true
    },
    showInMessages: {
        type: OptionType.BOOLEAN,
        description: "Show a user's voice channel indicator in messages",
        default: true,
        restartNeeded: true
    }
});

type IconProps = Omit<React.ComponentPropsWithoutRef<"div">, "children"> & { size?: number };

const makeIcon = (name: string) => ({ size = 16, className, ...rest }: IconProps) => (
    <div {...rest} className={classes("majic-uvs-speaker", className)}>
        <DiscordIcon name={name} size={size} />
    </div>
);

const SpeakerIcon = makeIcon("VoiceNormalIcon");
const LockedSpeakerIcon = makeIcon("VoiceLockIcon");
const MutedIcon = makeIcon("MicrophoneSlashIcon");
const DeafIcon = makeIcon("HeadphonesSlashIcon");

function VoiceChannelTooltip({ channel, isLocked }: { channel: any; isLocked: boolean }) {
    const voiceStates = useStateFromStores([Stores.VoiceStateStore], () => Stores.VoiceStateStore.getVoiceStatesForChannel(channel.id));

    const users = useMemo(
        () => Object.values(voiceStates as Record<string, { userId: string }>).map(voiceState => Stores.UserStore.getUser(voiceState.userId)).filter(user => user != null),
        [voiceStates]
    );

    const Icon = isLocked ? LockedSpeakerIcon : SpeakerIcon;
    return (
        <>
            <p className="majic-uvs-bold">{s("inVoice")}</p>
            <p className="majic-uvs-bold">{Parser.parse(`<#${channel.id}>`)}</p>
            <div className="majic-uvs-vc-members">
                <Icon size={18} />
                <UserSummaryItem users={users} renderIcon={false} max={13} size={18} />
            </div>
        </>
    );
}

interface VoiceChannelIndicatorProps {
    userId: string;
    isProfile?: boolean;
    isMessage?: boolean;
    isActionButton?: boolean;
    shouldHighlight?: boolean;
}

const clickTimers = new Map<string, ReturnType<typeof setTimeout>>();

function VoiceChannelIndicatorComponent({ userId, isProfile, isMessage, isActionButton, shouldHighlight }: VoiceChannelIndicatorProps) {
    const channelId: string | undefined = useStateFromStores([Stores.VoiceStateStore], () => Stores.VoiceStateStore.getVoiceStateForUser(userId)?.channelId);

    const { isMuted, isDeaf } = useStateFromStores([Stores.VoiceStateStore], () => {
        const voiceState = Stores.VoiceStateStore.getVoiceStateForUser(userId);
        return {
            isMuted: voiceState?.mute || voiceState?.selfMute || false,
            isDeaf: voiceState?.deaf || voiceState?.selfDeaf || false
        };
    }, undefined, (a, b) => a.isMuted === b.isMuted && a.isDeaf === b.isDeaf);

    const channel = channelId == null ? undefined : Stores.ChannelStore.getChannel(channelId);
    if (channel == null) return null;

    const { PermissionStore } = Stores;
    const isDM = channel.isDM() || channel.isMultiUserDM();
    if (!isDM && !PermissionStore.can(Permissions.VIEW_CHANNEL, channel) && !isPluginEnabled("ShowHiddenChannels")) return null;

    const isLocked = !isDM && (!PermissionStore.can(Permissions.VIEW_CHANNEL, channel) || !PermissionStore.can(Permissions.CONNECT, channel));

    function onClick(e: React.MouseEvent) {
        e.preventDefault();
        e.stopPropagation();

        if (channel == null || channelId == null) return;

        clearTimeout(clickTimers.get(channelId));
        clickTimers.delete(channelId);

        if (e.detail > 1) {
            if (!isDM && !PermissionStore.can(Permissions.CONNECT, channel)) {
                showToast({ text: s("cannotJoin"), variant: "critical" });
                return;
            }
            selectVoiceChannel(channelId);
        } else {
            const timeoutId = setTimeout(() => {
                ChannelRouter.transitionToChannel(channelId);
                clickTimers.delete(channelId);
            }, 250);
            clickTimers.set(channelId, timeoutId);
        }
    }

    const IconComponent = isLocked ? LockedSpeakerIcon : isDeaf ? DeafIcon : isMuted ? MutedIcon : SpeakerIcon;

    return (
        <Tooltip
            text={<VoiceChannelTooltip channel={channel} isLocked={isLocked} />}
            tooltipClassName="majic-uvs-tooltip-container"
            tooltipContentClassName="majic-uvs-tooltip-content"
        >
            {(props: Record<string, unknown>) => (
                <IconComponent
                    {...props}
                    role="button"
                    onClick={onClick}
                    className={classes(
                        "majic-uvs-clickable",
                        isActionButton && ActionButtonClasses.actionButton,
                        isActionButton && shouldHighlight && ActionButtonClasses.highlight,
                        isProfile && "majic-uvs-profile-speaker"
                    )}
                    size={(isActionButton || isMessage) ? 20 : 16}
                />
            )}
        </Tooltip>
    );
}

const VoiceChannelIndicator = withErrorBoundary("UserVoiceShow", VoiceChannelIndicatorComponent);

export default definePlugin({
    name: "UserVoiceShow",
    description: "Shows an indicator when a user is in a voice channel",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["MemberListDecoratorsAPI", "MessageDecorationsAPI"],
    translations: {
        fr: {
            description: "Affiche un indicateur quand un utilisateur est dans un salon vocal",
            options: {
                showInUserProfileModal: "Afficher l'indicateur dans le profil, à côté du nom",
                showInMemberList: "Afficher l'indicateur dans la liste des membres et des MP",
                showInMessages: "Afficher l'indicateur dans les messages"
            }
        }
    },
    settings,

    css: [
        ".majic-uvs-speaker { color: var(--interactive-icon-default); display: flex; align-items: center; justify-content: center; }",
        ".majic-uvs-clickable { cursor: pointer; }",
        ".majic-uvs-clickable:hover { color: var(--interactive-icon-hover); }",
        ".majic-uvs-profile-speaker { height: var(--custom-nickname-icon-size); margin-right: 4px; transform: translateY(1.3px); }",
        ".majic-uvs-tooltip-container { max-width: 50vw; }",
        ".majic-uvs-tooltip-content { display: flex; flex-direction: column; gap: 6px; }",
        ".majic-uvs-bold { margin: 0; font-weight: 700; }",
        ".majic-uvs-vc-members { display: flex; gap: 6px; }"
    ].join(" "),

    patches: [
        {
            find: "#{intl::USER_PROFILE_PRONOUNS}",
            predicate: () => settings.store.showInUserProfileModal,
            replacement: {
                match: /(user:(\i).{0,100}onClickDisplayName:\i,trailing:)(\i)/,
                replace: "$1[$self.VoiceChannelIndicator({userId:$2.id,isProfile:true}),$3]"
            }
        },
        {
            find: "null!=this.peopleListItemRef.current",
            predicate: () => settings.store.showInMemberList,
            replacement: {
                match: /\.isProvisional.{0,50}?className:\i\.\i,children:\[(?<=isFocused:(\i).+?)/,
                replace: "$&$self.VoiceChannelIndicator({userId:this?.props?.user?.id,isActionButton:true,shouldHighlight:$1}),"
            }
        }
    ],

    start() {
        if (settings.store.showInMemberList) {
            addMemberListDecorator("UserVoiceShow", ({ user }) => user == null ? null : <VoiceChannelIndicator userId={user.id} />);
        }
        if (settings.store.showInMessages) {
            addMessageDecoration("UserVoiceShow", ({ message }) => message?.author == null ? null : <VoiceChannelIndicator userId={message.author.id} isMessage={true} />);
        }
    },

    stop() {
        removeMemberListDecorator("UserVoiceShow");
        removeMessageDecoration("UserVoiceShow");
    },

    VoiceChannelIndicator
});
