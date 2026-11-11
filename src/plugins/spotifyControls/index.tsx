/*
 * Majic — SpotifyControls plugin
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { React } from "@webpack/common";

import { Player } from "./PlayerComponent";
import { s, settings, toggleHoverControls } from "./settings";

const CSS = [
    "#majic-spotify-player { padding: 12px; margin: 0; border-bottom: 1px solid var(--border-subtle); --majic-spotify-green: var(--spotify, #1db954); --majic-spotify-green-90: color-mix(in hsl, var(--majic-spotify-green), transparent 90%); --majic-spotify-green-80: color-mix(in hsl, var(--majic-spotify-green), transparent 80%); }",
    ".majic-spotify-button { margin: 0 2px; border: none; border-radius: var(--radius-sm); background: none; color: var(--interactive-icon-default); padding: 0; width: 32px; height: 32px; display: flex; justify-content: center; align-items: center; cursor: pointer; }",
    ".majic-spotify-button:hover { color: var(--interactive-icon-hover); background-color: var(--background-mod-strong); }",
    ".majic-spotify-button-icon { display: flex; align-items: center; justify-content: center; height: 24px; width: 24px; }",
    ".majic-spotify-shuffle .majic-spotify-button-icon, .majic-spotify-repeat .majic-spotify-button-icon { width: 22px; height: 22px; }",
    ".majic-spotify-repeat-context, .majic-spotify-repeat-track, .majic-spotify-shuffle-on { background-color: var(--majic-spotify-green-90); }",
    ".majic-spotify-repeat-context:hover, .majic-spotify-repeat-track:hover, .majic-spotify-shuffle-on:hover { background-color: var(--majic-spotify-green-80); }",
    ".majic-spotify-repeat-1 { font-size: 70%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }",
    ".majic-spotify-button-row { justify-content: center; margin-top: 14px; }",
    ".majic-spotify-secondary-song-info { font-size: 12px; margin: 0; color: var(--text-default); }",
    ".majic-spotify-song-info-prefix { display: none; }",
    "#majic-spotify-info-wrapper { display: flex; flex-direction: row; align-items: center; height: 3em; gap: 0.5em; }",
    "#majic-spotify-album-image { height: 90%; object-fit: contain; border-radius: 3px; transition: filter 0.2s; }",
    "#majic-spotify-album-image:hover { filter: brightness(1.2); cursor: pointer; }",
    "#majic-spotify-album-expanded-wrapper #majic-spotify-album-image { width: 100%; object-fit: contain; }",
    "#majic-spotify-titles { display: flex; flex-direction: column; padding: 0.2rem; align-items: flex-start; place-content: flex-start center; overflow: hidden; }",
    "#majic-spotify-song-title { margin: 0; color: var(--text-strong); font-size: 14px; font-weight: 600; }",
    ".majic-spotify-ellipoverflow { white-space: nowrap; overflow: hidden; width: 100%; text-overflow: ellipsis; }",
    ".majic-spotify-artist, .majic-spotify-album { font-size: 12px; text-decoration: none; color: var(--text-strong); }",
    ".majic-spotify-comma { color: var(--text-default); }",
    ".majic-spotify-artist[role=\"link\"]:hover, #majic-spotify-album-title[role=\"link\"]:hover, #majic-spotify-song-title[role=\"link\"]:hover { text-decoration: underline; cursor: pointer; }",
    "#majic-spotify-progress-bar { position: relative; color: var(--text-default); width: 100%; margin: 0.5em 0; margin-bottom: 5px; }",
    "#majic-spotify-progress-bar > [class*=\"slider\"] { flex-grow: 1; width: 100%; padding: 0 !important; }",
    "#majic-spotify-progress-bar > [class*=\"slider\"] [class*=\"bar\"] { height: 3px !important; top: calc(12px - 4px / 2 + var(--bar-offset)); }",
    "#majic-spotify-progress-bar > [class*=\"slider\"] [class*=\"barFill\"] { background-color: var(--interactive-icon-active); }",
    "#majic-spotify-progress-bar > [class*=\"slider\"]:hover [class*=\"barFill\"] { background-color: var(--majic-spotify-green); }",
    "#majic-spotify-progress-bar > [class*=\"slider\"] [class*=\"grabber\"] { height: 16px !important; width: 16px !important; margin-top: calc(17px/-2 + var(--bar-offset)/2); margin-left: -0.5px; background-color: var(--interactive-icon-active); border-color: var(--interactive-icon-default); color: var(--interactive-icon-default); opacity: 0; transition: opacity 0.1s; }",
    "#majic-spotify-progress-bar:hover > [class*=\"slider\"] [class*=\"grabber\"] { opacity: 1; }",
    ".majic-spotify-progress-time { font-size: 12px; font-weight: 500; top: 10px; position: absolute; margin-top: 8px; font-family: var(--font-code); }",
    ".majic-spotify-time-left { left: 0; }",
    ".majic-spotify-time-right { right: 0; }",
    ".majic-spotify-fallback { padding: 0.5em; color: var(--text-default); }"
].join(" ");

export default definePlugin({
    name: "SpotifyControls",
    description: "Adds a Spotify player above the account panel",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Ajoute un lecteur Spotify au-dessus du panneau de compte",
            options: {
                hoverControls: "Afficher les contrôles au survol",
                useSpotifyUris: "Ouvrir les liens spotify: au lieu des liens web. Ne marche que si Spotify est installé, et pas forcément sur toutes les plateformes",
                previousButtonRestartsTrack: "Recommencer le titre en cours avec « précédent » s'il joue depuis plus de 3 s"
            }
        }
    },
    settings,

    css: CSS,

    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /(?<=\i\.jsxs?\)\()(\i),{(?=[^}]*?userTag:\i,occluded:)/,
                replace: "$self.PanelWrapper,{MajicOriginal:$1,"
            }
        },
        {
            find: ".PLAYER_DEVICES",
            replacement: [
                {
                    match: /get:(\i)\.bind\(null,(\i\.\i)\.get\)/,
                    replace: "post:$1.bind(null,$2.post),majicSpotifyMarker:1,$&"
                },
                {
                    match: /202===\i\.status/,
                    replace: "false"
                }
            ]
        },
        {
            find: 'repeat:"off"!==',
            replacement: [
                {
                    match: /repeat:"off"!==(\i),/,
                    replace: "shuffle:arguments[2]?.shuffle_state??false,actual_repeat:$1,$&"
                },
                {
                    match: /(?<=artists.filter\(\i=>).{0,10}\i\.id\)&&/,
                    replace: ""
                }
            ]
        }
    ],

    start: () => toggleHoverControls(settings.store.hoverControls),

    stop: () => toggleHoverControls(false),

    PanelWrapper({ MajicOriginal, ...props }: { MajicOriginal: React.ComponentType<any>; [key: string]: unknown }) {
        return (
            <>
                <ErrorBoundary
                    name="SpotifyControls"
                    fallback={
                        <div className="majic-spotify-fallback">
                            <p>{s("failed")}</p>
                            <p>{s("checkConsole")}</p>
                        </div>
                    }
                >
                    <Player />
                </ErrorBoundary>

                <MajicOriginal {...props} />
            </>
        );
    }
});
