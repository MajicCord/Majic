/*
 * Majic — BetterSessions plugin
 */

import { showNotification } from "@api/notifications";
import { definePluginSettings } from "@api/settings";
import { ensureUiStyles } from "@components/ui";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { filters, findComponentByCodeLazy, findCssClassesLazy, findStoreLazy, mapMangledModuleLazy } from "@webpack";
import { Endpoints, React, RestAPI, Tooltip, useState } from "@webpack/common";

import { NewButton, RenameButton } from "./components/RenameButton";
import { s } from "./strings";
import type { Session, SessionInfo } from "./types";
import { cl, fetchNamesFromDataStore, getDefaultName, getOsColor, getPlatformIcon, savedSessionsCache, saveSessionsToDataStore } from "./utils";

const AuthSessionsStore = findStoreLazy("AuthSessionsStore");
const TimestampClasses = findCssClassesLazy("timestamp", "blockquoteContainer");
const BlobMask = findComponentByCodeLazy("!1,lowerBadgeSize:");
const SettingsRouter = mapMangledModuleLazy('type:"USER_SETTINGS_MODAL_OPEN"', {
    openUserSettings: filters.byCode('type:"USER_SETTINGS_MODAL_OPEN"')
});

let checkInterval: ReturnType<typeof setInterval> | undefined;

const settings = definePluginSettings({
    backgroundCheck: {
        type: OptionType.BOOLEAN,
        description: "Check for new sessions in the background, and show notifications when they are detected",
        default: false,
        restartNeeded: true
    },
    checkInterval: {
        type: OptionType.NUMBER,
        description: "How often to check for new sessions in the background (if enabled), in minutes",
        default: 20,
        restartNeeded: true
    }
});

function SessionName({ session }: SessionInfo) {
    const savedSession = savedSessionsCache.get(session.id_hash);
    const state = useState(savedSession?.name ? `${savedSession.name}*` : getDefaultName(session.client_info));
    const [title] = state;

    return (
        <>
            <span className={cl("title")}>{title}</span>
            <div className={cl("footer-buttons")}>
                {(savedSession == null || savedSession.isNew) && <NewButton />}
                <RenameButton session={session} state={state} />
            </div>
        </>
    );
}

function SessionDescription({ session, description }: { session: Session; description: string }) {
    const [label, timeLabel] = description.split(" \xb7 ");

    return (
        <div className={cl("description")}>
            <span className={cl("label")}>{label}</span>
            {timeLabel && (
                <>
                    {" \xb7 "}
                    <Tooltip text={session.approx_last_used_time.toLocaleString()}>
                        {(props: Record<string, unknown>) => (
                            <span {...props} className={TimestampClasses.timestamp}>{timeLabel}</span>
                        )}
                    </Tooltip>
                </>
            )}
        </div>
    );
}

function SessionIcon({ session, icon: DeviceIcon }: { session: Session; icon: React.ComponentType<any> }) {
    const PlatformIcon = getPlatformIcon(session.client_info.platform);

    return (
        <BlobMask
            isFolder
            style={{ cursor: "unset" }}
            selected={false}
            lowerBadge={
                <div className={cl("lowerBadge")}>
                    <PlatformIcon width={14} height={14} className={cl("lowerBadge-icon")} />
                </div>
            }
            lowerBadgeSize={{ width: 20, height: 20 }}
        >
            <div className={cl("icon")} style={{ backgroundColor: getOsColor(session.client_info.os) }}>
                <DeviceIcon size="md" color="currentColor" />
            </div>
        </BlobMask>
    );
}

async function checkNewSessions() {
    const data = await RestAPI.get({ url: Endpoints.AUTH_SESSIONS });

    for (const session of data.body.user_sessions) {
        if (savedSessionsCache.has(session.id_hash)) continue;

        savedSessionsCache.set(session.id_hash, { name: "", isNew: true });
        void showNotification({
            title: "BetterSessions",
            body: s("newSession", { os: session.client_info.os, platform: session.client_info.platform, location: session.client_info.location }),
            permanent: true,
            onClick: () => SettingsRouter.openUserSettings("sessions_panel")
        });
    }

    void saveSessionsToDataStore();
}

