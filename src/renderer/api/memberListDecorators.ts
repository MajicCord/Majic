/*
 * Majic — member list decorators API
 */

import type { ReactNode } from "react";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { React } from "@webpack/common";

export type MemberListContext = "guild" | "dm";
export type MemberListDecorator = (props: { user?: any; channel?: any; context: MemberListContext; [key: string]: unknown }) => ReactNode;

const decorators = new Map<string, MemberListDecorator>();

export const addMemberListDecorator = (id: string, decorator: MemberListDecorator) => void decorators.set(id, decorator);
export const removeMemberListDecorator = (id: string) => decorators.delete(id);

export function _renderMemberListDecorators(props: Record<string, unknown>, context: MemberListContext) {
    if (!decorators.size) return null;

    const user = props?.user ?? (props?.channel as any)?.recipients?.[0];
    return [...decorators].map(([id, decorator]) =>
        React.createElement(ErrorBoundary, { key: `majic-${id}`, name: `Member list decorator ${id}` },
            React.createElement(decorator, { ...props, user, context })
        )
    );
}
