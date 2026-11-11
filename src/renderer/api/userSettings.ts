/*
 * Majic — Discord user settings API
 */

import { Logger } from "@utils/logger";
import { filters, replaceExport, waitFor } from "@webpack";

const logger = new Logger("UserSettings", "#8be9fd");

export interface UserSetting<T = any> {
    getSetting(): T;
    updateSetting(value: T | ((old: T) => T)): Promise<void>;
    useSetting(): T;
    group?: string;
    name?: string;
}

const registry = new Map<string, UserSetting>();

export const getUserSetting = <T = any>(group: string, name: string) => registry.get(`${group}.${name}`) as UserSetting<T> | undefined;
export const getAllUserSettings = () => new Map(registry);

function register(setting: UserSetting, group: unknown, name: unknown) {
    if (typeof group !== "string" || typeof name !== "string" || !setting) return setting;
    setting.group = group;
    setting.name = name;
    registry.set(`${group}.${name}`, setting);
    return setting;
}

const BASE_FACTORY = filters.byCode("updateAsync(", "useSetting:");
const DERIVED_FACTORIES = [filters.byCode('"SELECTIVELY_SYNCED_USER_SETTINGS_UPDATE"'), filters.byCode('"USER_SETTINGS_OVERRIDE_CLEAR"')];

export function _installUserSettings() {
    waitFor(BASE_FACTORY, () => {
        const wrapped = replaceExport(BASE_FACTORY, original => function (this: unknown, group: string, name: string, ...rest: unknown[]) {
            return register(original.call(this, group, name, ...rest), group, name);
        });
        if (!wrapped) return logger.error("Could not hook Discord's user settings factory");

        for (const filter of DERIVED_FACTORIES) {
            replaceExport(filter, original => function (this: unknown, base: UserSetting, ...rest: unknown[]) {
                return register(original.call(this, base, ...rest), base?.group, base?.name);
            });
        }
        logger.info("User settings hooked");
    });
}
