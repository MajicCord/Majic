/*
 * Majic — JumpToTop plugin
 */

import { getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { findComponentByCodeLazy } from "@webpack";
import { DiscordIcon, MessageActions, React } from "@webpack/common";

const ChannelToolbarIcon = findComponentByCodeLazy("tooltipPosition:", '"aria-haspopup":', '"data-jump-section":');

const UpArrowIcon = (props: { size?: number; width?: number; color?: string }) =>
    <DiscordIcon name="ArrowLargeUpIcon" size={props.width ?? 24} color={props.color ?? "currentColor"} />;

function jumpToTop(channelId: string) {
    MessageActions.jumpToMessage({
        channelId,
        messageId: channelId,
        flash: false,
        jumpType: "INSTANT"
    });
}

function JumpButton({ channel }: { channel: any }) {
    if (channel.isForumPost()) return null;

    return (
        <ChannelToolbarIcon
            tooltip={getIntlMessage("JUMP_TO_TOP")}
            icon={UpArrowIcon}
            onClick={() => jumpToTop(channel.id)}
        />
    );
}

export default definePlugin({
    name: "JumpToTop",
    description: "Adds a button to jump to the first message of a channel",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un bouton pour aller au premier message d'un salon"
        }
    },

    patches: [
        {
            find: "Missing channel in Channel.renderHeaderToolbar",
            replacement: {
                match: /(?<=renderHeaderToolbar"\);let (\i)=\[\];)/,
                replace: "$1.push($self.renderJumpButton(this.props));"
            }
        }
    ],

    renderJumpButton: withErrorBoundary("JumpToTop", JumpButton)
});
