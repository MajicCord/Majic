/*
 * Majic — notifications API
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { createRoot, React, useEffect, useState } from "@webpack/common";

import { settings } from "./settings";
import { enableStyle } from "./styles";

export interface NotificationData {
    title: string;
    body: string;
    icon?: string;
    color?: string;
    permanent?: boolean;
    onClick?(): void;
    onClose?(): void;
}

const CSS = `
.majic-notifications { position: fixed; right: 1rem; bottom: 1rem; z-index: 2147483647; display: flex; flex-direction: column; gap: 8px; width: min(25vw, 400px); pointer-events: none; }
.majic-notification { all: unset; pointer-events: auto; display: flex; flex-direction: column; box-sizing: border-box; width: 100%; min-height: 10vh; overflow: hidden; border-radius: 6px; background-color: var(--background-base-low); color: var(--text-default); cursor: pointer; font-family: var(--font-primary); }
.majic-notification-inner { display: flex; flex-direction: row; gap: 1.25rem; padding: 1.25rem; }
.majic-notification-icon { width: 4rem; height: 4rem; border-radius: 6px; flex-shrink: 0; }
.majic-notification-content { width: 100%; overflow: hidden; }
.majic-notification-header { display: flex; justify-content: space-between; }
.majic-notification-title { margin: 0; color: var(--text-strong); font-size: 1rem; font-weight: 600; line-height: 1.25rem; text-transform: uppercase; }
.majic-notification-body { margin: 0.5rem 0 0; font-size: 14px; line-height: 140%; overflow-wrap: anywhere; }
.majic-notification-close { all: unset; cursor: pointer; color: var(--interactive-icon-default); opacity: 0.5; transition: opacity .2s ease-in-out, color .2s ease-in-out; }
.majic-notification-close:hover { color: var(--interactive-icon-hover); opacity: 1; }
.majic-notification-progress { height: 0.25rem; margin-top: auto; border-radius: 5px; }
`;

interface Entry extends NotificationData {
    id: number;
}

let entries: Entry[] = [];
let nextId = 0;
let root: { render(node: unknown): void } | undefined;

function useWindowFocus() {
    const [focused, setFocused] = useState(document.hasFocus());

    useEffect(() => {
        const onFocus = () => setFocused(true);
        const onBlur = () => setFocused(false);
        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);
        return () => {
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    return focused;
}

const CloseIcon = () => React.createElement("svg", { width: 24, height: 24, viewBox: "0 0 24 24", "aria-hidden": true },
    React.createElement("path", { fill: "currentColor", d: "M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z" })
);

function NotificationCard({ entry, onDone }: { entry: Entry; onDone(): void }) {
    const { timeout } = settings.notifications;
    const focused = useWindowFocus();
    const [hovered, setHovered] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const timed = !entry.permanent && timeout !== 0;

    useEffect(() => {
        if (!timed || hovered || !focused) return void setElapsed(0);

        const start = Date.now();
        const interval = setInterval(() => {
            const passed = Date.now() - start;
            if (passed >= timeout) onDone();
            else setElapsed(passed);
        }, 10);
        return () => clearInterval(interval);
    }, [hovered, focused]);

    return React.createElement("button", {
        type: "button",
        className: "majic-notification",
        onClick: () => {
            entry.onClick?.();
            onDone();
        },
        onContextMenu: (event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            onDone();
        },
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false)
    },
    React.createElement("div", { className: "majic-notification-inner" },
        entry.icon && React.createElement("img", { className: "majic-notification-icon", src: entry.icon, alt: "" }),
        React.createElement("div", { className: "majic-notification-content" },
            React.createElement("div", { className: "majic-notification-header" },
                React.createElement("h2", { className: "majic-notification-title" }, entry.title),
                React.createElement("span", {
                    role: "button",
                    className: "majic-notification-close",
                    "aria-label": "Close",
                    onClick: (event: MouseEvent) => {
                        event.stopPropagation();
                        onDone();
                    }
                }, React.createElement(CloseIcon))
            ),
            React.createElement("p", { className: "majic-notification-body" }, entry.body)
        )
    ),
    timed && React.createElement("div", {
        className: "majic-notification-progress",
        style: { width: `${(1 - elapsed / timeout) * 100}%`, backgroundColor: entry.color || "#ec4899" }
    }));
}

function close(id: number) {
    const entry = entries.find(e => e.id === id);
    entries = entries.filter(e => e.id !== id);
    entry?.onClose?.();
    render();
}

function render() {
    if (!root) {
        enableStyle("notifications", CSS);
        const host = document.createElement("div");
        host.className = "majic-notifications";
        document.body.append(host);
        root = createRoot(host);
    }

    root.render(entries.map(entry =>
        React.createElement(ErrorBoundary, { key: entry.id, name: `Notification ${entry.title}` },
            React.createElement(NotificationCard, { entry, onDone: () => close(entry.id) })
        )
    ));
}

function shouldUseNative() {
    if (typeof Notification === "undefined" || Notification.permission === "denied") return false;
    const { useNative } = settings.notifications;
    return useNative === "always" || (useNative === "not-focused" && !document.hasFocus());
}

async function showNative({ title, body, icon, onClick, onClose }: NotificationData) {
    if (Notification.permission !== "granted" && await Notification.requestPermission() !== "granted") return false;
    const notification = new Notification(title, { body, icon });
    notification.onclick = () => onClick?.();
    notification.onclose = () => onClose?.();
    return true;
}

export async function showNotification(data: NotificationData) {
    if (shouldUseNative() && await showNative(data)) return;
    entries = [...entries, { ...data, id: nextId++ }];
    render();
}
