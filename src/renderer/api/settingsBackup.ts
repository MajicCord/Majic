/*
 * Majic — local settings backup and restore
 */

import { settings } from "@api/settings";
import { t } from "@i18n";
import { Logger } from "@utils/logger";
import { moment, showToast } from "@webpack/common";

const logger = new Logger("SettingsBackup", "#39b7e0");

const UNSAFE_KEYS = ["__proto__", "constructor", "prototype"];

function isSafeObject(obj: unknown): boolean {
    if (obj == null || typeof obj !== "object") return true;

    for (const key in obj) {
        if (UNSAFE_KEYS.includes(key)) return false;
        if (!isSafeObject((obj as Record<string, unknown>)[key])) return false;
    }
    return true;
}

export async function importSettings(data: string) {
    let parsed: any;
    try {
        parsed = JSON.parse(data);
    } catch (err) {
        throw new Error("Failed to parse JSON: " + String(err));
    }

    if (!isSafeObject(parsed)) throw new Error("Unsafe settings");
    if (!("settings" in parsed && "quickCss" in parsed)) throw new Error("Invalid settings file");

    Object.assign(settings, parsed.settings);
    await MajicNative.setSettings(JSON.stringify(settings, null, 4));
    await MajicNative.setQuickCss(String(parsed.quickCss ?? ""));
}

export async function exportSettings({ minify }: { minify?: boolean } = {}) {
    const exported = JSON.parse(MajicNative.getSettings());
    const quickCss = await MajicNative.getQuickCss();
    return JSON.stringify({ settings: exported, quickCss }, null, minify ? undefined : 4);
}

export async function downloadSettingsBackup() {
    const filename = `majic-settings-backup-${moment().format("YYYY-MM-DD")}.json`;
    const data = new TextEncoder().encode(await exportSettings());
    (window as any).DiscordNative.fileManager.saveWithDialog(data, filename);
}

export async function uploadSettingsBackup() {
    const [file] = await (window as any).DiscordNative.fileManager.openFiles({
        filters: [
            { name: "Majic Settings Backup", extensions: ["json"] },
            { name: "all", extensions: ["*"] }
        ]
    });
    if (!file) return;

    try {
        await importSettings(new TextDecoder().decode(file.data));
        showToast({ text: t("majic.importSuccess"), variant: "success" });
    } catch (err) {
        logger.error(err);
        showToast({ text: t("majic.importFailure", { error: String(err) }), variant: "critical" });
    }
}
