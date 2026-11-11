/*
 * Majic — GameActivityToggle plugin
 */

import { Menu } from "@api/contextMenu";
import { getUserSettingLazy } from "@api/userSettings";
import { createStrings } from "@i18n";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin } from "@utils/types";
import { findByPropsLazy, findComponentByCodeLazy } from "@webpack";
import { DiscordIcon, Popout, React, Stores, useRef, useState, useStateFromStores } from "@webpack/common";

const s = createStrings({
    en: { disable: "Disable Game Activity", enable: "Enable Game Activity", spotify: "Share Spotify Activity" },
    fr: { disable: "Désactiver l'activité de jeu", enable: "Activer l'activité de jeu", spotify: "Partager l'activité Spotify" }
});

interface ConnectedAccount {
    id: string;
    type: string;
    revoked: boolean;
    showActivity: boolean;
}

const Button = findComponentByCodeLazy(".GREEN,positionKeyStemOverride:");
const MenuRoot = findComponentByCodeLazy('path:["empty"]');
const ConnectedAccountActions = findByPropsLazy("setShowActivity");

const ShowCurrentGame = getUserSettingLazy<boolean>("status", "showCurrentGame")!;

function Icon() {
    const showCurrentGame = ShowCurrentGame.useSetting();
    return <DiscordIcon name="GameControllerIcon" size={20} color={showCurrentGame ? "currentColor" : "var(--status-danger)"} />;
}

function GameActivityToggleButton(props: { nameplate?: unknown }) {
    const showCurrentGame = ShowCurrentGame.useSetting();

    const connectedAccounts: ConnectedAccount[] = useStateFromStores([Stores.ConnectedAccountsStore], () => Stores.ConnectedAccountsStore.getAccounts());
    const spotifyAccounts = connectedAccounts.filter(account => account.type === "spotify" && !account.revoked);
    const [shareSpotifyActivity, setShareSpotifyActivity] = useState(spotifyAccounts[0]?.showActivity ?? false);

    const buttonRef = useRef<HTMLButtonElement | null>(null);

    const buttonProps = {
        tooltipText: showCurrentGame ? s("disable") : s("enable"),
        icon: Icon,
        role: "switch",
        ariaChecked: !showCurrentGame,
        redGlow: !showCurrentGame,
        plated: props?.nameplate != null,
        onClick: () => ShowCurrentGame.updateSetting(old => !old)
    };

    if (spotifyAccounts.length !== 1) return <Button {...buttonProps} />;

    const spotifyAccount = spotifyAccounts[0];

    return (
        <Popout
            position="top"
            align="left"
            targetElementRef={buttonRef}
            renderPopout={({ closePopout }: { closePopout(): void }) => (
                <MenuRoot navId="majic-game-activity-toggle-menu" onClose={closePopout}>
                    <Menu.MenuCheckboxItem
                        id="majic-toggle-spotify"
                        label={s("spotify")}
                        checked={shareSpotifyActivity}
                        action={() => {
                            ConnectedAccountActions.setShowActivity(spotifyAccount.type, spotifyAccount.id, !shareSpotifyActivity);
                            setShareSpotifyActivity(!shareSpotifyActivity);
                        }}
                    />
                </MenuRoot>
            )}
        >
            {(popoutProps: { onClick(): void }) => (
                <Button ref={buttonRef} onContextMenu={popoutProps.onClick} {...buttonProps} />
            )}
        </Popout>
    );
}

export default definePlugin({
    name: "GameActivityToggle",
    description: "Adds a button next to the mute and deafen buttons to toggle your game activity. Right click it to toggle Spotify activity",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["UserSettingsAPI"],
    translations: {
        fr: {
            description: "Ajoute un bouton à côté des boutons micro et casque pour afficher ou masquer ton activité de jeu. Clic droit pour l'activité Spotify"
        }
    },

    css: "[class*=\"panels\"] [class*=\"accountPopoutButtonWrapper\"] { min-width: 0; }",

    patches: [
        {
            find: "#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL}",
            replacement: {
                match: /children:\[(?=.{0,25}?accountContainerRef)/,
                replace: "children:[$self.GameActivityToggleButton(arguments[0]),"
            }
        }
    ],

    GameActivityToggleButton: withErrorBoundary("GameActivityToggle", GameActivityToggleButton)
});
