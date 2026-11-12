/*
 * Majic — restart confirmation prompt
 */

import { t } from "@i18n";
import { ConfirmModal, openModal, React } from "@webpack/common";

interface PromptOptions {
    title?: string;
    subtitle?: string;
    confirmText?: string;
    cancelText?: string;
}

export function promptToRestart(type: "relaunch" | "reload", options: PromptOptions = {}) {
    const onConfirm = type === "relaunch" ? () => void MajicNative.relaunch() : () => location.reload();

    openModal((modalProps: any) => (
        <ConfirmModal
            variant="primary"
            {...modalProps}
            title={options.title ?? t("restart.title")}
            subtitle={options.subtitle ?? t("restart.subtitle")}
            confirmText={options.confirmText ?? t("restart.confirm")}
            cancelText={options.cancelText ?? t("restart.later")}
            onConfirm={onConfirm}
        />
    ));
}
