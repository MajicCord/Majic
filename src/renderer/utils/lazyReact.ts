/*
 * Majic — lazy React components
 */

import type { ReactNode } from "react";

import { makeLazy } from "./lazy";

export type LazyComponentType<P> = ((props: P) => ReactNode) & { resolveComponent(): unknown };

export function LazyComponent<P extends object = any>(factory: () => any, maxTries = 5): LazyComponentType<P> {
    const resolveComponent = makeLazy(factory, maxTries);
    const Component = (props: P) => {
        const Resolved = resolveComponent();
        return Resolved ? Majic.Webpack.Common.React.createElement(Resolved, props) : null;
    };
    return Object.assign(Component, { resolveComponent });
}
