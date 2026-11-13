/*
 * Majic — project constants
 */

export const MAJIC_DEVELOPERS: ReadonlySet<string> = new Set([
    "402134948221288450",
    "1285243713802469439"
]);

export const isMajicDeveloper = (userId: string) => MAJIC_DEVELOPERS.has(userId);
