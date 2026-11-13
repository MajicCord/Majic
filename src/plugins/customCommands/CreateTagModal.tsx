/*
 * Majic — CustomCommands tag editor
 */

import { ExpandableSection, SubHeading, TextArea, TextInput } from "@components/ui";
import { DiscordIcon, Modal, openModal, React, useState } from "@webpack/common";

import { parseTagArguments } from ".";
import { addTag, getTag, removeTag, s, type Tag } from "./settings";

const EXAMPLE_RESPONSE = "Hello {{user}}! I am feeling {{mood = great}}.";

export function openCreateTagModal(initialValue: Tag = { name: "", message: "" }) {
    openModal((modalProps: any) => <CreateTagDialog initialValue={initialValue} modalProps={modalProps} />);
}

function CreateTagDialog({ initialValue, modalProps }: { initialValue: Tag; modalProps: any }) {
    const [name, setName] = useState(initialValue.name);
    const [message, setMessage] = useState(initialValue.message.replaceAll("\\n", "\n"));

    const isEdit = Boolean(initialValue.name);
    const detectedArguments = parseTagArguments(message);
    const hasReservedEphemeral = detectedArguments.some(arg => arg.name === "ephemeral");
    const nameAlreadyExists = name !== initialValue.name && getTag(name);

    const notice = hasReservedEphemeral
        ? s("reserved")
        : nameAlreadyExists
            ? s("overwrite", { name })
            : undefined;

    const save = () => {
        if (isEdit && initialValue.name !== name) removeTag(initialValue.name);
        addTag({ name, message });
        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            title={isEdit ? s("editTag") : s("createTitle")}
            subtitle={isEdit ? s("editSubtitle") : s("createSubtitle")}
            actions={[
                { text: s("cancel"), variant: "secondary", onClick: modalProps.onClose },
                { text: isEdit ? s("save") : s("createButton"), variant: "primary", onClick: save, disabled: !name || !message || hasReservedEphemeral }
            ]}
            notice={notice ? { message: notice, type: "critical" } : undefined}
        >
            <div className="majic-page" style={{ gap: 12 }}>
                <section>
                    <SubHeading>{s("name")}</SubHeading>
                    <TextInput value={name} onChange={setName} placeholder="greet" />
                </section>

                <section>
                    <SubHeading>{s("response")}</SubHeading>
                    <TextArea value={message} onChange={setMessage} placeholder={EXAMPLE_RESPONSE} />
                </section>

                {detectedArguments.length > 0 && (
                    <section>
                        <SubHeading>{s("detected")}</SubHeading>
                        <ul className="majic-text">
                            {detectedArguments.map(arg => (
                                <li key={arg.name}>
                                    &mdash; <b>{arg.name}</b>{arg.defaultValue ? s("defaultValue", { value: arg.defaultValue }) : ""}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <ExpandableSection
                    renderContent={() => (
                        <div className="majic-text" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <p>{s("guideVariables")} <code>{"Hello {{user}}"}</code>.</p>
                            <p>{s("guideDefaults")} <code>{"Hello {{user = pal}}"}</code>.</p>
                            <section>
                                <p><b>{s("exampleResponse")}</b> <code>{EXAMPLE_RESPONSE}</code></p>
                                <p><b>{s("exampleUsage")}</b> <code>{"/greet user:@Clyde"}</code></p>
                                <p><b>{s("exampleOutput")}</b> <code>{"Hello @Clyde! I am feeling great."}</code></p>
                            </section>
                        </div>
                    )}
                >
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <DiscordIcon name="CircleInformationIcon" size={16} color="var(--text-muted)" />
                        {s("guideTitle")}
                    </span>
                </ExpandableSection>
            </div>
        </Modal>
    );
}
