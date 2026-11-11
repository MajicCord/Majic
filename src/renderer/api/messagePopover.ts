/*
 * Majic — message popover buttons API
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { Logger } from "@utils/logger";
import { React } from "@webpack/common";

const logger = new Logger("MessagePopover", "#ffb86c");

export interface MessagePopoverButton {
    label: string;
    icon: unknown;
    onClick(event: MouseEvent): void;
    dangerous?: boolean;
}

export type MessagePopoverButtonFactory = (message: any, channel: any) => MessagePopoverButton | null;

const factories = new Map<string, MessagePopoverButtonFactory>();

export const addMessagePopoverButton = (id: string, factory: MessagePopoverButtonFactory) => void factories.set(id, factory);
export const removeMessagePopoverButton = (id: string) => factories.delete(id);

const iconComponents = new Map<unknown, unknown>();

function asIconComponent(icon: unknown) {
    if (typeof icon === "function") return icon;
    if (!iconComponents.has(icon)) iconComponents.set(icon, () => React.createElement("span", { style: { fontSize: 16, lineHeight: 1 } }, icon as string));
    return iconComponents.get(icon);
}

export function _renderPopoverButtons({ message, channel }: { message: any; channel: any }, ButtonComponent: unknown) {
    if (!message || !factories.size) return null;

    return [...factories].map(([id, factory]) => {
        try {
            const button = factory(message, channel);
            if (!button) return null;
            return React.createElement(ErrorBoundary, { key: `majic-${id}`, name: `Message popover button ${id}` },
                React.createElement(ButtonComponent, { ...button, icon: asIconComponent(button.icon) })
            );
        } catch (err) {
            logger.error(`Popover button ${id} failed`, err);
            return null;
        }
    });
}
