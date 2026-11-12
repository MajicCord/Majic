/*
 * Majic — update checks
 */

import { showNotification } from "@api/notifications";
import { settings } from "@api/settings";
import { t } from "@i18n";
import { Logger } from "@utils/logger";

export interface UpdateChange {
    hash: string;
    author: string;
    message: string;
}

const logger = new Logger("Updater", "#50fa7b");

export let changes: UpdateChange[] = [];
export let isOutdated = false;
export let isNewer = false;

async function unwrap<T>(promise: Promise<{ ok: true; value: T } | { ok: false; error: string }>): Promise<T> {
    const result = await promise;
    if (!result.ok) throw new Error(result.error);
    return result.value;
}

export const getRepo = () => unwrap(MajicNative.updater.getRepo());

export async function checkForUpdates() {
    changes = await unwrap(MajicNative.updater.getUpdates());
    isNewer = changes.some(change => change.hash === MAJIC_GIT_HASH);
    isOutdated = !isNewer && changes.length > 0;
    return isOutdated;
}

export async function update() {
    if (!isOutdated) return true;

    const downloaded = await unwrap(MajicNative.updater.update());
    if (!downloaded) return false;

    isOutdated = false;
    if (!await unwrap(MajicNative.updater.rebuild())) throw new Error(t("updater.buildFailed"));
    return true;
}

export async function runStartupUpdateCheck() {
    if (IS_DEV || IS_REPORTER) return;

    try {
        if (!await checkForUpdates()) return;

        if (settings.autoUpdate) {
            await update();
            if (settings.autoUpdateNotification) {
                showNotification({
                    title: t("updater.updatedTitle"),
                    body: t("updater.updatedBody"),
                    permanent: true,
                    onClick: () => void MajicNative.relaunch()
                });
            }
            return;
        }

        showNotification({
            title: t("updater.availableTitle"),
            body: t("updater.availableBody"),
            permanent: true
        });
    } catch (err) {
        logger.error("Update check failed", err);
    }
}
