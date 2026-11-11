/*
 * Majic — Translate modal
 */

import { ensureUiStyles, SubHeading, Switch, Text } from "@components/ui";
import { findComponentByCodeLazy } from "@webpack";
import { Modal, openModal, React, useMemo } from "@webpack/common";

import { settings } from "./settings";
import { s } from "./strings";
import { getLanguages } from "./utils";

const SearchableSelect = findComponentByCodeLazy('?"multiple":"single",required:');

const LanguageSettingKeys = ["receivedInput", "receivedOutput", "sentInput", "sentOutput"] as const;

function LanguageSelect({ settingsKey, includeAuto }: { settingsKey: typeof LanguageSettingKeys[number]; includeAuto: boolean }) {
    const currentValue = settings.use([settingsKey])[settingsKey];

    const options = useMemo(() => {
        const options = Object.entries(getLanguages()).map(([value, label]) => ({ value, label }));
        if (!includeAuto) options.shift();
        return options;
    }, []);

    return (
        <section style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8 }}>
                <SubHeading>{s(settingsKey)}</SubHeading>
            </div>

            <SearchableSelect
                options={options}
                value={options.find(o => o.value === currentValue)?.value}
                placeholder={s("selectLanguage")}
                maxVisibleItems={5}
                closeOnSelect={true}
                onChange={(v: string) => settings.store[settingsKey] = v}
            />
        </section>
    );
}

function AutoTranslateToggle() {
    const value = settings.use(["autoTranslate"]).autoTranslate;

    return (
        <div className="majic-row">
            <div className="majic-row-grow">
                <Text>{s("autoTranslate")}</Text>
                <Text muted>{s("autoTranslateDescription")}</Text>
            </div>
            <Switch checked={value} onChange={v => settings.store.autoTranslate = v} label={s("autoTranslate")} />
        </div>
    );
}

function TranslateModal({ rootProps }: { rootProps: any }) {
    return (
        <Modal {...rootProps} title={s("translate")}>
            {LanguageSettingKeys.map(key => (
                <LanguageSelect key={key} settingsKey={key} includeAuto={key.endsWith("Input")} />
            ))}

            <div className="majic-trans-divider" />

            <AutoTranslateToggle />
        </Modal>
    );
}

export function openTranslateModal() {
    ensureUiStyles();
    openModal((props: any) => <TranslateModal rootProps={props} />);
}
