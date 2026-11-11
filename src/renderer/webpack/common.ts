/*
 * Majic — common Discord modules
 */

import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/logger";

import { _resolveReady, filters, find, findStore, type FilterFn, requireModuleByCode, waitFor } from "./webpack";

const logger = new Logger("Commons", "#f1fa8c");

const registry = new Map<string, () => unknown>();

function common<T = any>(name: string, resolve: () => T): T {
    registry.set(name, resolve);
    return proxyLazy(resolve);
}

const findSilently = (filter: FilterFn) => find(filter, { silent: true });

export function reportCommons() {
    const missing = [...registry].filter(([, resolve]) => {
        try {
            return resolve() == null;
        } catch {
            return true;
        }
    }).map(([name]) => name);

    const found = registry.size - missing.length;
    if (missing.length) logger.warn(`${found}/${registry.size} commons found, missing: ${missing.join(", ")}`);
    else logger.info(`${found}/${registry.size} commons found`);
}

export let FluxDispatcher: any;
waitFor(["dispatch", "subscribe"], dispatcher => {
    FluxDispatcher = dispatcher;

    const onConnectionOpen = () => {
        dispatcher.unsubscribe("CONNECTION_OPEN", onConnectionOpen);
        _resolveReady();
    };
    dispatcher.subscribe("CONNECTION_OPEN", onConnectionOpen);
});
registry.set("FluxDispatcher", () => FluxDispatcher);

export const React = common<typeof import("react")>("React", () => findSilently(filters.byProps("createElement", "useState", "useEffect")));
export const ReactDOM = common("ReactDOM", () => findSilently(filters.byProps("createPortal")));
export const createRoot = common<(container: Element) => { render(node: unknown): void; unmount(): void }>(
    "createRoot",
    () => findSilently(filters.byProps("createRoot", "hydrateRoot"))?.createRoot ?? findSilently(filters.byCode("(299)", ".onRecoverableError"))
);

type ReactModule = typeof import("react");
const hook = <K extends keyof ReactModule>(name: K) => ((...args: any[]) => (React[name] as any)(...args)) as ReactModule[K];

export const useState = hook("useState");
export const useEffect = hook("useEffect");
export const useMemo = hook("useMemo");
export const useRef = hook("useRef");
export const useCallback = hook("useCallback");
export const useReducer = hook("useReducer");

export const Flux: { Store: new (dispatcher: any, actionHandlers?: Record<string, (e: any) => void>) => any; [key: string]: any } =
    common("Flux", () => findSilently(filters.byProps("connectStores")));

export const useStateFromStores = common<(stores: any[], getState: () => any, deps?: unknown[]) => any>(
    "useStateFromStores",
    () => findSilently(filters.byCode("useStateFromStores"))
);

export const ComponentDispatch = common("ComponentDispatch", () => findSilently(filters.byProps("dispatchToLastSubscribed")));

export const RestAPI = common("RestAPI", () =>
    findSilently(m => typeof m === "object" && ["get", "post", "put", "patch", "del"].every(method => typeof m[method] === "function"))
);

export const Endpoints = common("Endpoints", () => findSilently(m => m.ME === "/users/@me" && typeof m.USERS === "string"));
export const Permissions = common("Permissions", () => findSilently(m => typeof m.ADMINISTRATOR === "bigint"));

export const Parser = common("Parser", () => findSilently(filters.byProps("parseTopic")));
export const Alerts = common("Alerts", () => findSilently(filters.byProps("show", "close")));
export const SnowflakeUtils = common("SnowflakeUtils", () => findSilently(filters.byProps("fromTimestamp", "extractTimestamp")));
export const MessageActions = common("MessageActions", () => findSilently(filters.byProps("editMessage", "sendMessage")));
export const ChannelActions = common("ChannelActions", () => findSilently(filters.byProps("openPrivateChannel")));
export const IconUtils = common("IconUtils", () => findSilently(filters.byProps("getUserAvatarURL")));

export interface ToastData {
    text: string;
    variant?: "info" | "success" | "critical" | (string & {});
    position?: "top" | "bottom";
    [key: string]: unknown;
}

export const showToast = common<(toast: ToastData) => void>("showToast", () => findSilently(filters.byCode("currentToastMap.get(")));

export const Tooltip = common("Tooltip", () =>
    findSilently(m => typeof m === "function" && m.prototype?.shouldShowTooltip && m.prototype.render)
);

const KNOWN_STORES = ["UserStore", "ChannelStore", "SelectedChannelStore", "GuildStore", "SelectedGuildStore", "GuildMemberStore", "MessageStore", "RelationshipStore"];
for (const name of KNOWN_STORES) registry.set(name, () => findStore(name));

export const Stores: Record<string, any> = new Proxy({}, {
    get: (_, name) => (typeof name === "string" ? findStore(name) : undefined)
});

const icons = new Map<string, unknown>();

function resolveIcon(name: string) {
    if (!icons.has(name)) {
        const icon = findSilently(filters.byProps(name))?.[name] ?? requireModuleByCode(`${name}:function`)?.[name];
        if (icon) icons.set(name, icon);
    }
    return icons.get(name);
}

export const DiscordIcon = ({ name, size = 20, color = "currentColor" }: { name: string; size?: number; color?: string }) => {
    const Icon = resolveIcon(name);
    return Icon ? React.createElement(Icon as any, { size: "custom", width: size, height: size, color }) : null;
};
