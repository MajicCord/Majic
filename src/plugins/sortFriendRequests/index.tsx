/*
 * Majic — SortFriendRequests plugin
 */

import { definePluginSettings } from "@api/settings";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { DateUtils, React, Stores, Tooltip } from "@webpack/common";
import type { ReactNode } from "react";

const formatter = new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "numeric"
});

function getSince(user: { id: string }) {
    return new Date(Stores.RelationshipStore.getSince(user.id));
}

const settings = definePluginSettings({
    showDates: {
        type: OptionType.BOOLEAN,
        description: "Show dates on friend requests",
        default: false,
        restartNeeded: true
    }
});

function WrapperDateComponent({ user, children }: { user: { id: string }; children?: ReactNode }) {
    const since = getSince(user);

    return (
        <div className="majic-sortFriendRequests-wrapper">
            {children}
            {!isNaN(since.getTime()) && (
                <Tooltip text={DateUtils.dateFormat(since, "LLLL")} tooltipClassName="majic-sortFriendRequests-tooltip">
                    {(props: Record<string, unknown>) => (
                        <div {...props}>
                            <p className="majic-sortFriendRequests-date">{formatter.format(since)}</p>
                        </div>
                    )}
                </Tooltip>
            )}
        </div>
    );
}

export default definePlugin({
    name: "SortFriendRequests",
    description: "Sorts friend requests by date of receipt",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Trie les demandes d'ami par date de réception",
            options: {
                showDates: "Afficher les dates sur les demandes d'ami"
            }
        }
    },
    settings,

    css: ".majic-sortFriendRequests-wrapper { display: flex; flex-direction: row; justify-content: space-between; align-items: center; width: 100%; margin-right: 0.5em; } .majic-sortFriendRequests-tooltip { max-width: none; white-space: nowrap; } .majic-sortFriendRequests-date { margin: 0; font-size: 12px; color: var(--text-muted); font-family: var(--font-code); }",

    patches: [
        {
            find: "getRelationshipCounts(){",
            replacement: {
                match: /\}\)\.sortBy\((.+?)\)\.value\(\)/,
                replace: "}).sortBy(row => $self.wrapSort(($1), row)).value()"
            }
        },
        {
            find: "#{intl::FRIEND_REQUEST_CANCEL}",
            replacement: {
                predicate: () => settings.store.showDates,
                match: /(?<=children:\[)\(0,.{0,100}user:\i,hovered:\i.+?(?=,\(0)(?<=user:(\i).+?)/,
                replace: (children: string, user: string) => `$self.WrapperDateComponent({user:${user},children:${children}})`
            }
        }
    ],

    wrapSort(comparator: (row: any) => unknown, row: any) {
        return row.type === 3 || row.type === 4
            ? -getSince(row.user)
            : comparator(row);
    },

    WrapperDateComponent: withErrorBoundary("SortFriendRequests", WrapperDateComponent)
});
