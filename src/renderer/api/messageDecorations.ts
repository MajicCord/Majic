/*
 * Majic — message accessories and decorations API
 */

import type { ReactNode } from "react";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { React } from "@webpack/common";

const logger = new Logger("MessageDecorations", "#ff79c6");

export type MessageAccessory = (props: { message: any; channel?: any; [key: string]: unknown }) => ReactNode;
export type MessageDecoration = (props: { message: any; [key: string]: unknown }) => ReactNode;

const accessories = new Map<string, { render: MessageAccessory; position?: number }>();
const decorations = new Map<string, MessageDecoration>();

export const addMessageAccessory = (id: string, render: MessageAccessory, position?: number) => void accessories.set(id, { render, position });
export const removeMessageAccessory = (id: string) => accessories.delete(id);
export const addMessageDecoration = (id: string, render: MessageDecoration) => void decorations.set(id, render);
export const removeMessageDecoration = (id: string) => decorations.delete(id);

export function _withAccessories(children: unknown[], props: { message: any; [key: string]: unknown }) {
    if (!accessories.size || !Array.isArray(children)) return children;

    try {
        const result = [...children];
        for (const [id, { render, position }] of accessories) {
            const element = React.createElement(ErrorBoundary, { key: `majic-${id}`, name: `Message accessory ${id}` }, React.createElement(render, props));
            const index = position == null ? result.length : position < 0 ? result.length + position : position;
            result.splice(index, 0, element);
        }
        return result;
    } catch (err) {
        logger.error("Failed to add message accessories", err);
        return children;
    }
}

export function _renderDecorations(props: { message: any; [key: string]: unknown }) {
    if (!decorations.size) return null;

    return React.createElement("div", { className: "majic-message-decorations-wrapper" },
        [...decorations].map(([id, render]) =>
            React.createElement(ErrorBoundary, { key: `majic-${id}`, name: `Message decoration ${id}` }, React.createElement(render, props))
        )
    );
}
