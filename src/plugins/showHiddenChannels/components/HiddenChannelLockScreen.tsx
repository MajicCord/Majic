/*
 * Majic — ShowHiddenChannels lock screen
 */

import { isPluginEnabled } from "@renderer/plugins";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { findByPropsLazy, findComponentByCodeLazy, findCssClassesLazy } from "@webpack";
import { DiscordIcon, FluxDispatcher, Parser, Permissions, React, SnowflakeUtils, Stores, Timestamp, Tooltip, useEffect, useState } from "@webpack/common";
import type { ComponentType } from "react";

import openRolesAndUsersPermissionsModal from "../../permissionsViewer/components/RolesAndUsersPermissions";
import { sortPermissionOverwrites } from "../../permissionsViewer/utils";
import { cl, formatDurationVerbose, s, settings } from "../settings";

const SortOrderTypes = {
    LATEST_ACTIVITY: 0,
    CREATION_DATE: 1
} as const;

const ForumLayoutTypes = {
    DEFAULT: 0,
    LIST: 1,
    GRID: 2
} as const;

const ChannelTypes = {
    GUILD_TEXT: 0,
    GUILD_VOICE: 2,
    GUILD_ANNOUNCEMENT: 5,
    GUILD_STAGE_VOICE: 13,
    GUILD_FORUM: 15
} as const;

const VideoQualityModes = {
    AUTO: 1,
    FULL: 2
} as const;

const ChannelFlags = {
    PINNED: 1 << 1,
    REQUIRE_TAG: 1 << 4
} as const;

const ChatScrollClasses = findCssClassesLazy("auto", "managedReactiveScroller", "customTheme");
const TagComponent = findComponentByCodeLazy("#{intl::FORUM_TAG_A11Y_FILTER_BY_TAG}");

let ChannelBeginHeader: ComponentType<any> = () => null;
export const setChannelBeginHeader = (value: ComponentType<any>) => ChannelBeginHeader = value;

const EmojiParser = findByPropsLazy("convertSurrogateToName");
const EmojiUtils = findByPropsLazy("getURL", "getEmojiColors");

const channelTypeName = (type: number) => ({
    [ChannelTypes.GUILD_TEXT]: s("typeText"),
    [ChannelTypes.GUILD_ANNOUNCEMENT]: s("typeAnnouncement"),
    [ChannelTypes.GUILD_FORUM]: s("typeForum"),
    [ChannelTypes.GUILD_VOICE]: s("typeVoice"),
    [ChannelTypes.GUILD_STAGE_VOICE]: s("typeStage")
} as Record<number, string>)[type];

const sortOrderName = (order: number) => ({
    [SortOrderTypes.LATEST_ACTIVITY]: s("latestActivity"),
    [SortOrderTypes.CREATION_DATE]: s("creationDate")
} as Record<number, string>)[order];

const forumLayoutName = (layout: number) => ({
    [ForumLayoutTypes.DEFAULT]: s("notSet"),
    [ForumLayoutTypes.LIST]: s("listView"),
    [ForumLayoutTypes.GRID]: s("galleryView")
} as Record<number, string>)[layout];

const videoQualityName = (mode: number) => ({
    [VideoQualityModes.AUTO]: s("automatic"),
    [VideoQualityModes.FULL]: "720p"
} as Record<number, string>)[mode];

const HiddenChannelLogo = "/assets/433e3ec4319a9d11b0cbe39342614982.svg";

function Paragraph({ children, large }: { children: React.ReactNode; large?: boolean }) {
    return <p className={large ? "majic-shc-text-lg" : "majic-shc-text"}>{children}</p>;
}

