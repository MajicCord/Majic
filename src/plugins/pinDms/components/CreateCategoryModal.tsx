/*
 * Majic — PinDMs category modal
 */

import { TextInput } from "@components/ui";
import { extractAndLoadChunksLazy, findComponentByCodeLazy } from "@webpack";
import { ColorPicker, Modal, openModalLazy, React, useMemo, useState } from "@webpack/common";

import { DEFAULT_COLOR, SWATCHES } from "../constants";
import { categoryLen, type Category, createCategory, getCategory } from "../data";
import { s } from "../settings";

const ColorPickerWithSwatches = findComponentByCodeLazy('id:"color-picker"');

export const requireSettingsModal = extractAndLoadChunksLazy(['type:"USER_SETTINGS_MODAL_OPEN"']);

interface Props {
    categoryId: string | null;
    initialChannelId: string | null;
    modalProps: any;
}

function useCategory(categoryId: string | null, initialChannelId: string | null): Category | undefined {
    return useMemo(() => {
        if (categoryId) return getCategory(categoryId);
        if (initialChannelId) {
            return {
                id: crypto.randomUUID(),
                name: s("defaultName", { index: categoryLen() + 1 }),
                color: DEFAULT_COLOR,
                collapsed: false,
                channels: [initialChannelId]
            };
        }
    }, [categoryId, initialChannelId]);
}

function NewCategoryModal({ categoryId, modalProps, initialChannelId }: Props) {
    const category = useCategory(categoryId, initialChannelId);
    const [name, setName] = useState(category?.name ?? "");
    const [color, setColor] = useState(category?.color ?? DEFAULT_COLOR);

    if (!category) return null;

    const onSave = () => {
        category.name = name;
        category.color = color;

        if (!categoryId) createCategory(category);

        modalProps.onClose();
    };

    return (
        <Modal
            {...modalProps}
            title={categoryId ? s("editCategoryTitle") : s("newCategoryTitle")}
            actions={[{
                text: categoryId ? s("save") : s("create"),
                variant: "primary",
                onClick: onSave,
                disabled: !name
            }]}
        >
            <form
                className="majic-pindms-modal-content"
                onSubmit={e => {
                    e.preventDefault();
                    onSave();
                }}
            >
                <section>
                    <h3 className="majic-pindms-heading">{s("name")}</h3>
                    <TextInput value={name} onChange={setName} />
                </section>
                <section>
                    <h3 className="majic-pindms-heading">{s("color")}</h3>
                    <ColorPickerWithSwatches
                        className="majic-pindms-modal-color-picker"
                        key={category.id}
                        defaultColor={DEFAULT_COLOR}
                        colors={SWATCHES}
                        onChange={(c: number | null) => setColor(c!)}
                        value={color}
                        renderDefaultButton={() => null}
                        renderCustomButton={() => (
                            <ColorPicker
                                color={color}
                                onChange={(c: number | null) => setColor(c!)}
                                key={category.id}
                                showEyeDropper={false}
                            />
                        )}
                    />
                </section>
            </form>
        </Modal>
    );
}

export const openCategoryModal = (categoryId: string | null, channelId: string | null) =>
    openModalLazy(async () => {
        await requireSettingsModal();
        return (modalProps: any) => <NewCategoryModal categoryId={categoryId} modalProps={modalProps} initialChannelId={channelId} />;
    });
