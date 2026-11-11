/*
 * Majic — PlatformIndicators plugin
 */

import { addProfileBadge, BadgePosition, type BadgeUserArgs, type ProfileBadge, removeProfileBadge } from "@api/badges";
import { addMemberListDecorator, removeMemberListDecorator } from "@api/memberListDecorators";
import { addMessageDecoration, removeMessageDecoration } from "@api/messageDecorations";
import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { definePlugin, OptionType } from "@utils/types";
import { filters, mapMangledModuleLazy } from "@webpack";
import { DiscordIcon, React, Stores, Tooltip, useStateFromStores } from "@webpack/common";

type Platform = "desktop" | "web" | "mobile" | "embedded" | "vr";
type StatusMap = Partial<Record<Platform, string>>;

const s = createStrings({
    en: { desktop: "Desktop", web: "Web", mobile: "Mobile", embedded: "Console or game", vr: "VR" },
    fr: { desktop: "Ordinateur", web: "Navigateur", mobile: "Mobile", embedded: "Console ou jeu", vr: "Réalité virtuelle" }
});

const ICONS: Record<Platform, string> = {
    desktop: "ScreenIcon",
    web: "GlobeEarthIcon",
    mobile: "MobilePhoneIcon",
    embedded: "GameControllerIcon",
    vr: "VrHeadsetIcon"
};

const { useStatusFillColor } = mapMangledModuleLazy([".5625*", "translate"], {
    useStatusFillColor: filters.byCode(".hex")
});

const settings = definePluginSettings({
    list: {
        type: OptionType.BOOLEAN,
        description: "Show indicators in the member list",
        default: true,
        restartNeeded: true
    },
    badges: {
        type: OptionType.BOOLEAN,
        description: "Show indicators in user profiles, as badges",
        default: true,
        restartNeeded: true
    },
    messages: {
        type: OptionType.BOOLEAN,
        description: "Show indicators next to names in messages",
        default: true,
        restartNeeded: true
    },
    colorMobileIndicator: {
        type: OptionType.BOOLEAN,
        description: "Make the mobile status icon use the user's status color",
        default: true,
        restartNeeded: true
    }
});

function PlatformIcon({ platform, status, small }: { platform: Platform; status: string; small: boolean }) {
    const color = useStatusFillColor(status);
    const size = small ? 14 : 17;
    return (
        <Tooltip text={s(ICONS[platform] ? platform : "desktop")}>
            {(props: Record<string, unknown>) => (
                <span {...props} className="majic-platform-icon">
                    <DiscordIcon name={ICONS[platform] ?? ICONS.desktop} size={size} color={color} />
                </span>
            )}
        </Tooltip>
    );
}

function Indicators({ statusMap, small }: { statusMap: StatusMap; small: boolean }) {
    const entries = Object.entries(statusMap) as Array<[Platform, string]>;
    if (!entries.length) return null;
    return (
        <span className="majic-platform-indicator" style={{ gap: 2 }}>
            {entries.map(([platform, status]) => <PlatformIcon key={platform} platform={platform} status={status} small={small} />)}
        </span>
    );
}

function ownStatus(): StatusMap | null {
    const sessions = Stores.SessionsStore?.getSessions();
    if (typeof sessions !== "object" || !sessions) return null;

    const rank = (status: string) => (status === "online" ? 2 : status === "idle" ? 1 : 0);
    return (Object.values(sessions) as Array<{ status: string; clientInfo: { client: string } }>)
        .sort((a, b) => rank(a.status) - rank(b.status))
        .reduce<StatusMap>((map, session) => {
            if (session.clientInfo.client !== "unknown") map[session.clientInfo.client as Platform] = session.status;
            return map;
        }, {});
}

function OwnIndicators({ small }: { small: boolean }) {
    const statusMap = useStateFromStores([Stores.SessionsStore], ownStatus);
    return statusMap ? <Indicators statusMap={statusMap} small={small} /> : null;
}

