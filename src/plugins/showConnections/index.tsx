/*
 * Majic — ShowConnections plugin
 */

import { definePluginSettings } from "@api/settings";
import { createStrings } from "@i18n";
import { isPluginEnabled, plugins } from "@renderer/plugins";
import { copyWithToast, getIntlMessage } from "@utils/discord";
import { withErrorBoundary } from "@utils/ErrorBoundary";
import { definePlugin, OptionType } from "@utils/types";
import { findByCodeLazy, findByPropsLazy, findComponentByCodeLazy, findLazy } from "@webpack";
import { DiscordIcon, React, Stores, Tooltip } from "@webpack/common";

const s = createStrings({
    en: { compact: "Compact", cozy: "Cozy", roomy: "Roomy" },
    fr: { compact: "Compact", cozy: "Confortable", roomy: "Spacieux" }
});

interface ConnectedAccount {
    id: string;
    type: string;
    name: string;
    verified: boolean;
}

interface ConnectionPlatform {
    getPlatformUserUrl?(connection: ConnectedAccount): string;
    icon: { lightSVG: string; darkSVG: string };
}

const useLegacyPlatformType: (platform: string) => string = findByCodeLazy(".TWITTER_LEGACY:");
const platforms: { get(type: string): ConnectionPlatform } = findByPropsLazy("isSupported", "getByUrl");
const getProfileThemeProps = findByCodeLazy(".getPreviewThemeColors", "primaryColor:");

const ColorMap = findLazy(m => m.colors?.INTERACTIVE_MUTED?.css);
const VerifiedIconComponent = findComponentByCodeLazy("#{intl::CONNECTIONS_ROLE_OFFICIAL_ICON_TOOLTIP}");
const useToken = findLazy(m => {
    if (typeof m !== "function") return false;
    const str = String(m);
    return str.includes(".resolve({theme:") && str.includes('"refresh-fast-follow-avatars"') && !str.includes("useMemo");
});

const Spacing = {
    COMPACT: 0,
    COZY: 1,
    ROOMY: 2
} as const;

const getSpacingPx = (spacing: number | undefined) => (spacing ?? Spacing.COMPACT) * 2 + 4;

const settings = definePluginSettings({
    iconSize: {
        type: OptionType.NUMBER,
        description: "Icon size (px)",
        default: 32
    },
    iconSpacing: {
        type: OptionType.SELECT,
        description: "Icon margin",
        options: [
            { get label() { return s("compact"); }, value: Spacing.COMPACT },
            { get label() { return s("cozy"); }, value: Spacing.COZY, default: true },
            { get label() { return s("roomy"); }, value: Spacing.ROOMY }
        ]
    }
});

function VerifiedIcon() {
    const color = useToken(ColorMap.colors.INTERACTIVE_MUTED).hex();
    const forcedIconColor = useToken(ColorMap.colors.INTERACTIVE_ICON_ACTIVE ?? ColorMap.colors.INTERACTIVE_ACTIVE).hex();

    return (
        <VerifiedIconComponent
            color={color}
            forcedIconColor={forcedIconColor}
            size={16}
            tooltipText={getIntlMessage("CONNECTION_VERIFIED")}
            className="majic-sc-tooltip-icon"
        />
    );
}

function CompactConnectionComponent({ connection, theme }: { connection: ConnectedAccount; theme: string }) {
    const platform = platforms.get(useLegacyPlatformType(connection.type));
    const url = platform.getPlatformUserUrl?.(connection);

    const img = (
        <img
            aria-label={connection.name}
            src={theme === "light" ? platform.icon.lightSVG : platform.icon.darkSVG}
            style={{ width: settings.store.iconSize, height: settings.store.iconSize }}
        />
    );

    return (
        <Tooltip
            text={
                <span className="majic-sc-tooltip">
                    <span className="majic-sc-connection-name">{connection.name}</span>
                    {connection.verified && <VerifiedIcon />}
                    <span className="majic-sc-tooltip-icon"><DiscordIcon name={url ? "LinkIcon" : "CopyIcon"} size={16} /></span>
                </span>
            }
            key={connection.id}
        >
            {(tooltipProps: Record<string, unknown>) =>
                url
                    ? (
                        <a
                            {...tooltipProps}
                            className="majic-user-connection"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => {
                                if (isPluginEnabled("OpenInApp")) (plugins.OpenInApp as any).handleLink(e.currentTarget, e);
                            }}
                        >
                            {img}
                        </a>
                    )
                    : (
                        <button
                            {...tooltipProps}
                            className="majic-user-connection"
                            onClick={() => void copyWithToast(connection.name)}
                        >
                            {img}
                        </button>
                    )
            }
        </Tooltip>
    );
}

function ConnectionsComponent({ id, theme }: { id: string; theme: string }) {
    const profile = Stores.UserProfileStore.getUserProfile(id);
    if (!profile) return null;

    const connections: ConnectedAccount[] | undefined = profile.connectedAccounts;
    if (!connections?.length) return null;

    return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: getSpacingPx(settings.store.iconSpacing) }}>
            {connections.map(connection => <CompactConnectionComponent connection={connection} theme={theme} key={connection.id} />)}
        </div>
    );
}

function ProfilePopoutComponent(props: { user: { id: string }; displayProfile?: any }) {
    return <ConnectionsComponent id={props.user.id} theme={getProfileThemeProps(props).theme} />;
}

export default definePlugin({
    name: "ShowConnections",
    description: "Shows connected accounts in user popouts and the DM sidebar",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Affiche les comptes connectés dans les profils et le panneau latéral des MP",
            options: {
                iconSize: "Taille des icônes (px)",
                iconSpacing: "Espacement des icônes"
            }
        }
    },
    settings,

    css: ".majic-user-connection { all: unset; display: inline-block; cursor: pointer; } .majic-sc-tooltip { display: inline-flex; gap: 0.25em; align-items: center; } .majic-sc-connection-name { word-break: break-all; } .majic-sc-tooltip-icon { min-width: 16px; display: inline-flex; }",

    patches: [
        {
            find: '"UserProfilePopout");',
            replacement: {
                match: /userId:\i\.id,guild:\i\}\)(?=])/,
                replace: "$&,$self.profilePopoutComponent(arguments[0])"
            }
        },
        {
            find: '.getByName("fork_and_knife")',
            replacement: {
                match: /targetUserId:\i\.id.{0,60}?]}\)(?=])/,
                replace: "$&,$self.profilePopoutComponent(arguments[0])"
            }
        }
    ],

    profilePopoutComponent: withErrorBoundary("ShowConnections", ProfilePopoutComponent)
});