function HiddenChannelLockScreen({ channel }: { channel: any }) {
    const { defaultAllowedUsersAndRolesDropdownState } = settings.use(["defaultAllowedUsersAndRolesDropdownState"]);
    const [permissions, setPermissions] = useState<any[]>([]);

    const {
        type,
        topic,
        lastMessageId,
        defaultForumLayout,
        lastPinTimestamp,
        defaultAutoArchiveDuration,
        availableTags,
        id: channelId,
        rateLimitPerUser,
        defaultThreadRateLimitPerUser,
        defaultSortOrder,
        defaultReactionEmoji,
        bitrate,
        rtcRegion,
        videoQualityMode,
        permissionOverwrites,
        guild_id
    } = channel;

    useEffect(() => {
        const membersToFetch: string[] = [];

        const guildOwnerId = Stores.GuildStore.getGuild(guild_id)?.ownerId;
        if (!Stores.GuildMemberStore.getMember(guild_id, guildOwnerId)) membersToFetch.push(guildOwnerId);

        Object.values<any>(permissionOverwrites).forEach(({ type: overwriteType, id: userId }) => {
            if (overwriteType === 1 && !Stores.GuildMemberStore.getMember(guild_id, userId)) membersToFetch.push(userId);
        });

        if (membersToFetch.length > 0) {
            FluxDispatcher.dispatch({ type: "GUILD_MEMBERS_REQUEST", guildIds: [guild_id], userIds: membersToFetch });
        }

        if (isPluginEnabled("PermissionsViewer")) {
            setPermissions(sortPermissionOverwrites(Object.values<any>(permissionOverwrites).map(overwrite => ({
                type: overwrite.type,
                id: overwrite.id,
                overwriteAllow: overwrite.allow,
                overwriteDeny: overwrite.deny
            })), guild_id));
        }
    }, [channelId]);

    const isForum = channel.isForumChannel();
    const isVoiceLike = channel.isGuildVoice() || channel.isGuildStageVoice();
    const typeName = channelTypeName(type);

    return (
        <div className={classes(ChatScrollClasses.auto, ChatScrollClasses.customTheme, ChatScrollClasses.managedReactiveScroller)}>
            <div className={cl("container")}>
                <img className={cl("logo")} src={HiddenChannelLogo} />

                <div className={cl("heading-container")}>
                    <h1 className="majic-shc-heading-xxl">
                        {!Stores.PermissionStore.can(Permissions.VIEW_CHANNEL, channel) ? s("headingHidden", { type: typeName }) : s("headingLocked", { type: typeName })}
                    </h1>
                    {channel.isNSFW() && (
                        <Tooltip text="NSFW">
                            {({ onMouseLeave, onMouseEnter }: { onMouseLeave(): void; onMouseEnter(): void }) => (
                                <span onMouseLeave={onMouseLeave} onMouseEnter={onMouseEnter} className={cl("heading-nsfw-icon")}>
                                    <DiscordIcon name="WarningIcon" size={32} />
                                </span>
                            )}
                        </Tooltip>
                    )}
                </div>

                {!isVoiceLike && (
                    <Paragraph large>
                        {isForum ? s("cannotSeePosts") : s("cannotSeeMessages")}
                        {isForum && topic && topic.length > 0 && s("guidelines")}
                    </Paragraph>
                )}

                {isForum && topic && topic.length > 0 && (
                    <div className={cl("topic-container")}>
                        {Parser.parseTopic(topic, false, { channelId })}
                    </div>
                )}

                {lastMessageId && (
                    <Paragraph>
                        {isForum ? s("lastPost") : s("lastMessage")}
                        <Timestamp timestamp={new Date(SnowflakeUtils.extractTimestamp(lastMessageId))} />
                    </Paragraph>
                )}
                {lastPinTimestamp && (
                    <Paragraph>{s("lastPin")}<Timestamp timestamp={new Date(lastPinTimestamp)} /></Paragraph>
                )}
                {(rateLimitPerUser ?? 0) > 0 && (
                    <Paragraph>{s("slowmode", { duration: formatDurationVerbose(rateLimitPerUser, "seconds") })}</Paragraph>
                )}
                {(defaultThreadRateLimitPerUser ?? 0) > 0 && (
                    <Paragraph>{s("threadSlowmode", { duration: formatDurationVerbose(defaultThreadRateLimitPerUser, "seconds") })}</Paragraph>
                )}
                {isVoiceLike && bitrate != null && (
                    <Paragraph>{s("bitrate", { bitrate })}</Paragraph>
                )}
                {rtcRegion !== undefined && (
                    <Paragraph>{s("region", { region: rtcRegion ?? s("automatic") })}</Paragraph>
                )}
                {isVoiceLike && (
                    <Paragraph>{s("videoQuality", { mode: videoQualityName(videoQualityMode ?? VideoQualityModes.AUTO) })}</Paragraph>
                )}
                {(defaultAutoArchiveDuration ?? 0) > 0 && (
                    <Paragraph>
                        {s(isForum ? "archivePosts" : "archiveThreads", { duration: formatDurationVerbose(defaultAutoArchiveDuration, "minutes") })}
                    </Paragraph>
                )}
                {defaultForumLayout != null && (
                    <Paragraph>{s("defaultLayout", { layout: forumLayoutName(defaultForumLayout) })}</Paragraph>
                )}
                {defaultSortOrder != null && (
                    <Paragraph>{s("defaultSort", { order: sortOrderName(defaultSortOrder) })}</Paragraph>
                )}
                {defaultReactionEmoji != null && (
                    <div className={cl("default-emoji-container")}>
                        <Paragraph>{s("defaultEmoji")}</Paragraph>
                        {Parser.defaultRules[defaultReactionEmoji.emojiName ? "emoji" : "customEmoji"].react({
                            name: defaultReactionEmoji.emojiName
                                ? EmojiParser.convertSurrogateToName(defaultReactionEmoji.emojiName)
                                : Stores.EmojiStore.getCustomEmojiById(defaultReactionEmoji.emojiId)?.name ?? "",
                            emojiId: defaultReactionEmoji.emojiId ?? void 0,
                            surrogate: defaultReactionEmoji.emojiName ?? void 0,
                            src: defaultReactionEmoji.emojiName ? EmojiUtils.getURL(defaultReactionEmoji.emojiName) : void 0
                        }, void 0, { key: 0 })}
                    </div>
                )}
                {channel.hasFlag(ChannelFlags.REQUIRE_TAG) && (
                    <Paragraph>{s("requireTag")}</Paragraph>
                )}
                {availableTags && availableTags.length > 0 && (
                    <div className={cl("tags-container")}>
                        <h2 className="majic-shc-heading">{s("availableTags")}</h2>
                        <div className={cl("tags")}>
                            {availableTags.map((tag: any) => <TagComponent tag={tag} key={tag.id} />)}
                        </div>
                    </div>
                )}
                <div className={cl("allowed-users-and-roles-container")}>
                    <div className={cl("allowed-users-and-roles-container-title")}>
                        {isPluginEnabled("PermissionsViewer") && (
                            <Tooltip text={s("permissionDetails")}>
                                {({ onMouseLeave, onMouseEnter }: { onMouseLeave(): void; onMouseEnter(): void }) => (
                                    <button
                                        onMouseLeave={onMouseLeave}
                                        onMouseEnter={onMouseEnter}
                                        className={cl("allowed-users-and-roles-container-permdetails-btn")}
                                        onClick={() => openRolesAndUsersPermissionsModal(permissions, Stores.GuildStore.getGuild(channel.guild_id), channel.name)}
                                    >
                                        <DiscordIcon name="MoreHorizontalIcon" size={24} />
                                    </button>
                                )}
                            </Tooltip>
                        )}
                        <h2 className="majic-shc-heading">{s("allowedUsers")}</h2>
                        <Tooltip text={defaultAllowedUsersAndRolesDropdownState ? s("hideAllowed") : s("viewAllowed")}>
                            {({ onMouseLeave, onMouseEnter }: { onMouseLeave(): void; onMouseEnter(): void }) => (
                                <button
                                    onMouseLeave={onMouseLeave}
                                    onMouseEnter={onMouseEnter}
                                    className={cl("allowed-users-and-roles-container-toggle-btn")}
                                    style={{ transform: defaultAllowedUsersAndRolesDropdownState ? "scaleY(-1)" : undefined }}
                                    onClick={() => settings.store.defaultAllowedUsersAndRolesDropdownState = !defaultAllowedUsersAndRolesDropdownState}
                                >
                                    <DiscordIcon name="ChevronSmallDownIcon" size={24} />
                                </button>
                            )}
                        </Tooltip>
                    </div>
                    {defaultAllowedUsersAndRolesDropdownState && <ChannelBeginHeader channel={channel} />}
                </div>
            </div>
        </div>
    );
}

export default withErrorBoundary("ShowHiddenChannels", HiddenChannelLockScreen);
