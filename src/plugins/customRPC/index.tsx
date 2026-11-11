/*
 * Majic — CustomRPC plugin
 */

import { getUserSettingLazy } from "@api/userSettings";
import { Button } from "@components/ui";
import { useAwaiter } from "@utils/misc";
import { definePlugin } from "@utils/types";
import { findByCodeLazy, findComponentByCodeLazy } from "@webpack";
import { React, Stores } from "@webpack/common";

import { RPCSettings } from "./RpcSettings";
import { createActivity, s, setRpc, setRPCSettingsComponent, settings, store } from "./shared";

setRPCSettingsComponent(RPCSettings);

const useProfileThemeStyle = findByCodeLazy("profileThemeStyle:", "--profile-gradient-primary-color");
const ActivityView = findComponentByCodeLazy(".party?(0", "USER_PROFILE_ACTIVITY");

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

function About() {
    const { enablePresence } = settings.use(["enablePresence"]);
    const [activity] = useAwaiter(createActivity, { fallbackValue: undefined, deps: Object.values(store()) });
    const gameActivityEnabled = ShowCurrentGame.useSetting();
    const { profileThemeStyle } = useProfileThemeStyle({});

    return (
        <div className="majic-custom-rpc-about">
            {!enablePresence && (
                <div className="majic-notice-card majic-custom-rpc-card">
                    <strong>{s("disabledTitle")}</strong>
                    <span>{s("disabledText")}</span>
                    <Button onClick={() => store().enablePresence = true}>{s("enablePresence")}</Button>
                </div>
            )}
            {!gameActivityEnabled && (
                <div className="majic-notice-card majic-custom-rpc-card majic-custom-rpc-danger">
                    <strong>{s("sharingTitle")}</strong>
                    <span>{s("sharingText")}</span>
                    <Button onClick={() => void ShowCurrentGame.updateSetting(true)}>{s("enableSharing")}</Button>
                </div>
            )}

            <div className="majic-custom-rpc-help">
                <p>{s("help1")} <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">{s("portal")}</a></p>
                <p>{s("help2")}</p>
                <p>{s("help3")} <a href="https://imgur.com" target="_blank" rel="noreferrer">Imgur</a></p>
                <p>{s("help4")}</p>
                <p>{s("help5")}</p>
            </div>

            <hr className="majic-custom-rpc-settings-divider" />

            <div style={{ width: "284px", ...profileThemeStyle, borderRadius: 8, background: "var(--background-mod-muted)" }}>
                {activity && (
                    <ActivityView
                        activity={activity}
                        user={Stores.UserStore.getCurrentUser()}
                        currentUser={Stores.UserStore.getCurrentUser()}
                    />
                )}
            </div>
        </div>
    );
}

export default definePlugin({
    name: "CustomRPC",
    description: "Adds a fully customisable Rich Presence (game status) to your Discord profile",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["UserSettingsAPI"],
    requiresRestart: false,
    translations: {
        fr: {
            description: "Ajoute un statut de jeu (Rich Presence) entièrement personnalisable à ton profil Discord",
            options: {
                enablePresence: "Afficher le statut"
            }
        }
    },
    settings,

    css: [
        ".majic-custom-rpc-settings-root { display: flex; flex-direction: column; gap: 0.5em; }",
        ".majic-custom-rpc-settings-pair { display: grid; grid-template-columns: repeat(2, 1fr); align-items: start; gap: 0.5em; width: 100%; }",
        ".majic-custom-rpc-settings-single { display: grid; gap: 0.5em; }",
        ".majic-custom-rpc-settings-disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }",
        ".majic-custom-rpc-settings-error { color: var(--text-feedback-critical); font-size: 13px; }",
        ".majic-custom-rpc-settings-divider { border: none; border-top: 1px solid var(--border-subtle); margin: 8px 0; width: 100%; }",
        ".majic-custom-rpc-about { display: flex; flex-direction: column; gap: .5em; color: var(--text-default); }",
        ".majic-custom-rpc-card { display: flex; flex-direction: column; gap: .5em; align-items: flex-start; }",
        ".majic-custom-rpc-danger { border-color: var(--status-danger, #da373c); background: rgba(218, 55, 60, .1); }",
        ".majic-custom-rpc-help p { margin: 0 0 6px; font-size: 14px; }",
        ".majic-custom-rpc-help a { color: var(--text-link, var(--majic-accent)); }"
    ].join(" "),

    start: () => void setRpc(),
    stop: () => void setRpc(true),

    patches: [
        {
            find: ".USER_PROFILE_ACTIVITY_BUTTONS),",
            replacement: {
                match: /.getId\(\)===\i.id/,
                replace: "$& && false"
            }
        }
    ],

    settingsAboutComponent: About
});
