/*
 * Majic — notifications API
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { createRoot, React, useEffect } from "@webpack/common";

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
.majic-notifications { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; display: flex; flex-direction: column; gap: 8px; pointer-events: none; }
.majic-notification { pointer-events: auto; display: flex; gap: 12px; width: 340px; padding: 12px 14px; border-radius: 8px; background: var(--background-floating, #111214); color: var(--text-normal, #dbdee1); box-shadow: var(--elevation-high, 0 8px 16px rgba(0,0,0,.24)); border-left: 4px solid var(--majic-accent, #7c3aed); cursor: pointer; font-family: var(--font-primary); }
.majic-notification img { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
.majic-notification-title { font-weight: 600; margin-bottom: 2px; color: var(--header-primary, #f2f3f5); }
.majic-notification-body { font-size: 14px; line-height: 18px; overflow-wrap: anywhere; }
.majic-notification-close { margin-left: auto; align-self: flex-start; background: none; border: none; color: var(--interactive-normal, #b5bac1); cursor: pointer; font-size: 16px; }
`;

interface Entry extends NotificationData {
    id: number;
}

let entries: Entry[] = [];
let nextId = 0;
let root: { render(node: unknown): void } | undefined;

function NotificationCard({ entry, onDone }: { entry: Entry; onDone(): void }) {
    useEffect(() => {
        if (entry.permanent) return;
        const timer = setTimeout(onDone, settings.notifications.timeout);
        return () => clearTimeout(timer);
    }, []);

    return React.createElement("div", {
        className: "majic-notification",
        style: entry.color ? { "--majic-accent": entry.color } : undefined,
        onClick: () => {
            entry.onClick?.();
            onDone();
        }
    },
    entry.icon && React.createElement("img", { src: entry.icon, alt: "" }),
    React.createElement("div", null,
        React.createElement("div", { className: "majic-notification-title" }, entry.title),
        React.createElement("div", { className: "majic-notification-body" }, entry.body)
    ),
    React.createElement("button", {
        className: "majic-notification-close",
        "aria-label": "Close",
        onClick: (event: MouseEvent) => {
            event.stopPropagation();
            onDone();
        }
    }, "×"));
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
