/*
 * Majic — BetterSessions buttons
 */

import { openModal, React } from "@webpack/common";

import { s } from "../strings";
import type { SessionInfo } from "../types";
import { cl } from "../utils";
import { RenameModal } from "./RenameModal";

export function RenameButton({ session, state }: { session: SessionInfo["session"]; state: [string, (value: string) => void] }) {
    return (
        <button
            type="button"
            className={`majic-button ${cl("rename-btn")}`}
            data-variant="secondary"
            onClick={() => {
                openModal((props: any) => <RenameModal props={props} session={session} state={state} />);
            }}
        >
            {s("rename")}
        </button>
    );
}

export function NewButton() {
    return <span className={`majic-button ${cl("new-btn")}`} data-variant="danger">{s("newBadge")}</span>;
}
