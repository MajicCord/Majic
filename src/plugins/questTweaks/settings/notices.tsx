/*
 * Majic — QuestTweaks one-time notices
 */

import { Modal, openModal, React, useEffect, useState } from "@webpack/common";
import type { ComponentType, JSX } from "react";

import { s } from "../strings";
import { getQuestTweaksSettings } from "./access";
import { resetDangerousSettings } from "./dangerous";
import { promptToRestartIfDirty } from "./restartTracking";

type NoticeActionVariant = "primary" | "secondary" | "critical-primary" | "critical-secondary" | "active" | "overlay-primary" | "overlay-secondary" | "expressive";

const NoticeModal = Modal as ComponentType<any>;

interface NoticeActionStep {
    text: () => string;
    variant?: NoticeActionVariant;
    disabledFor?: number;
    confirmation?: NoticeActionStep;
}

interface NoticeAction extends NoticeActionStep {
    run?: () => void;
    promptForRestart?: boolean;
}

interface OneTimeNotice {
    id: string;
    title: () => string;
    dismissable?: boolean;
    renderBody: () => JSX.Element;
    condition: () => boolean;
    autoAcknowledgeCondition?: () => boolean;
    actions: readonly NoticeAction[];
}

const TermsLink = () => <a href="https://discord.com/safety/platform-manipulation-policy-explainer" target="_blank" rel="noreferrer">{s("termsOfService")}</a>;

const oneTimeNotices: readonly OneTimeNotice[] = [
    {
        id: "quest-ban-warning-2026-08-07",
        title: () => s("noticeTitle1"),
        renderBody: () => <div className="majic-qt-startup-notice-body">
            <p>
                {s("notice1Text1")} <TermsLink />.
            </p>
            <br />
            <p>
                {s("notice1Text2")}
            </p>
            <br />
            <p>
                {s("notice1Text3")}
            </p>
        </div>,
        condition: () => {
            const settings = getQuestTweaksSettings();

            return settings.enabled && settings.allowChangingDangerousSettings;
        },
        autoAcknowledgeCondition: () => !getQuestTweaksSettings().allowChangingDangerousSettings,
        actions: [
            {
                text: () => s("keepDangerous"),
                variant: "critical-primary"
            },
            {
                text: () => s("disableDangerous"),
                variant: "primary",
                run: resetDangerousSettings,
                promptForRestart: true
            }
        ]
    },
    {
        id: "quest-ban-warning-2026-08-26",
        title: () => s("noticeTitle2"),
        dismissable: false,
        renderBody: () => <div className="majic-qt-startup-notice-body">
            <p>
                {s("notice2Text1")} <TermsLink />.
            </p>
            <br />
            <p>
                {s("notice2Text2")} <strong>{s("notice2Text2Strong")}</strong>
            </p>
            <br />
            <p>
                {s("notice2Text3")}
            </p>
        </div>,
        condition: () => {
            const settings = getQuestTweaksSettings();

            return settings.enabled && settings.allowChangingDangerousSettings;
        },
        autoAcknowledgeCondition: () => !getQuestTweaksSettings().allowChangingDangerousSettings,
        actions: [
            {
                text: () => s("keepDangerous"),
                variant: "critical-primary",
                disabledFor: 10,
                confirmation: {
                    text: () => s("areYouSureNotice"),
                    variant: "critical-secondary",
                    disabledFor: 5
                }
            },
            {
                text: () => s("disableDangerous"),
                variant: "primary",
                run: resetDangerousSettings,
                promptForRestart: true
            }
        ]
    }
];

function acknowledgeNotice(id: string): void {
    const settings = getQuestTweaksSettings();

    settings.acknowledgedNotices = {
        ...settings.acknowledgedNotices,
        [id]: true
    };
}

function runNoticeAction(notice: OneTimeNotice, action: NoticeAction, onClose: () => void): void {
    acknowledgeNotice(notice.id);
    action.run?.();
    onClose();

    setTimeout(() => {
        if (!action.promptForRestart || !promptToRestartIfDirty({ onDecline: showPendingQuestTweaksNotice })) {
            showPendingQuestTweaksNotice();
        }
    }, 0);
}

interface NoticeActionState {
    step: NoticeActionStep;
    startedAt: number;
}

function getRemainingSeconds({ startedAt, step }: NoticeActionState, now: number): number {
    const disabledFor = Math.max(0, step.disabledFor ?? 0);

    return Math.max(0, Math.ceil((startedAt + disabledFor * 1000 - now) / 1000));
}

function isNoticeDismissable(notice: OneTimeNotice): boolean {
    return notice.dismissable ?? true;
}

function OneTimeNoticeModal({ notice, ...modalProps }: { notice: OneTimeNotice; onClose(): void; [key: string]: any }): JSX.Element {
    const [actionStates, setActionStates] = useState<NoticeActionState[]>(() => {
        const startedAt = Date.now();

        return notice.actions.map(step => ({ step, startedAt }));
    });

    const [now, setNow] = useState(Date.now);
    const remainingSeconds = actionStates.map(actionState => getRemainingSeconds(actionState, now));
    const isCountingDown = remainingSeconds.some(seconds => seconds > 0);

    useEffect(() => {
        if (!isCountingDown) return;

        const timeout = setTimeout(() => setNow(Date.now()), 250);

        return () => clearTimeout(timeout);
    }, [actionStates, isCountingDown, now]);

    function handleActionClick(actionIndex: number): void {
        const { confirmation } = actionStates[actionIndex].step;

        if (confirmation) {
            const startedAt = Date.now();

            setActionStates(currentStates => currentStates.map((actionState, index) => (
                index === actionIndex
                    ? { step: confirmation, startedAt }
                    : actionState
            )));
            setNow(startedAt);
            return;
        }

        runNoticeAction(notice, notice.actions[actionIndex], modalProps.onClose);
    }

    return (
        <NoticeModal
            {...modalProps}
            dismissable={isNoticeDismissable(notice)}
            role="alertdialog"
            size="lg"
            title={notice.title()}
            actions={actionStates.map(({ step }, actionIndex) => ({
                text: remainingSeconds[actionIndex] > 0
                    ? `${step.text()} (${remainingSeconds[actionIndex]})`
                    : step.text(),
                variant: step.variant ?? "primary",
                disabled: remainingSeconds[actionIndex] > 0,
                onClick: () => handleActionClick(actionIndex)
            }))}
        >
            {notice.renderBody()}
        </NoticeModal>
    );
}

export function showPendingQuestTweaksNotice(): void {
    for (const notice of oneTimeNotices) {
        if (getQuestTweaksSettings().acknowledgedNotices[notice.id]) {
            continue;
        }

        if (!notice.condition()) {
            if (notice.autoAcknowledgeCondition?.()) {
                acknowledgeNotice(notice.id);
            }

            continue;
        }

        openModal((modalProps: any) => <OneTimeNoticeModal {...modalProps} notice={notice} />, { dismissable: isNoticeDismissable(notice) });
        return;
    }
}
