/*
 * Majic — update checks
 */

import { showNotification } from "@api/notifications";
import { settings } from "@api/settings";
import { t } from "@i18n";
import { Logger } from "@utils/logger";
import { SettingsRouter } from "@webpack/common";

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

let notifiedThisSession = false;

function notifyOnce(data: Parameters<typeof showNotification>[0]) {
    if (notifiedThisSession) return;
    notifiedThisSession = true;
    setTimeout(() => showNotification({ permanent: true, ...data }), 10_000);
}

function openMajicSettings() {
    try {
        SettingsRouter.openUserSettings("majic_main_panel");
    } catch {
        SettingsRouter.openUserSettings();
    }
}

export async function runUpdateCheck() {
    if (IS_DEV || IS_REPORTER) return;

    try {
        if (!await checkForUpdates()) return;

        if (settings.autoUpdate) {
            await update();
            if (settings.autoUpdateNotification) {
                notifyOnce({
                    title: t("updater.updatedTitle"),
                    body: t("updater.updatedBody"),
                    onClick: () => void MajicNative.relaunch()
                });
            }
            return;
        }

        notifyOnce({
            title: t("updater.availableTitle"),
            body: t("updater.availableBody"),
            onClick: openMajicSettings
        });
    } catch (err) {
        logger.error("Update check failed", err);
    }
}

export function startUpdateChecks() {
    void runUpdateCheck();
    if (settings.autoUpdate && !settings.autoUpdateNotification) {
        setInterval(runUpdateCheck, 30 * 60_000);
    }
}
