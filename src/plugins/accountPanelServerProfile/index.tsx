/*
 * Majic — AccountPanelServerProfile plugin
 */

import { Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { ErrorBoundary, withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { filters, findComponentByCodeLazy, mapMangledModuleLazy } from "@webpack";
import { ContextMenuApi, React, Stores } from "@webpack/common";

const s = createStrings({
    en: { viewAccount: "View Account Profile", viewServer: "View Server Profile", prioritize: "Prioritize Server Profile" },
    fr: { viewAccount: "Voir le profil du compte", viewServer: "Voir le profil de serveur", prioritize: "Privilégier le profil de serveur" }
});

const MenuRoot = findComponentByCodeLazy('path:["empty"]');
const UserProfile = findComponentByCodeLazy(".isNonUserBot()?", ",onClickContainer:");

let openAlternatePopout = false;
let accountPanelRef: { current: HTMLDivElement | null } = { current: null };

const getCurrentChannel = () => Stores.ChannelStore.getChannel(Stores.SelectedChannelStore.getChannelId());

const settings = definePluginSettings({
    prioritizeServerProfile: {
        type: OptionType.BOOLEAN,
        description: "Prioritize Server Profile when left clicking your account panel",
        default: false
    }
});

function AccountPanelContextMenu() {
    const { prioritizeServerProfile } = settings.use(["prioritizeServerProfile"]);

    return (
        <MenuRoot navId="majic-ap-server-profile" onClose={ContextMenuApi.closeContextMenu}>
            <Menu.MenuItem
                id="majic-ap-view-alternate-popout"
                label={prioritizeServerProfile ? s("viewAccount") : s("viewServer")}
                disabled={getCurrentChannel()?.getGuildId() == null}
                action={() => {
                    openAlternatePopout = true;
                    accountPanelRef.current?.click();
                }}
            />
            <Menu.MenuCheckboxItem
                id="majic-ap-prioritize-server-profile"
                label={s("prioritize")}
                checked={prioritizeServerProfile}
                action={() => settings.store.prioritizeServerProfile = !prioritizeServerProfile}
            />
        </MenuRoot>
    );
}

function ProfilePopout({ popoutProps, currentUser, originalRenderPopout }: { popoutProps: Record<string, any>; currentUser: any; originalRenderPopout(): React.ReactNode }) {
    if (
        (settings.store.prioritizeServerProfile && openAlternatePopout) ||
        (!settings.store.prioritizeServerProfile && !openAlternatePopout)
    ) {
        return originalRenderPopout();
    }

    const currentChannel = getCurrentChannel();
    if (currentChannel?.getGuildId() == null || !UserProfile.resolveComponent()) return originalRenderPopout();

    return (
        <UserProfile
            {...popoutProps}
            user={currentUser}
            currentUser={currentUser}
            guildId={currentChannel.getGuildId()}
            channelId={currentChannel.id}
        />
    );
}

export default definePlugin({
    name: "AccountPanelServerProfile",
    description: "Right click your account panel in the bottom left to view your profile in the current server",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Clic droit sur ton panneau de compte en bas à gauche pour voir ton profil dans le serveur actuel",
            options: {
                prioritizeServerProfile: "Privilégier le profil de serveur au clic gauche sur ton panneau de compte"
            }
        }
    },
    settings,

    patches: [
        {
            find: "handleOpenSettingsContextMenu=",
            group: true,
            replacement: [
                {
                    match: /(\.AVATAR,children:.+?renderPopout:\((\i),\i\)=>)\{(.+?)\}(?=,position)(?<=currentUser:(\i).+?)/,
                    replace: (_: string, rest: string, popoutProps: string, originalPopout: string, currentUser: string) =>
                        `${rest}$self.UserProfile({popoutProps:${popoutProps},currentUser:${currentUser},originalRenderPopout:()=>{${originalPopout}}})`
                },
                {
                    match: /\.AVATAR,children:.+?onRequestClose:\(\)=>\{/,
                    replace: "$&$self.onPopoutClose();"
                },
                {
                    match: /ref:(\i),style:\i(?=.{0,250}#{intl::USER_PROFILE_ACCOUNT_POPOUT_BUTTON_A11Y_LABEL})/,
                    replace: "$&,onContextMenu:($self.grabRef($1),$self.openAccountPanelContextMenu)"
                }
            ]
        }
    ],

    get accountPanelRef() {
        return accountPanelRef;
    },

    grabRef(ref: { current: HTMLDivElement | null }) {
        accountPanelRef = ref;
        return ref;
    },

    openAccountPanelContextMenu(event: React.UIEvent) {
        ContextMenuApi.openContextMenu(event, () => (
            <ErrorBoundary name="AccountPanelServerProfile">
                <AccountPanelContextMenu />
            </ErrorBoundary>
        ));
    },

    onPopoutClose() {
        openAlternatePopout = false;
    },

    UserProfile: withErrorBoundary("AccountPanelServerProfile", ProfilePopout)
});
