/*
 * Majic — QuestTweaks restart tracking
 */

import { addChangeListener, removeChangeListener } from "@api/settings";
import type { DefinedSettings, SettingsDefinition } from "@utils/types";

import { s } from "../strings";
import { Alerts } from "../utils/ui";

type RestartTrackingSettings = Pick<DefinedSettings<SettingsDefinition>, "def" | "pluginName">;

interface RestartPromptOptions {
    onDecline?: () => void;
}

let restartDirty = false;
let didAttachRestartListeners = false;
const restartListenerCleanups: (() => void)[] = [];

function getRestartSettingPaths(settings: RestartTrackingSettings): string[] {
    return Object.entries(settings.def)
        .filter(([, definition]) => definition.restartNeeded)
        .map(([key]) => `plugins.${settings.pluginName}.${key}`);
}

export function initializeRestartTracking(settings: RestartTrackingSettings): void {
    if (didAttachRestartListeners) {
        return;
    }

    didAttachRestartListeners = true;

    for (const path of getRestartSettingPaths(settings)) {
        const markRestartDirty = () => { restartDirty = true; };

        addChangeListener(path, markRestartDirty);
        restartListenerCleanups.push(() => removeChangeListener(path, markRestartDirty));
    }
}

export function disposeRestartTracking(): void {
    for (const cleanup of restartListenerCleanups.splice(0)) {
        cleanup();
    }

    didAttachRestartListeners = false;
}

export function isRestartDirty(): boolean {
    return restartDirty;
}

export function setRestartDirty(dirty: boolean): void {
    restartDirty = dirty;
}

export function promptToRestartIfDirty({ onDecline }: RestartPromptOptions = {}): boolean {
    if (!restartDirty) {
        return false;
    }

    let didConfirm = false;
    let didDecline = false;

    function declineRestart(): void {
        if (didConfirm || didDecline) {
            return;
        }

        didDecline = true;

        if (onDecline) {
            setTimeout(onDecline, 0);
        }
    }

    Alerts.show({
        title: s("restartTitle"),
        body: s("restartBody"),
        confirmText: s("restart"),
        cancelText: s("later"),
        onConfirm: () => {
            didConfirm = true;
            location.reload();
        },
        onCancel: declineRestart,
        onCloseCallback: declineRestart
    });

    return true;
}
