/*
 * Majic — QuestTweaks Quest tile context menu
 */

import { Menu } from "@api/contextMenu";
import { copyToClipboard } from "@utils/discord";
import { React } from "@webpack/common";
import type { ReactNode } from "react";

import { addIgnoredQuest, questIsIgnored, removeIgnoredQuest } from "../settings/ignoredQuests";
import { rerenderQuests } from "../settings/rerender";
import { s } from "../strings";
import type { Quest } from "../types";
import { canAutoCompleteQuest, enrollAndLaunchQuestActivity, enrollAndStartQuestAutoComplete, ensureQuestEnrolled, getQuestActivityApplicationId, getQuestAutoCompleteEntry, isQuestEnrollmentCompatible, stopQuestAutoComplete } from "../utils/completion";
import { getQuestStatus, QuestStatus, refreshQuest } from "../utils/questState";
import { q } from "../utils/ui";

export function QuestTileContextMenu(
    children: ReactNode[],
    props: { quest?: Quest },
    isClaimedMenu: boolean = false,
): void {
    const quest = props.quest && refreshQuest(props.quest);

    if (!quest) {
        return;
    }

    const isIgnored = questIsIgnored(quest.id);
    const isEnrolled = Boolean(quest.userStatus?.enrolledAt);
    const isAutoCompleting = getQuestAutoCompleteEntry(quest) != null;
    const canStartAutoComplete = !isClaimedMenu && canAutoCompleteQuest(quest);
    const canEnroll = !isClaimedMenu && !isEnrolled && !quest.userStatus?.completedAt
        && getQuestStatus(quest, []) === QuestStatus.Unclaimed && isQuestEnrollmentCompatible(quest);
    const canLaunchActivity = getQuestActivityApplicationId(quest) !== null && (isEnrolled || canEnroll);

    children.unshift((
        <Menu.MenuGroup>
            {canLaunchActivity && (
                <Menu.MenuItem
                    id={q("launch-activity")}
                    label={s("launchActivity")}
                    action={async () => {
                        await enrollAndLaunchQuestActivity(quest);
                        rerenderQuests();
                    }}
                />
            )}
            {canEnroll && (
                <Menu.MenuItem
                    id={q("enroll-in-quest")}
                    label={s("enrollInQuest")}
                    action={async () => {
                        if ((await ensureQuestEnrolled(quest)).type === "success") {
                            rerenderQuests();
                        }
                    }}
                />
            )}
            {isAutoCompleting ? (
                <Menu.MenuItem
                    id={q("stop-auto-complete")}
                    label={s("stopAutoComplete")}
                    action={() => {
                        stopQuestAutoComplete(quest, {
                            manual: true,
                            preserveResume: false,
                            terminalHeartbeat: true
                        });
                        rerenderQuests();
                    }}
                />
            ) : canStartAutoComplete ? (
                <Menu.MenuItem
                    id={q("start-auto-complete")}
                    label={s("startAutoComplete")}
                    action={async () => {
                        if (await enrollAndStartQuestAutoComplete(quest)) {
                            rerenderQuests();
                        }
                    }}
                />
            ) : null}
            {!isClaimedMenu && (!isIgnored ? (
                <Menu.MenuItem
                    id={q("ignore-quest")}
                    label={s("markIgnored")}
                    action={() => addIgnoredQuest(quest.id)}
                />
            ) : (
                <Menu.MenuItem
                    id={q("unignore-quest")}
                    label={s("unmarkIgnored")}
                    action={() => removeIgnoredQuest(quest.id)}
                />
            ))}
            <Menu.MenuItem
                id={q("copy-quest-id")}
                label={s("copyQuestId")}
                action={() => copyToClipboard(quest.id)}
            />
        </Menu.MenuGroup>
    ));
}
