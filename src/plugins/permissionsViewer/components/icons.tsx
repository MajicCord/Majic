/*
 * Majic — PermissionsViewer icons
 */

import { DiscordIcon, React } from "@webpack/common";

import { s } from "../utils";

export function PermissionDeniedIcon() {
    return (
        <span title={s("denied")} style={{ display: "flex" }}>
            <DiscordIcon name="XLargeIcon" size={24} color="var(--status-danger)" />
        </span>
    );
}

export function PermissionAllowedIcon() {
    return (
        <span title={s("allowed")} style={{ display: "flex" }}>
            <DiscordIcon name="CheckmarkLargeIcon" size={24} color="var(--status-positive)" />
        </span>
    );
}
