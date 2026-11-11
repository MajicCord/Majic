/*
 * Majic — common Discord modules
 */

import { proxyLazy } from "@utils/lazy";
import { LazyComponent } from "@utils/lazyReact";
import { Logger } from "@utils/logger";

import { _resolveReady, filters, find, findByCodeLazy, findCssClassesLazy, findComponentByCodeLazy, findStore, type FilterFn, mapMangledModule, mapMangledModuleLazy, requireModuleByCode, search, waitFor, wreq } from "./webpack";

const logger = new Logger("Commons", "#f1fa8c");

const registry = new Map<string, () => unknown>();

function common<T = any>(name: string, resolve: () => T): T {
    registry.set(name, resolve);
    return proxyLazy(resolve);
}

const findSilently = (filter: FilterFn) => find(filter, { isIndirect: true });

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
export const useLayoutEffect = hook("useLayoutEffect");

export const Flux: { Store: new (dispatcher: any, actionHandlers?: Record<string, (e: any) => void>) => any; [key: string]: any } =
    common("Flux", () => findSilently(filters.byProps("connectStores")));

export const useStateFromStores = common<(stores: any[], getState: () => any, deps?: unknown[], areEqual?: (a: any, b: any) => boolean) => any>(
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

export const moment = common<any>("moment", () => findSilently(filters.byProps("parseTwoDigitYear")));

export const DateUtils = proxyLazy(() => mapMangledModule("millisecondsInUnit:", {
    calendarFormat: filters.byCode('<-1?"sameElse":'),
    dateFormat: filters.byCode('<2?"nextDay":"sameElse";'),
    isSameDay: filters.byCode(/Math\.abs\(\i-\i\)/),
    diffAsUnits: filters.byCode("days:0", "millisecondsInUnit")
}));

export const Timestamp = findComponentByCodeLazy("#{intl::MESSAGE_EDITED_TIMESTAMP_A11Y_LABEL}");

export const Modal = findByCodeLazy("leadingLayout:", "actions:", ".message");

export const UserSettingsActionCreators = {
    FrecencyUserSettingsActionCreators: proxyLazy(() => findSilently(m => m.ProtoClass?.typeName?.endsWith(".FrecencyUserSettings"))),
    PreloadedUserSettingsActionCreators: proxyLazy(() => findSilently(m => m.ProtoClass?.typeName?.endsWith(".PreloadedUserSettings")))
};

export const MessageTypeSets = common("MessageTypeSets", () => findSilently(filters.byProps("REPLYABLE", "FORWARDABLE")));

export const ContextMenuApi = mapMangledModuleLazy('type:"CONTEXT_MENU_OPEN', {
    closeContextMenu: filters.byCode("CONTEXT_MENU_CLOSE"),
    openContextMenu: filters.byCode("renderLazy:"),
    openContextMenuLazy: (e: any) => typeof e === "function" && e.toString().length < 100
});

export const Popout = common("Popout", () => findSilently(filters.componentByCode("ref:this.ref,", "renderPopout:this.renderPopout,")));
export const Avatar = common("Avatar", () => findSilently(filters.componentByCode(".size-1.375*")));

export const ApplicationAssetUtils = mapMangledModuleLazy("getAssetImage: size must === [", {
    fetchAssetIds: filters.byCode('.startsWith("http:")', ".dispatch({"),
    getAssetFromImageURL: filters.byCode("].serialize(", ":null"),
    getAssetImage: filters.byCode("getAssetImage: size must === ["),
    getAssets: filters.byCode(".assets")
});

export const NavigationRouter = mapMangledModuleLazy("transitionTo - Transitioning to", {
    transitionTo: filters.byCode("transitionTo -"),
    transitionToGuild: filters.byCode("transitionToGuild -"),
    back: filters.byCode("goBack()"),
    forward: filters.byCode("goForward()")
});

export const ChannelRouter = mapMangledModuleLazy('"Thread must have a parent ID."', {
    transitionToChannel: filters.byCode(".openTextInVoiceIfVoiceChannel"),
    transitionToThread: filters.byCode('"Thread must have a parent ID."')
});

export const SettingsRouter = mapMangledModuleLazy('type:"USER_SETTINGS_MODAL_OPEN"', {
    openUserSettings: filters.byCode('type:"USER_SETTINGS_MODAL_OPEN"')
});

export const UsernameUtils = common("UsernameUtils", () => findSilently(filters.byProps("useName", "getGlobalName")));

export const ConfirmModal = findByCodeLazy("actionBarInput:", '"critical"', '"secondary');

export const DraftType = common<Record<string, number>>("DraftType", () => findSilently(filters.byProps("ChannelMessage", "SlashCommand")));
export const UploadManager = common("UploadManager", () => findSilently(filters.byProps("clearAll", "addFile")));
export const UploadHandler = {
    promptToUpload: findByCodeLazy("Unexpected mismatch between files and file metadata") as (files: File[], channel: any, draftType: number) => void
};

export const openMediaModal: (props: { items: Array<Record<string, unknown>>; [key: string]: unknown }) => void = findByCodeLazy("hasMediaOptions", "shouldHideMediaOptions");

export const { openModalLazy, openModal, closeModal, closeAllModals } = mapMangledModuleLazy(".modalKey?", {
    openModalLazy: filters.byCode(".modalKey?"),
    openModal: filters.byCode(",instant:"),
    closeModal: filters.byCode(".onCloseCallback()"),
    closeAllModals: filters.byCode(".getState();for", " in ")
});

export const Clickable = common("Clickable", () => findSilently(filters.componentByCode("this.context?this.renderNonInteractive():")));

export const TabBar = common("TabBar", () => findSilently(filters.componentByCode("ref:this.tabBarRef,className:")));

export let ColorPicker: (props: any) => any = () => null;
export const setColorPicker = (component: typeof ColorPicker) => void (ColorPicker = component);

export let RoleMemberPopout: (props: any) => any = () => null;
export const setRoleMemberPopout = (component: typeof RoleMemberPopout) => void (RoleMemberPopout = component);

type CreateScroller = (scrollbarClassName: string, fadeClassName: string, customThemeClassName: string) => any;
export let createScroller: CreateScroller | undefined;
export const setCreateScroller = (scroller: CreateScroller) => void (createScroller = scroller);

export const scrollerClasses = findCssClassesLazy("thin", "auto", "fade", "customTheme", "none");
export const ScrollerNone = LazyComponent(() => createScroller?.(scrollerClasses.none, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerThin = LazyComponent(() => createScroller?.(scrollerClasses.thin, scrollerClasses.fade, scrollerClasses.customTheme));
export const ScrollerAuto = LazyComponent(() => createScroller?.(scrollerClasses.auto, scrollerClasses.fade, scrollerClasses.customTheme));

export const UserUtils = {
    getUser: findByCodeLazy(".USER(")
};

export const openUserProfileModal = findByCodeLazy('type:"USER_PROFILE_MODAL_OPEN"');

export const ExpressionPickerStore = mapMangledModuleLazy("expression-picker-last-active-view", {
    openExpressionPicker: filters.byCode(/setState\({activeView:(?:(?!null)\i),activeViewType:/),
    closeExpressionPicker: filters.byCode("setState({activeView:null"),
    toggleMultiExpressionPicker: filters.byCode(".EMOJI,"),
    toggleExpressionPicker: filters.byCode(/\i\.activeView===\i&&\i\.activeViewType===\i&&/),
    setExpressionPickerView: filters.byCode(/setState\({activeView:\i,lastActiveView:/),
    setSearchQuery: filters.byCode("searchQuery:"),
    useExpressionPickerStore: filters.byCode(/\(\i,\i=\i\)=>/)
});

export const UserSummaryItem = common("UserSummaryItem", () => findSilently(filters.componentByCode("defaultRenderUser", "showDefaultAvatarsForNullUsers")));

export const i18n = common<{ t: Record<string, any>; intl: { currentLocale: string; string(message: any): string; format(message: any, values: Record<PropertyKey, any>): any } }>("i18n", () =>
    mapMangledModule(['defaultLocale:"en-US"', /initialLocale:\i/], {
        t: m => m?.[Symbol.toStringTag] === "IntlMessagesProxy",
        intl: m => m != null && Object.getPrototypeOf(m)?.withFormatters != null
    }, true)
);

const KNOWN_STORES = ["UserStore", "ChannelStore", "SelectedChannelStore", "GuildStore", "SelectedGuildStore", "GuildMemberStore", "MessageStore", "RelationshipStore"];
for (const name of KNOWN_STORES) registry.set(name, () => findStore(name));

export const Stores: Record<string, any> = new Proxy({}, {
    get: (_, name) => (typeof name === "string" ? findStore(name) : undefined)
});

const icons = new Map<string, unknown>();
const iconLoads = new Map<string, Promise<unknown>>();

function resolveIcon(name: string) {
    if (!icons.has(name)) {
        const icon = findSilently(filters.byProps(name))?.[name] ?? requireModuleByCode(`${name}:function`)?.[name];
        if (icon) icons.set(name, icon);
    }
    return icons.get(name);
}

function loadIcon(name: string) {
    if (!iconLoads.has(name)) {
        iconLoads.set(name, (async () => {
            const entry = new RegExp(`"\\./${name}\\.web\\.tsx":\\["(\\d+)",\\[([\\d,]*)\\]\\]`);
            const source = Object.values(search(`"./${name}.web.tsx"`)).map(String)[0];
            const match = source && entry.exec(source);
            if (!match) return null;

            const chunks = match[2] ? match[2].split(",").map(Number) : [];
            await Promise.all(chunks.map(chunk => wreq.e(chunk)));
            const icon = wreq(match[1])?.[name];
            if (icon) icons.set(name, icon);
            return icon;
        })().catch(() => null));
    }
    return iconLoads.get(name)!;
}

export const DiscordIcon = ({ name, size = 20, color = "currentColor" }: { name: string; size?: number; color?: string }) => {
    const [Icon, setIcon] = useState(() => resolveIcon(name));

    useEffect(() => {
        if (!Icon) void loadIcon(name).then(loaded => loaded && setIcon(() => loaded));
    }, [name]);

    return Icon ? React.createElement(Icon as any, { size: "custom", width: size, height: size, color }) : null;
};
