/*
 * Majic — NewGuildSettings plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, mapMangledModuleLazy } from "@webpack";
import { DiscordIcon, React, Stores } from "@webpack/common";

const s = createStrings({
    en: {
        apply: "Apply NewGuildSettings",
        all: "All messages",
        mentions: "Only @mentions",
        nothing: "Nothing",
        serverDefault: "Server default"
    },
    fr: {
        apply: "Appliquer NewGuildSettings",
        all: "Tous les messages",
        mentions: "Seulement les @mentions",
        nothing: "Rien",
        serverDefault: "Par défaut du serveur"
    }
});

const { updateGuildNotificationSettings } = findByPropsLazy("updateGuildNotificationSettings");
const { toggleShowAllChannels } = mapMangledModuleLazy(".onboardExistingMember(", {
    toggleShowAllChannels: (m: unknown) => {
        const code = String(m);
        return code.length < 100 && !code.includes("onboardExistingMember") && !code.includes("getOptedInChannels");
    }
});
const isOptInEnabledForGuild = findByCodeLazy(".COMMUNITY)||", ".isOptInEnabled(");

const CogWheel = (props: { width?: number }) => <DiscordIcon name="SettingsIcon" size={props.width ?? 18} />;

const settings = definePluginSettings({
    guild: {
        type: OptionType.BOOLEAN,
        description: "Mute the server automatically",
        default: true
    },
    messages: {
        type: OptionType.SELECT,
        description: "Server notification settings",
        options: [
            { get label() { return s("all"); }, value: 0 },
            { get label() { return s("mentions"); }, value: 1 },
            { get label() { return s("nothing"); }, value: 2 },
            { get label() { return s("serverDefault"); }, value: 3, default: true }
        ]
    },
    everyone: {
        type: OptionType.BOOLEAN,
        description: "Suppress @everyone and @here",
        default: true
    },
    role: {
        type: OptionType.BOOLEAN,
        description: "Suppress all role @mentions",
        default: true
    },
    highlights: {
        type: OptionType.BOOLEAN,
        description: "Suppress highlights automatically",
        default: true
    },
    events: {
        type: OptionType.BOOLEAN,
        description: "Mute new events automatically",
        default: true
    },
    showAllChannels: {
        type: OptionType.BOOLEAN,
        description: "Show all channels automatically",
        default: true
    }
});

function applyDefaultSettings(guildId: string | null) {
    if (guildId === "@me" || guildId === "null" || guildId == null) return;

    updateGuildNotificationSettings(guildId, {
        muted: settings.store.guild,
        suppress_everyone: settings.store.everyone,
        suppress_roles: settings.store.role,
        mute_scheduled_events: settings.store.events,
        notify_highlights: settings.store.highlights ? 1 : 0
    });

    if (settings.store.messages !== 3) {
        updateGuildNotificationSettings(guildId, { message_notifications: settings.store.messages });
    }

    if (settings.store.showAllChannels && isOptInEnabledForGuild(guildId)) {
        toggleShowAllChannels(guildId);
    }
}

const makeContextMenuPatch = (shouldAddIcon: boolean) => (children: any[], { guild }: { guild?: { id: string } } = {}) => {
    if (!guild) return;

    findGroupChildrenByChildId("privacy", children)?.push(
        <Menu.MenuItem
            key="majic-newguildsettings-apply"
            id="majic-newguildsettings-apply"
            label={s("apply")}
            icon={shouldAddIcon ? CogWheel : void 0}
            leadingAccessory={shouldAddIcon ? { type: "icon", icon: CogWheel } : void 0}
            action={() => applyDefaultSettings(guild.id)}
        />
    );
};

export default definePlugin({
    name: "NewGuildSettings",
    description: "Automatically mutes new servers and changes other settings when you join them",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Met automatiquement en sourdine les nouveaux serveurs et change d'autres réglages quand tu les rejoins",
            options: {
                guild: "Mettre le serveur en sourdine automatiquement",
                messages: "Paramètres de notification du serveur",
                everyone: "Ignorer @everyone et @here",
                role: "Ignorer toutes les @mentions de rôles",
                highlights: "Désactiver les messages mis en avant automatiquement",
                events: "Mettre les nouveaux événements en sourdine automatiquement",
                showAllChannels: "Afficher tous les salons automatiquement"
            }
        }
    },
    settings,

    contextMenus: {
        "guild-context": makeContextMenuPatch(false),
        "guild-header-popout": makeContextMenuPatch(true)
    },

    patches: [
        {
            find: ",acceptInvite(",
            replacement: {
                match: /INVITE_ACCEPT_SUCCESS.+?,(\i)=null!=.+?;/,
                replace: (m: string, guildId: string) => `${m}$self.applyDefaultSettings(${guildId});`
            }
        },
        {
            find: "{joinGuild:",
            replacement: {
                match: /guildId:(\i),lurker:(\i).{0,20}}\);/,
                replace: (m: string, guildId: string, lurker: string) => `${m}if(!${lurker})$self.applyDefaultSettings(${guildId});`
            }
        }
    ],

    applyDefaultSettings,

    flux: {
        GUILD_JOIN_REQUEST_UPDATE({ guildId, request, status }: { guildId: string; request: { user_id: string }; status: string }) {
            if (status === "APPROVED" && request.user_id === Stores.UserStore.getCurrentUser().id) applyDefaultSettings(guildId);
        }
    }
});
