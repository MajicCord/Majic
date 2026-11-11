/*
 * Majic — common Discord modules
 */

import { filters, findByPropsLazy, waitFor } from "./index";

export let FluxDispatcher: any;
waitFor(filters.byProps("dispatch", "subscribe"), m => FluxDispatcher = m);

export const Flux: { Store: new (dispatcher: any, actionHandlers?: Record<string, (e: any) => void>) => any } = findByPropsLazy("connectStores");
