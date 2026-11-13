/*
 * Majic — project constants
 */

export const MAJIC_DEVELOPERS: ReadonlySet<string> = new Set([
    "402134948221288450",
    "1285243713802469439"
]);

export const BADGE_ASSETS = "https://raw.githubusercontent.com/MajicCord/Majic/main/assets/badges";
export const DEVELOPER_BADGE_ICON = `${BADGE_ASSETS}/developer.png`;
export const SUPPORTER_BADGE_ICON = `${BADGE_ASSETS}/supporter.png`;

export const isMajicDeveloper = (userId: string) => MAJIC_DEVELOPERS.has(userId);

export const SPONSOR_URL = "https://github.com/sponsors/nullbrik";
