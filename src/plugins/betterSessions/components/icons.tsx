/*
 * Majic — BetterSessions icons
 */

import { DiscordIcon as Icon, React } from "@webpack/common";

type IconProps = { width?: number; height?: number; className?: string };

const makeIcon = (name: string) => (props: IconProps) => (
    <span className={props.className} style={{ display: "flex" }}>
        <Icon name={name} size={props.width ?? 14} />
    </span>
);

export const DiscordIcon = makeIcon("ClydeIcon");
export const BrowserIcon = makeIcon("GlobeEarthIcon");
export const MobileIcon = makeIcon("MobilePhoneIcon");
export const UnknownIcon = makeIcon("CircleQuestionIcon");
