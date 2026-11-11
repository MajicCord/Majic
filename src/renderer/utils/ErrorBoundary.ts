/*
 * Majic — React error boundary
 */

import { React } from "@webpack/common";

import { Logger } from "./logger";

const logger = new Logger("ErrorBoundary", "#ff5555");

export interface ErrorBoundaryProps {
    name: string;
    fallback?: unknown;
    children?: unknown;
}

let ErrorBoundaryClass: any;

function getErrorBoundary() {
    ErrorBoundaryClass ??= class ErrorBoundary extends React.Component<ErrorBoundaryProps, { failed: boolean }> {
        state = { failed: false };

        static getDerivedStateFromError() {
            return { failed: true };
        }

        componentDidCatch(error: unknown) {
            logger.error(`${this.props.name} crashed while rendering`, error);
        }

        render() {
            return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
        }
    };
    return ErrorBoundaryClass;
}

export function ErrorBoundary(props: ErrorBoundaryProps) {
    return React.createElement(getErrorBoundary(), props, props.children);
}

export function withErrorBoundary<P extends object>(name: string, Component: (props: P) => unknown) {
    return (props: P) => React.createElement(getErrorBoundary(), { name }, React.createElement(Component, props));
}
