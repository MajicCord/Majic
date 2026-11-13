/*
 * Majic — chat bar buttons API
 */

import type { ReactNode } from "react";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { findCssClassesLazy } from "@webpack";
import { saveSettings, settings } from "@api/settings";
import { Clickable, React, Tooltip, useEffect, useReducer } from "@webpack/common";

export interface ChatBarProps {
    channel: any;
    disabled: boolean;
    type: { analyticsName: string; [key: string]: unknown };
    [key: string]: unknown;
}

export type ChatBarButtonRenderer = (props: ChatBarProps & { isMainChat: boolean; isAnyChat: boolean }) => ReactNode;

const buttons = new Map<string, ChatBarButtonRenderer>();
const listeners = new Set<() => void>();

export const addChatBarButton = (id: string, render: ChatBarButtonRenderer) => void buttons.set(id, render);
export const removeChatBarButton = (id: string) => buttons.delete(id);

export const getChatBarButtonIds = () => [...buttons.keys()];

export const isChatBarButtonEnabled = (id: string) => settings.uiElements.chatBarButtons[id]?.enabled !== false;

export function setChatBarButtonEnabled(id: string, enabled: boolean) {
    settings.uiElements.chatBarButtons[id] = { enabled };
    saveSettings();
    listeners.forEach(listener => listener());
}

function MajicChatBarButtons(props: ChatBarProps) {
    const [, rerender] = useReducer((n: number) => n + 1, 0);

    useEffect(() => {
        listeners.add(rerender);
        return () => void listeners.delete(rerender);
    }, []);

    const analyticsName = props.type?.analyticsName;
    const isMainChat = analyticsName === "normal";
    const isAnyChat = ["normal", "sidebar"].includes(analyticsName);

    return React.createElement(React.Fragment, null,
        [...buttons]
            .filter(([id]) => isChatBarButtonEnabled(id))
            .map(([id, render]) =>
                React.createElement(ErrorBoundary, { key: id, name: `Chat bar button ${id}` },
                    React.createElement(render, { ...props, isMainChat, isAnyChat })
                )
            )
    );
}

export function _injectChatBarButtons(existing: ReactNode[], props: ChatBarProps) {
    if (props?.disabled || existing.length === 0) return;
    existing.unshift(React.createElement(MajicChatBarButtons, { key: "majic-chat-buttons", ...props }));
}

export interface ChatBarButtonProps {
    tooltip: string;
    onClick(event: MouseEvent): void;
    onContextMenu?(event: MouseEvent): void;
    onAuxClick?(event: MouseEvent): void;
    buttonProps?: Record<string, unknown>;
    children: ReactNode;
}

const ButtonWrapperClasses = findCssClassesLazy("button", "buttonWrapper", "notificationDot");
const ChannelTextAreaClasses = findCssClassesLazy("buttonContainer", "channelTextArea", "button");

const classes = (...names: Array<string | undefined>) => names.filter(Boolean).join(" ");

export function ChatBarButton(props: ChatBarButtonProps) {
    return React.createElement(Tooltip, {
        text: props.tooltip,
        children: ({ onMouseEnter, onMouseLeave }: { onMouseEnter(): void; onMouseLeave(): void }) =>
            React.createElement("div", { className: classes("expression-picker-chat-input-button", ChannelTextAreaClasses?.buttonContainer, "majic-chatbar-button") },
                React.createElement(Clickable, {
                    "aria-label": props.tooltip,
                    onMouseEnter,
                    onMouseLeave,
                    className: classes(ButtonWrapperClasses.button, ChannelTextAreaClasses?.button),
                    onClick: props.onClick,
                    onContextMenu: props.onContextMenu,
                    onAuxClick: props.onAuxClick,
                    ...props.buttonProps
                }, React.createElement("div", { className: ButtonWrapperClasses.buttonWrapper }, props.children))
            )
    });
}
