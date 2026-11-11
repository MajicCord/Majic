/*
 * Majic — ConsoleJanitor plugin
 */

import { definePluginSettings } from "@api/settings";
import { SubHeading, Text } from "@components/ui";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { React } from "@webpack/common";

const s = createStrings({
    en: {
        filterList: "Filter List",
        filterDescription: "Always allow loggers of these types",
        error: "Error",
        warn: "Warn",
        trace: "Trace",
        log: "Log",
        info: "Info",
        debug: "Debug"
    },
    fr: {
        filterList: "Liste de filtres",
        filterDescription: "Toujours autoriser les journaux de ces types",
        error: "Erreur",
        warn: "Avertissement",
        trace: "Trace",
        log: "Log",
        info: "Info",
        debug: "Débogage"
    }
});

const Noop = () => { };
const NoopLogger = {
    logDangerously: Noop,
    log: Noop,
    verboseDangerously: Noop,
    verbose: Noop,
    info: Noop,
    warn: Noop,
    error: Noop,
    trace: Noop,
    time: Noop,
    fileOnly: Noop
};

const logAllow = new Set<string>();

interface AllowLevels {
    error: boolean;
    warn: boolean;
    trace: boolean;
    log: boolean;
    info: boolean;
    debug: boolean;
}

function AllowLevelSetting({ settingKey }: { settingKey: keyof AllowLevels }) {
    const { allowLevel } = settings.use(["allowLevel"]);
    const value = (allowLevel as AllowLevels)[settingKey];

    return (
        <label className="majic-console-janitor-level">
            <input
                type="checkbox"
                checked={value}
                onChange={e => (settings.store.allowLevel as AllowLevels)[settingKey] = e.currentTarget.checked}
            />
            <Text>{s(settingKey)}</Text>
        </label>
    );
}

function AllowLevelSettings() {
    return (
        <div>
            <SubHeading>{s("filterList")}</SubHeading>
            <Text muted>{s("filterDescription")}</Text>
            <div style={{ display: "flex", flexDirection: "row", gap: 12, marginTop: 8 }}>
                {Object.keys(settings.store.allowLevel as AllowLevels).map(key => (
                    <AllowLevelSetting key={key} settingKey={key as keyof AllowLevels} />
                ))}
            </div>
        </div>
    );
}

function fillAllowList(value: string | undefined) {
    logAllow.clear();
    value?.split(";").map(x => x.trim()).forEach(x => logAllow.add(x));
}

const settings = definePluginSettings({
    disableLoggers: {
        type: OptionType.BOOLEAN,
        description: "Disables Discord's loggers",
        default: false,
        restartNeeded: true
    },
    disableSpotifyLogger: {
        type: OptionType.BOOLEAN,
        description: "Disable the Spotify logger, which leaks account information and access token",
        default: true,
        restartNeeded: true
    },
    whitelistedLoggers: {
        type: OptionType.STRING,
        description: "Semicolon (;) separated list of loggers to allow even if others are hidden",
        default: "GatewaySocket; Routing/Utils",
        multiline: true,
        onChange: fillAllowList
    },
    allowLevel: {
        type: OptionType.COMPONENT,
        description: "",
        component: AllowLevelSettings,
        default: {
            error: true,
            warn: false,
            trace: false,
            log: false,
            info: false,
            debug: false
        } as AllowLevels
    }
});

export default definePlugin({
    name: "ConsoleJanitor",
    description: "Disables annoying console messages and errors",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Désactive les messages et erreurs agaçants de la console",
            options: {
                disableLoggers: "Désactiver les journaux de Discord",
                disableSpotifyLogger: "Désactiver le journal Spotify, qui laisse fuiter des infos du compte et le jeton d'accès",
                whitelistedLoggers: "Liste de journaux à autoriser même si les autres sont masqués, séparés par des points-virgules (;)"
            }
        }
    },
    settings,
    startAt: "Init",

    css: ".majic-console-janitor-level { display: flex; align-items: center; gap: 6px; cursor: pointer; } .majic-console-janitor-level input { accent-color: var(--majic-accent); width: 16px; height: 16px; }",

    start() {
        fillAllowList(settings.store.whitelistedLoggers);
    },

    Noop,
    NoopLogger: () => NoopLogger,

    shouldLog(logger: string, level: keyof AllowLevels) {
        return logAllow.has(logger) || (settings.store.allowLevel as AllowLevels)[level] === true;
    },

    patches: [
        {
            find: 'The "interpolate" function is deprecated in v10 (use "to" instead)',
            replacement: {
                match: /,console.warn\('react-spring: The "interpolate" function is deprecated in v10 \(use "to" instead\)'\)/,
                replace: ""
            }
        },
        {
            find: 'console.warn("Window state not initialized"',
            replacement: {
                match: /console\.warn\("Window state not initialized",\i\),/,
                replace: ""
            }
        },
        {
            find: "is not a valid locale.",
            replacement: {
                match: /\i\.error(?=\(`\$\{\i\} is not a valid locale.`)/,
                replace: "$self.Noop"
            }
        },
        {
            find: '"AppCrashedFatalReport: getLastCrash not supported."',
            replacement: {
                match: /console\.log(?=\("AppCrashedFatalReport: getLastCrash not supported\."\))/,
                replace: "$self.Noop"
            }
        },
        {
            find: "RPCServer:WSS",
            replacement: {
                match: /\i\.error\(`Error: \$\{(\i)\.message\}/,
                replace: '!$1.message.includes("EADDRINUSE")&&$&'
            }
        },
        {
            find: "Tried getting Dispatch instance before instantiated",
            replacement: {
                match: /null==\i&&\i\.warn\("Tried getting Dispatch instance before instantiated"\),/,
                replace: ""
            }
        },
        {
            find: "Unable to determine render window for element",
            replacement: {
                match: /console\.warn\("Unable to determine render window for element",\i\),/,
                replace: ""
            }
        },
        {
            find: "failed to send analytics events",
            replacement: {
                match: /console\.error\(`\[analytics\] failed to send analytics events query: \$\{\i\}`\)/,
                replace: ""
            }
        },
        {
            find: "Slow dispatch on",
            replacement: {
                match: /\i\.totalTime>\d+?&&\i\.verbose\([`"]Slow dispatch on.{0,55}\);/,
                replace: ""
            }
        },
        {
            find: '"file-only"!==',
            predicate: () => settings.store.disableLoggers,
            replacement: {
                match: /(?<=&&)(?=console)/,
                replace: "$self.shouldLog(arguments[0],arguments[1])&&"
            }
        },
        {
            find: '("Spotify")',
            predicate: () => settings.store.disableSpotifyLogger,
            replacement: {
                match: /new \i\.\i\("Spotify"\)/,
                replace: "$self.NoopLogger()"
            }
        }
    ]
});
