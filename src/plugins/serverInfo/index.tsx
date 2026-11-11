/*
 * Majic — ServerInfo plugin
 */

import { findGroupChildrenByChildId, Menu } from "@api/contextMenu";
import { definePlugin } from "@utils/types";
import { DiscordIcon, React } from "@webpack/common";

import { openGuildInfoModal, s } from "./GuildInfoModal";

const InfoIcon = (props: { width?: number }) => <DiscordIcon name="CircleInformationIcon" size={props.width ?? 18} />;

const makePatch = (showIcon: boolean) => (children: any[], { guild }: { guild?: any } = {}) => {
    if (!guild) return;
    findGroupChildrenByChildId("privacy", children)?.push(
        <Menu.MenuItem
            id="majic-server-info"
            key="majic-server-info"
            label={s("serverInfo")}
            leadingAccessory={showIcon ? { type: "icon", icon: InfoIcon } : undefined}
            action={() => openGuildInfoModal(guild)}
        />
    );
};

export default definePlugin({
    name: "ServerInfo",
    description: "Lets you view information about a server",
    authors: [{ name: "SnailyStudios" }],
    dependencies: ["DynamicImageModalAPI"],
    translations: {
        fr: {
            description: "Permet de voir les informations d'un serveur"
        }
    },

    css: [
        ".majic-gp-banner { cursor: pointer; aspect-ratio: auto 240 / 135; height: 334px; width: 100%; padding-inline: 0.5em; box-sizing: border-box; object-fit: cover; overflow: clip; overflow-clip-margin: content-box; }",
        ".majic-gp-header { display: flex; flex-direction: row; align-items: center; gap: 0.5em; margin: 0.5em; }",
        ".majic-gp-icon { width: 48px; height: 48px; cursor: pointer; border-radius: 16px; }",
        ".majic-gp-name-and-description { display: flex; flex-direction: column; gap: 0.2em; }",
        ".majic-gp-name { margin: 0; color: var(--text-strong); font-size: 20px; font-weight: 600; }",
        ".majic-gp-description { margin: 0; color: var(--text-default); font-size: 14px; }",
        ".majic-gp-tab-bar { border-bottom: 1px solid var(--border-subtle); margin: 20px 12px 0; display: flex; gap: 40px; align-items: stretch; flex-direction: row; }",
        ".majic-gp-tab { border-bottom: 2px solid transparent; color: var(--interactive-icon-default); cursor: pointer; line-height: 14px; }",
        ".majic-gp-tab-content { margin: 1em; }",
        ".majic-gp-tab:where(.majic-gp-selected, :hover, :focus) { border-bottom-color: var(--interactive-icon-active); }",
        ".majic-gp-info { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1em; }",
        ".majic-gp-server-info-pair { color: var(--text-default); }",
        ".majic-gp-field-name { margin: 0 0 8px; color: var(--text-strong); font-size: 14px; font-weight: 600; }",
        ".majic-gp-server-info-pair [class*=\"timestamp\"] { margin-left: 0; }",
        ".majic-gp-owner { display: flex; align-items: center; gap: 0.2em; }",
        ".majic-gp-owner-avatar { height: 20px; border-radius: 50%; cursor: pointer; }",
        ".majic-gp-scroller { max-height: 500px; }",
        ".majic-gp-scroller [class*=\"row\"] { margin: 1px 0; }"
    ].join(" "),

    contextMenus: {
        "guild-context": makePatch(false),
        "guild-header-popout": makePatch(true)
    }
});
