/*
 * Majic — IgnoreActivities plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { getUserSettingLazy } from "@api/userSettings";
import { Button, SubHeading, Text, TextArea } from "@components/ui";
import { createStrings } from "@i18n";
import { plugins } from "@renderer/plugins";
import { ErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { DiscordIcon, FluxDispatcher, React, showToast, Stores, Tooltip, useEffect, useState } from "@webpack/common";

const s = createStrings({
    en: {
        disableActivity: "Disable Activity",
        enableActivity: "Enable Activity",
        importDescription: "Import the application ID of the CustomRPC plugin into the filter list",
        importButton: "Import CustomRPC ID",
        notSet: "CustomRPC application ID is not set.",
        alreadyAdded: "CustomRPC application ID is already added.",
        filterList: "Filter List",
        filterListDescription: "Comma separated list of activity IDs to filter (useful for filtering specific RPC activities and CustomRPC)",
        whitelist: "Whitelist",
        blacklist: "Blacklist"
    },
    fr: {
        disableActivity: "Désactiver l'activité",
        enableActivity: "Activer l'activité",
        importDescription: "Importer l'ID d'application du plugin CustomRPC dans la liste de filtres",
        importButton: "Importer l'ID CustomRPC",
        notSet: "L'ID d'application CustomRPC n'est pas défini.",
        alreadyAdded: "L'ID d'application CustomRPC est déjà ajouté.",
        filterList: "Liste de filtres",
        filterListDescription: "Liste d'ID d'activités à filtrer, séparés par des virgules (utile pour des activités RPC précises et CustomRPC)",
        whitelist: "Liste blanche",
        blacklist: "Liste noire"
    }
});

const ActivitiesTypes = {
    Game: 0,
    Embedded: 1
} as const;

interface IgnoredActivity {
    id: string;
    name: string;
    type: number;
}

const FilterMode = {
    Whitelist: 0,
    Blacklist: 1
} as const;

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

function recalculateActivities() {
    ShowCurrentGame.updateSetting(current => current);
}

function toggleIgnoredActivity(activity: IgnoredActivity) {
    const ignored = settings.store.ignoredActivities as IgnoredActivity[];
    const index = ignored.findIndex(act => act.id === activity.id);
    if (index === -1) ignored.push(activity);
    else ignored.splice(index, 1);
    recalculateActivities();
}

function ToggleIcon(activity: IgnoredActivity, tooltipText: string, iconName: string, fill: string) {
    return (
        <Tooltip text={tooltipText}>
            {(tooltipProps: Record<string, unknown>) => (
                <div
                    {...tooltipProps}
                    role="button"
                    onClick={e => {
                        e.stopPropagation();
                        toggleIgnoredActivity(activity);
                    }}
                    style={{ cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center" }}
                >
                    <DiscordIcon name={iconName} size={24} color={fill} />
                </div>
            )}
        </Tooltip>
    );
}

function ToggleActivityComponent({ activity }: { activity: IgnoredActivity }) {
    const { ignoredActivities } = settings.use(["ignoredActivities"]);

    if ((ignoredActivities as IgnoredActivity[]).some(act => act.id === activity.id)) {
        return ToggleIcon(activity, s("enableActivity"), "EyeSlashIcon", "var(--status-danger)");
    }
    return ToggleIcon(activity, s("disableActivity"), "EyeIcon", "var(--interactive-icon-default)");
}

let idsListPushID: ((id: string) => boolean) | null = null;

function ImportCustomRPCComponent() {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Text>{s("importDescription")}</Text>
            <div>
                <Button
                    onClick={() => {
                        const id = (plugins.CustomRPC?.settings?.store as Record<string, unknown> | undefined)?.appID as string | undefined;
                        if (!id) return showToast({ text: s("notSet"), variant: "critical" });

                        if (idsListPushID?.(id)) showToast({ text: s("alreadyAdded"), variant: "critical" });
                    }}
                >
                    {s("importButton")}
                </Button>
            </div>
        </div>
    );
}

function IdsListComponent({ setValue }: { setValue(value: string): void }) {
    const [idsList, setIdsList] = useState<string>(settings.store.idsList ?? "");

    idsListPushID = (id: string) => {
        const currentIds = new Set(idsList.split(",").map(item => item.trim()).filter(Boolean));
        const isAlreadyAdded = currentIds.has(id) || (currentIds.add(id), false);

        const ids = Array.from(currentIds).join(", ");
        setIdsList(ids);
        setValue(ids);

        return isAlreadyAdded;
    };

    useEffect(() => () => {
        idsListPushID = null;
    }, []);

    function handleChange(newValue: string) {
        setIdsList(newValue);
        setValue(newValue);
    }

    return (
        <section>
            <SubHeading>{s("filterList")}</SubHeading>
            <Text muted>{s("filterListDescription")}</Text>
            <div style={{ marginTop: 8 }}>
                <TextArea value={idsList} onChange={handleChange} placeholder="235834946571337729, 343383572805058560" />
            </div>
        </section>
    );
}

const settings = definePluginSettings({
    importCustomRPC: {
        type: OptionType.COMPONENT,
        description: "",
        component: ImportCustomRPCComponent
    },
    listMode: {
        type: OptionType.SELECT,
        description: "Mode of the filter list",
        options: [
            { get label() { return s("whitelist"); }, value: FilterMode.Whitelist, default: true },
            { get label() { return s("blacklist"); }, value: FilterMode.Blacklist }
        ],
        onChange: recalculateActivities
    },
    idsList: {
        type: OptionType.COMPONENT,
        description: "",
        default: "",
        onChange(newValue: string) {
            const normalized = Array.from(new Set(newValue.split(",").map(id => id.trim()).filter(Boolean))).join(", ");
            if (normalized !== newValue) settings.store.idsList = normalized;
            recalculateActivities();
        },
        component: (props: { setValue(value: string): void }) => <IdsListComponent setValue={props.setValue} />
    },
    ignorePlaying: {
        type: OptionType.BOOLEAN,
        description: "Ignore all playing activities (usually game and RPC activities)",
        default: false,
        onChange: recalculateActivities
    },
    ignoreStreaming: {
        type: OptionType.BOOLEAN,
        description: "Ignore all streaming activities",
        default: false,
        onChange: recalculateActivities
    },
    ignoreListening: {
        type: OptionType.BOOLEAN,
        description: "Ignore all listening activities (usually Spotify activities)",
        default: false,
        onChange: recalculateActivities
    },
    ignoreWatching: {
        type: OptionType.BOOLEAN,
        description: "Ignore all watching activities",
        default: false,
        onChange: recalculateActivities
    },
    ignoreCompeting: {
        type: OptionType.BOOLEAN,
        description: "Ignore all competing activities (usually special game activities)",
        default: false,
        onChange: recalculateActivities
    },
    ignoredActivities: {
        type: OptionType.CUSTOM,
        description: "Ignored activities",
        default: [] as IgnoredActivity[],
        onChange: recalculateActivities
    }
});

function isActivityTypeIgnored(type: number, id?: string) {
    if (id && (settings.store.idsList as string).includes(id)) {
        return settings.store.listMode === FilterMode.Blacklist;
    }

    switch (type) {
        case 0: return settings.store.ignorePlaying;
        case 1: return settings.store.ignoreStreaming;
        case 2: return settings.store.ignoreListening;
        case 3: return settings.store.ignoreWatching;
        case 5: return settings.store.ignoreCompeting;
    }

    return false;
}

function registeredGameOverflowMenu(children: any[], { rawGame }: { rawGame?: { id?: string; exePath: string; name: string } } = {}) {
    if (!rawGame) return;

    const ignoredActivities = settings.store.ignoredActivities as IgnoredActivity[];
    const id = rawGame.id ?? rawGame.exePath;
    const isCurrentlyIgnored = ignoredActivities.some(act => act.id === id);

    function handleToggleActivity() {
        const isGettingIgnored = !(settings.store.ignoredActivities as IgnoredActivity[]).some(act => act.id === id);
        toggleIgnoredActivity({ id, name: rawGame!.name, type: ActivitiesTypes.Game });

        const game = Stores.RunningGameStore.getRunningGames().find((g: any) => g.id === rawGame!.id || g.exePath === rawGame!.exePath);
        const isDetectionEnabled = Stores.RunningGameStore.isDetectionEnabled(game);

        if (!isGettingIgnored && !isDetectionEnabled) {
            FluxDispatcher.dispatch({ type: "RUNNING_GAME_TOGGLE_DETECTION", game });
        }
    }

    children.push(
        <Menu.MenuCheckboxItem
            id="ignore-activities-toggle-activity"
            key="ignore-activities-toggle-activity"
            label={s("enableActivity")}
            checked={!isCurrentlyIgnored}
            action={handleToggleActivity}
        />
    );
}

export default definePlugin({
    name: "IgnoreActivities",
    description: "Hides chosen activities from your status only. Pick them in the Registered Games and Activities tabs, or use the general settings below",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["UserSettingsAPI"],
    translations: {
        fr: {
            description: "Masque les activités choisies de ton statut uniquement. Choisis-les dans les onglets Jeux enregistrés et Activités, ou avec les réglages ci-dessous",
            options: {
                listMode: "Mode de la liste de filtres",
                ignorePlaying: "Ignorer toutes les activités « Joue à » (généralement jeux et RPC)",
                ignoreStreaming: "Ignorer toutes les activités de stream",
                ignoreListening: "Ignorer toutes les activités d'écoute (généralement Spotify)",
                ignoreWatching: "Ignorer toutes les activités « Regarde »",
                ignoreCompeting: "Ignorer toutes les activités de compétition (activités de jeu spéciales)"
            }
        }
    },
    settings,

    patches: [
        {
            find: '"LocalActivityStore"',
            replacement: {
                match: /\.LISTENING.+?([,:])(?=!?\i\(\)\(\i,\i\))(?<=(\i)\.push.+?)/,
                replace: (m: string, commaOrSemiColon: string, activities: string) => `${m}${activities}=${activities}.filter($self.isActivityNotIgnored)${commaOrSemiColon}`
            }
        },
        {
            find: '"ActivityTrackingStore"',
            replacement: {
                match: /getVisibleRunningGames\(\).+?;(?=for)(?<=(\i)=\i\.\i\.getVisibleRunningGames.+?)/,
                replace: (m: string, runningGames: string) => `${m}${runningGames}=${runningGames}.filter(({id,name})=>$self.isActivityNotIgnored({type:0,application_id:id,name}));`
            }
        },
        {
            find: "#{intl::EMBEDDED_ACTIVITIES_DEVELOPER_ACTIVITY}",
            replacement: {
                match: /lineClamp:1.{0,50}?(?=!\i&&\i\?.+?application:(\i))/,
                replace: "$&$self.ToggleActivityButton($1),"
            }
        }
    ],

    contextMenus: {
        "registered-game-overflow-menu": registeredGameOverflowMenu
    },

    start() {
        const ignored = settings.store.ignoredActivities as IgnoredActivity[];
        if (ignored.length === 0) return;

        const gamesSeen = Stores.RunningGameStore.getGamesSeen() as Array<{ id?: string; exePath: string }>;
        const before = ignored.length;
        for (let index = ignored.length - 1; index >= 0; index--) {
            const activity = ignored[index];
            if (activity.type !== ActivitiesTypes.Game) continue;
            if (!gamesSeen.some(game => game.id === activity.id || game.exePath === activity.id)) ignored.splice(index, 1);
        }
        if (ignored.length !== before) recalculateActivities();
    },

    isActivityNotIgnored(props: { type: number; application_id?: string; name?: string }) {
        if (isActivityTypeIgnored(props.type, props.application_id)) return false;

        const ignored = settings.store.ignoredActivities as IgnoredActivity[];
        if (props.application_id != null) {
            return !ignored.some(activity => activity.id === props.application_id)
                || (settings.store.listMode === FilterMode.Whitelist && (settings.store.idsList as string).includes(props.application_id));
        }

        const exePath = Stores.RunningGameStore.getRunningGames().find((game: any) => game.name === props.name)?.exePath;
        if (exePath) return !ignored.some(activity => activity.id === exePath);

        return true;
    },

    ToggleActivityButton(props: { id: string; name: string }) {
        return (
            <ErrorBoundary name="IgnoreActivities">
                <ToggleActivityComponent activity={{ id: props.id, name: props.name, type: ActivitiesTypes.Embedded }} />
            </ErrorBoundary>
        );
    }
});
