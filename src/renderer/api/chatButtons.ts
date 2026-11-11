/*
 * Majic — chat bar buttons API
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { React, Tooltip } from "@webpack/common";

export interface ChatBarProps {
    channel: any;
    disabled: boolean;
    type: { analyticsName: string; [key: string]: unknown };
    [key: string]: unknown;
}

export type ChatBarButtonRenderer = (props: ChatBarProps & { isMainChat: boolean }) => unknown;

const buttons = new Map<string, ChatBarButtonRenderer>();

export const addChatBarButton = (id: string, render: ChatBarButtonRenderer) => void buttons.set(id, render);
export const removeChatBarButton = (id: string) => buttons.delete(id);

export function _injectChatBarButtons(existing: unknown[], props: ChatBarProps) {
    if (!buttons.size || props?.disabled) return existing;

    const isMainChat = props.type?.analyticsName === "normal";
    const ours = [...buttons].map(([id, render]) =>
        React.createElement(ErrorBoundary, { key: `majic-${id}`, name: `Chat bar button ${id}` },
            React.createElement(render, { ...props, isMainChat })
        )
    );
    return [...ours, ...existing];
}

export interface ChatBarButtonProps {
    tooltip: string;
    onClick(event: MouseEvent): void;
    onContextMenu?(event: MouseEvent): void;
    children: unknown;
}

const BUTTON_STYLE = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    padding: "0 8px",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "var(--interactive-normal)"
};

export function ChatBarButton({ tooltip, onClick, onContextMenu, children }: ChatBarButtonProps) {
    return React.createElement(Tooltip, { text: tooltip }, (tooltipProps: { onMouseEnter(): void; onMouseLeave(): void }) =>
        React.createElement("button", {
            ...tooltipProps,
            type: "button",
            "aria-label": tooltip,
            className: "majic-chatbar-button",
            style: BUTTON_STYLE,
            onClick,
            onContextMenu
        }, children)
    );
}
