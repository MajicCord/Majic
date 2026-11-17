/*
 * Majic — QuestTweaks settings modal
 */

import { Modal, openModal, React } from "@webpack/common";

import { promptToRestartIfDirty } from "../settings/restartTracking";
import { setSettingsModalOpen } from "../state";
import { QuestTweaksSettingsPage } from "./settingsPage";

export function openQuestTweaksSettingsModal(): void {
    setSettingsModalOpen(true);

    openModal(
        (modalProps: any) => (
            <Modal {...modalProps} title="QuestTweaks" size="lg">
                <QuestTweaksSettingsPage />
            </Modal>
        ),
        {
            onCloseCallback: () => {
                setSettingsModalOpen(false);
                promptToRestartIfDirty();
            }
        }
    );
}
