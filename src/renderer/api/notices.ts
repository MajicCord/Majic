/*
 * Majic — notices API
 */

import type { ReactNode } from "react";
import { FluxDispatcher } from "@webpack/common";

export interface Notice {
    message: ReactNode;
    buttonText?: string;
    onButtonClick?(): void;
    type?: string;
}

const ID_PREFIX = "majic-notice-";
const queue: Array<{ id: string } & Notice> = [];
let current: string | null = null;
let currentNotice: ({ id: string } & Notice) | null = null;
let nextId = 0;

function show(notice: { id: string } & Notice) {
    current = notice.id;
    currentNotice = notice;
    FluxDispatcher.dispatch({
        type: "NOTICE_SHOW",
        notice: {
            id: notice.id,
            type: notice.type ?? "GENERIC",
            message: notice.message,
            buttonText: notice.buttonText,
            callback: notice.onButtonClick
        }
    });
}

export function showNotice(notice: Notice) {
    const id = `${ID_PREFIX}${nextId++}`;
    queue.push({ id, ...notice });
    if (!current) _showNextNotice();
    return id;
}

export function dismissNotice(id?: string) {
    if (id && id !== current) {
        const index = queue.findIndex(n => n.id === id);
        if (index !== -1) queue.splice(index, 1);
        return;
    }
    if (current) FluxDispatcher.dispatch({ type: "NOTICE_DISMISS", id: current });
}

export function _showNextNotice() {
    current = null;
    currentNotice = null;
    const next = queue.shift();
    if (next) show(next);
}

export const _isMajicNotice = (notice: { id?: unknown } | null | undefined) =>
    typeof notice?.id === "string" && notice.id.startsWith(ID_PREFIX);

export const isNoticeShownOrQueued = (message: Notice["message"]) =>
    currentNotice?.message === message || queue.some(notice => notice.message === message);
