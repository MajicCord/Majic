/*
 * Majic — common Discord modules
 */

import { _resolveReady, findByPropsLazy, waitFor } from "./webpack";

export let FluxDispatcher: any;
waitFor(["dispatch", "subscribe"], dispatcher => {
    FluxDispatcher = dispatcher;

    const onConnectionOpen = () => {
        dispatcher.unsubscribe("CONNECTION_OPEN", onConnectionOpen);
        _resolveReady();
    };
    dispatcher.subscribe("CONNECTION_OPEN", onConnectionOpen);
});

export const Flux: { Store: new (dispatcher: any, actionHandlers?: Record<string, (e: any) => void>) => any } = findByPropsLazy("connectStores");

export let React: any;
waitFor("useState", m => React = m);
