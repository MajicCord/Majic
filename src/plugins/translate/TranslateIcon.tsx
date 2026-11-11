/*
 * Majic — Translate icon and chat bar button
 */

import { ChatBarButton, type ChatBarButtonRenderer } from "@api/chatButtons";
import { findByCodeLazy } from "@webpack";
import { DiscordIcon, openModal, React, Tooltip, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { s } from "./strings";
import { openTranslateModal } from "./TranslateModal";
import { cl } from "./utils";

const ConfirmModal = findByCodeLazy("actionBarInput:", '"critical"', '"secondary');

export function TranslateIcon({ height = 20, width = 20, className }: { height?: number; width?: number; className?: string }) {
    return (
        <span className={className ? `${cl("icon")} ${className}` : cl("icon")} style={{ display: "inline-flex", width, height }}>
            <DiscordIcon name="LanguageIcon" size={Math.min(width, height)} />
        </span>
    );
}

export let setShouldShowTranslateEnabledTooltip: undefined | ((show: boolean) => void);

function AutoTranslateConfirmModal(props: any) {
    const store = settings.use(["dismissedAutoTranslateAlert"]);

    return (
        <ConfirmModal
            {...props}
            title={s("autoEnabledTitle")}
            subtitle={s("autoEnabledSubtitle")}
            confirmText={s("disableAuto")}
            onConfirm={() => settings.store.autoTranslate = false}
            cancelText={s("gotIt")}
            variant="primary"
            checkboxProps={{
                label: s("dontShowAgain"),
                checked: store.dismissedAutoTranslateAlert === true,
                onChange: (checked: boolean) => store.dismissedAutoTranslateAlert = checked
            }}
        />
    );
}

export const TranslateChatBarIcon: ChatBarButtonRenderer = ({ isMainChat }) => {
    const { autoTranslate } = settings.use(["autoTranslate"]);

    const [shouldShowTranslateEnabledTooltip, setter] = useState(false);
    useEffect(() => {
        setShouldShowTranslateEnabledTooltip = setter;
        return () => void (setShouldShowTranslateEnabledTooltip = undefined);
    }, []);

    if (!isMainChat) return null;

    const toggle = () => {
        const newState = !autoTranslate;
        settings.store.autoTranslate = newState;
        if (newState && !settings.store.dismissedAutoTranslateAlert) {
            openModal((props: any) => <AutoTranslateConfirmModal {...props} />);
        }
    };

    const button = (
        <ChatBarButton
            tooltip={s("openModal")}
            onClick={e => {
                if (e.shiftKey) return toggle();
                openTranslateModal();
            }}
            onContextMenu={toggle}
            buttonProps={{ "aria-haspopup": "dialog" }}
        >
            <TranslateIcon className={cl({ "auto-translate": autoTranslate, "chat-button": true })} />
        </ChatBarButton>
    );

    if (shouldShowTranslateEnabledTooltip && settings.store.showAutoTranslateTooltip) {
        return (
            <Tooltip text={s("autoEnabledTooltip")} forceOpen>
                {(tooltipProps: Record<string, unknown>) => <div {...tooltipProps}>{button}</div>}
            </Tooltip>
        );
    }

    return button;
};
