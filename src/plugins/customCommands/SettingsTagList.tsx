/*
 * Majic — CustomCommands tag list
 */

import { Button, SubHeading } from "@components/ui";
import { DiscordIcon, React } from "@webpack/common";

import { openCreateTagModal } from "./CreateTagModal";
import { removeTag, s, settings, type Tag } from "./settings";

export function SettingsTagList() {
    const { tagsList } = settings.use(["tagsList"]);

    return (
        <section style={{ marginTop: 8 }}>
            <SubHeading>{s("registered")}</SubHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5em", marginTop: 8 }}>
                {Object.values(tagsList as Record<string, Tag>).map(tag => (
                    <div key={tag.name} className="majic-card majic-customcommands-card">
                        <span className="majic-text" style={{ fontWeight: 500 }}>{tag.name}</span>
                        <button type="button" className="majic-icon-button" aria-label={s("editTag")} onClick={() => openCreateTagModal(tag)}>
                            <DiscordIcon name="PencilIcon" size={20} />
                        </button>
                        <button type="button" className="majic-icon-button majic-customcommands-delete" aria-label={s("deleteTag")} onClick={() => removeTag(tag.name)}>
                            <DiscordIcon name="TrashIcon" size={20} />
                        </button>
                    </div>
                ))}
                <Button onClick={() => openCreateTagModal()}>{s("createTag")}</Button>
            </div>
        </section>
    );
}