export default definePlugin({
    name: "BetterSessions",
    description: "Enhances the devices menu: exact timestamps, custom names for each session, and notifications about new sessions",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Améliore le menu des appareils : horaires exacts, noms personnalisés pour chaque session et notifications des nouvelles sessions",
            options: {
                backgroundCheck: "Vérifier les nouvelles sessions en arrière-plan et afficher une notification quand il y en a",
                checkInterval: "Intervalle de vérification en arrière-plan (si activé), en minutes"
            }
        }
    },
    settings,

    css: [
        `.${cl("footer-buttons")} { display: flex; gap: 0.5em; align-items: center; justify-content: center; margin-top: 2px; }`,
        `.${cl("title")} { color: var(--text-strong, var(--text-default)); font-size: 16px; font-weight: 600; }`,
        `.${cl("label")} { color: var(--text-muted, var(--text-default)); font-size: 14px; }`,
        `.${cl("rename-btn")} { margin-left: 4px; translate: 0 -2px; padding: 2px 8px; font-size: 12px; }`,
        `.${cl("new-btn")} { margin-left: 4px; translate: 0 -2px; pointer-events: none; padding: 1px 4px; font-size: 11px; }`,
        `.${cl("lowerBadge")} { width: 20px; height: 20px; display: flex; justify-content: center; align-items: center; overflow: hidden; border-radius: 50%; background-color: var(--interactive-icon-default); color: var(--background-base-lower); }`,
        `.${cl("lowerBadge-icon")} { display: block; }`,
        `.${cl("icon")} { align-items: center; border-radius: var(--radius-sm); display: flex; height: 48px; justify-content: center; width: 48px; }`,
        `.${cl("description")} { display: flex; gap: 4px; }`,
        `.${cl("text-button")} { padding: 0 0 0 1px; border: none; background: none; color: var(--text-link, var(--majic-accent)); opacity: 0.6; cursor: pointer; font-size: 14px; }`
    ].join(" "),

    patches: [
        {
            find: "#{intl::AUTH_SESSIONS_OS_UNKNOWN}",
            replacement: [
                {
                    match: /(#{intl::AUTH_SESSIONS_ACTIVE_RECENTLY}.{0,230}role:"listitem",children:\[.{0,15},\{icon:)\i/,
                    replace: "$1()=>$self.renderIcon(arguments[0])"
                },
                {
                    match: /("horizontal",gap:"xs",children:)\[.{0,250}"text-subtle",children:\i\}\)\]\}\),/,
                    replace: "$1$self.renderName(arguments[0])}),"
                },
                {
                    match: /("text-muted",children:)\i(?=\}\)\]\}\),.{0,120}\.client_info\?\.location)/,
                    replace: "$1$self.renderDescription(arguments[0])"
                },
                {
                    match: /:\i\(\i\.approx_last_used_time\).{0,40}\(0,\i\.jsxs?\)\(\i,\{/,
                    replace: "$&session:arguments[0]?.session,"
                }
            ]
        }
    ],

    renderName: withErrorBoundary("BetterSessions", SessionName),
    renderDescription: withErrorBoundary("BetterSessions", SessionDescription),
    renderIcon: withErrorBoundary("BetterSessions", SessionIcon),

    flux: {
        USER_SETTINGS_ACCOUNT_RESET_AND_CLOSE_FORM() {
            const lastFetchedHashes: string[] = AuthSessionsStore.getSessions().map((session: Session) => session.id_hash);

            lastFetchedHashes.forEach(idHash => {
                if (!savedSessionsCache.has(idHash)) savedSessionsCache.set(idHash, { name: "", isNew: false });
            });

            if (lastFetchedHashes.length > 0) {
                savedSessionsCache.forEach((_, idHash) => {
                    if (!lastFetchedHashes.includes(idHash)) savedSessionsCache.delete(idHash);
                });
            }

            savedSessionsCache.forEach(data => {
                data.isNew = false;
            });
            void saveSessionsToDataStore();
        }
    },

    async start() {
        ensureUiStyles();
        await fetchNamesFromDataStore();

        void checkNewSessions();
        if (settings.store.backgroundCheck) {
            checkInterval = setInterval(checkNewSessions, Math.max(1, settings.store.checkInterval) * 60 * 1000);
        }
    },

    stop() {
        clearInterval(checkInterval);
    }
});
