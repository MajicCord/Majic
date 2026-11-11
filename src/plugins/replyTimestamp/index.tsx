/*
 * Majic — ReplyTimestamp plugin
 */

import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { findCssClassesLazy } from "@webpack";
import { DateUtils, React, Timestamp } from "@webpack/common";

const MessageClasses = findCssClassesLazy("separator", "latin24CompactTimeStamp");

const LOADED = 0;

interface ReplyTimestampProps {
    referencedMessage: { state: number; message?: { timestamp: unknown } };
    baseMessage: { timestamp: unknown };
}

const Separator = ({ children }: { children: string }) => <i className={MessageClasses.separator} aria-hidden>{children}</i>;

function ReplyTimestamp({ referencedMessage, baseMessage }: ReplyTimestampProps) {
    if (referencedMessage.state !== LOADED || !referencedMessage.message) return null;

    const replied = referencedMessage.message.timestamp;
    const sameDay = DateUtils.isSameDay(replied, baseMessage.timestamp);

    return (
        <Timestamp className="majic-reply-timestamp" compact={sameDay} timestamp={replied} isInline={false}>
            <Separator>[</Separator>
            {sameDay ? DateUtils.dateFormat(replied, "LT") : DateUtils.calendarFormat(replied)}
            <Separator>]</Separator>
        </Timestamp>
    );
}

export default definePlugin({
    name: "ReplyTimestamp",
    description: "Shows when the replied message was sent on reply previews",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche l'heure du message auquel on répond dans l'aperçu de réponse"
        }
    },

    css: ".majic-reply-timestamp { margin-inline-end: 0.5rem; width: unset !important; }",

    patches: [
        {
            find: "#{intl::REPLY_QUOTE_MESSAGE_NOT_LOADED}",
            replacement: {
                match: /\.onClickReply,.+?}\),(?=\i,\i,\i\])/,
                replace: "$&$self.ReplyTimestamp(arguments[0]),"
            }
        }
    ],

    ReplyTimestamp: withErrorBoundary("ReplyTimestamp", ReplyTimestamp)
});
