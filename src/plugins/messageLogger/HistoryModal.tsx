/*
 * Majic — MessageLogger history modal
 */

import { ErrorBoundary } from "@utils/ErrorBoundary";
import { classes } from "@utils/misc";
import { findCssClassesLazy } from "@webpack";
import { Modal, openModal, React, TabBar, Timestamp, Tooltip, useState } from "@webpack/common";

import { parseEditContent, s } from "./utils";

const CodeContainerClasses = findCssClassesLazy("markup", "codeContainer");
const MiscClasses = findCssClassesLazy("messageContent", "markupRtl");

export function openHistoryModal(message: any) {
    openModal((props: any) => (
        <ErrorBoundary name="MessageLogger history">
            <HistoryModal modalProps={props} message={message} />
        </ErrorBoundary>
    ));
}

function HistoryModal({ modalProps, message }: { modalProps: any; message: any }) {
    const [currentTab, setCurrentTab] = useState<number>(message.editHistory.length);
    const timestamps = [message.firstEditTimestamp, ...message.editHistory.map((m: any) => m.timestamp)];
    const contents = [...message.editHistory.map((m: any) => m.content), message.content];

    return (
        <Modal {...modalProps} size="lg" title={s("historyTitle")}>
            <TabBar
                type="top"
                look="brand"
                className="majic-ml-modal-tab-bar"
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                {message.firstEditTimestamp.getTime() !== message.timestamp.getTime() && (
                    <Tooltip text={s("notLogged")}>
                        {(tooltipProps: Record<string, unknown>) => (
                            <div {...tooltipProps}>
                                <TabBar.Item id={-1} disabled>
                                    <Timestamp className="majic-ml-modal-timestamp" timestamp={message.timestamp} isEdited={true} isInline={false} />
                                </TabBar.Item>
                            </div>
                        )}
                    </Tooltip>
                )}

                {timestamps.map((timestamp: Date, index: number) => (
                    <TabBar.Item key={index} id={index}>
                        <Timestamp className="majic-ml-modal-timestamp" timestamp={timestamp} isEdited={true} isInline={false} />
                    </TabBar.Item>
                ))}
            </TabBar>

            <div className={classes(CodeContainerClasses.markup, MiscClasses.messageContent)} style={{ marginTop: 20 }}>
                {parseEditContent(contents[currentTab], message)}
            </div>
        </Modal>
    );
}