function OtherIndicators({ userId, small }: { userId: string; small: boolean }) {
    const statusMap = useStateFromStores([Stores.PresenceStore], () => Stores.PresenceStore.getClientStatus(userId));
    return statusMap ? <Indicators statusMap={statusMap} small={small} /> : null;
}

function renderIndicators(user: { id: string; bot?: boolean } | undefined, small: boolean) {
    if (!user || user.bot) return null;
    if (user.id === Stores.AuthenticationStore.getId()) return <OwnIndicators small={small} />;
    return <OtherIndicators userId={user.id} small={small} />;
}

const badge: ProfileBadge = {
    id: "majic-platform-indicators",
    position: BadgePosition.START,
    getBadges({ userId }: BadgeUserArgs) {
        const user = Stores.UserStore.getUser(userId);
        if (!user || user.bot) return [];

        const statusMap: StatusMap | null = user.id === Stores.AuthenticationStore.getId() ? ownStatus() : Stores.PresenceStore.getClientStatus(user.id);
        if (!statusMap) return [];

        return (Object.entries(statusMap) as Array<[Platform, string]>).map(([platform, status]) => ({
            id: `majic-platform-${platform}`,
            key: `majic-platform-${platform}`,
            component: () => (
                <span className="majic-platform-indicator">
                    <PlatformIcon platform={platform} status={status} small={false} />
                </span>
            )
        }));
    }
};

export default definePlugin({
    name: "PlatformIndicators",
    description: "Shows which devices users are online on (desktop, mobile, web...)",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche sur quels appareils les utilisateurs sont en ligne (ordinateur, mobile, navigateur…)",
            options: {
                list: "Afficher les indicateurs dans la liste des membres",
                badges: "Afficher les indicateurs dans les profils, sous forme de badges",
                messages: "Afficher les indicateurs à côté des noms dans les messages",
                colorMobileIndicator: "Donner à l'icône de statut mobile la couleur du statut de l'utilisateur"
            }
        }
    },
    settings,

    css: ".majic-platform-indicator { display: inline-flex; justify-content: center; align-items: center; vertical-align: top; position: relative; } .majic-platform-icon { display: inline-flex; }",

    start() {
        if (settings.store.list) addMemberListDecorator("platform-indicators", ({ user }) => renderIndicators(user, true));
        if (settings.store.badges) addProfileBadge(badge);
        if (settings.store.messages) addMessageDecoration("platform-indicators", props => renderIndicators(props.message?.author, false));
    },

    stop() {
        removeMemberListDecorator("platform-indicators");
        removeProfileBadge(badge);
        removeMessageDecoration("platform-indicators");
    },

    patches: [
        {
            find: ".Masks.STATUS_ONLINE_MOBILE",
            predicate: () => settings.store.colorMobileIndicator,
            replacement: [
                {
                    match: /\.STATUS_TYPING;switch(?=.+?(if\(\i\)return \i\.\i\.Masks\.STATUS_ONLINE_MOBILE))/,
                    replace: ".STATUS_TYPING;$1;switch"
                },
                {
                    match: /switch\(\i\)\{case \i\.\i\.ONLINE:(if\(\i\)return\{[^}]+\})/,
                    replace: "$1;$&"
                }
            ]
        },
        {
            find: ".AVATAR_STATUS_MOBILE_16;",
            predicate: () => settings.store.colorMobileIndicator,
            replacement: [
                {
                    match: /\i===\i\.\i\.ONLINE&&(?=.{0,70}\.AVATAR_STATUS_MOBILE_16;)/,
                    replace: ""
                },
                {
                    match: /(?<=\(\i\.status,)(\i)(?=,\{.{0,15}isMobile:(\i))/,
                    replace: '$2?"online":$1'
                },
                {
                    match: /(?<=\i&&!\i)&&\i===\i\.\i\.ONLINE/,
                    replace: ""
                }
            ]
        },
        {
            find: "}isMobileOnline(",
            predicate: () => settings.store.colorMobileIndicator,
            replacement: {
                match: /(?<=\i\[\i\.\i\.MOBILE\])===\i\.\i\.ONLINE/,
                replace: "!= null"
            }
        }
    ]
});
