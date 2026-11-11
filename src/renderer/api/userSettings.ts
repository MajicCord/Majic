/*
 * Majic — Discord user settings API
 */

import { proxyLazy } from "@utils/lazy";
import { Logger } from "@utils/logger";
import { findModuleId, wreq } from "@webpack";

const logger = new Logger("UserSettings", "#8be9fd");

export interface UserSetting<T = any> {
    getSetting(): T;
    updateSetting(value: T | ((old: T) => T)): Promise<void>;
    useSetting(): T;
    userSettingsAPIGroup?: string;
    userSettingsAPIName?: string;
}

const UserSettingsModule = proxyLazy<Record<string, UserSetting> | undefined>(() => {
    const id = findModuleId('"textAndImages","renderSpoilers"');
    if (id == null) {
        logger.error("Could not find Discord's user settings module");
        return undefined;
    }
    return wreq(id);
});

export function getUserSetting<T = any>(group: string, name: string): UserSetting<T> | undefined {
    for (const key in UserSettingsModule) {
        const setting = UserSettingsModule![key];
        if (setting?.userSettingsAPIGroup === group && setting.userSettingsAPIName === name) return setting;
    }
    return undefined;
}

export const getUserSettingLazy = <T = any>(group: string, name: string) => proxyLazy(() => getUserSetting<T>(group, name));
