/*
 * Majic — BetterSessions rename modal
 */

import { SubHeading, TextInput } from "@components/ui";
import { Modal, React, useState } from "@webpack/common";

import { s } from "../strings";
import type { SessionInfo } from "../types";
import { getDefaultName, savedSessionsCache, saveSessionsToDataStore } from "../utils";

export function RenameModal({ props, session, state }: { props: any; session: SessionInfo["session"]; state: [string, (value: string) => void] }) {
    const [, setTitle] = state;
    const [value, setValue] = useState(savedSessionsCache.get(session.id_hash)?.name ?? "");

    function onSaveClick() {
        savedSessionsCache.set(session.id_hash, { name: value, isNew: false });
        setTitle(value !== "" ? `${value}*` : getDefaultName(session.client_info));

        void saveSessionsToDataStore();
        props.onClose();
    }

    return (
        <Modal
            {...props}
            title={s("rename")}
            actions={[
                { text: s("cancel"), variant: "secondary", onClick: () => props.onClose() },
                { text: s("save"), variant: "primary", onClick: onSaveClick }
            ]}
        >
            <div onKeyDown={e => e.key === "Enter" && onSaveClick()}>
                <SubHeading>{s("newName")}</SubHeading>
                <div style={{ marginBottom: 10 }}>
                    <TextInput placeholder={getDefaultName(session.client_info)} value={value} onChange={setValue} />
                </div>
                <button type="button" className="majic-better-sessions-text-button" onClick={() => setValue("")}>
                    {s("resetName")}
                </button>
            </div>
        </Modal>
    );
}
