/*
 * Majic — server list elements API
 */

import type { ReactNode } from "react";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { React } from "@webpack/common";

export type ServerListPosition = "above" | "in";
export type ServerListElement = () => ReactNode;

const elements: Record<ServerListPosition, Map<string, ServerListElement>> = {
    above: new Map(),
    in: new Map()
};

export const addServerListElement = (position: ServerListPosition, id: string, render: ServerListElement) =>
    void elements[position].set(id, render);

export const removeServerListElement = (position: ServerListPosition, id: string) => elements[position].delete(id);

export function _renderServerListElements(position: ServerListPosition) {
    return [...elements[position]].map(([id, render]) =>
        React.createElement(ErrorBoundary, { key: `majic-${id}`, name: `Server list element ${id}` }, React.createElement(render))
    );
}
