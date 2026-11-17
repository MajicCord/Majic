/*
 * Majic — QuestTweaks settings search
 */

import { findComponentByCodeLazy } from "@webpack";
import { React, showToast, useEffect, useState } from "@webpack/common";
import type { JSX, KeyboardEvent } from "react";

import { getQuestTweaksSettings } from "../settings/access";
import { setSettingsSearchQuery, useSettingsSearchMatchCount, useSettingsSearchQuery } from "../settings/search";
import { s } from "../strings";
import { q } from "../utils/ui";

const TextInput = findComponentByCodeLazy('setHasValue?.(""!==', '="text",');

const KONAMI_CODE_LABEL = "Konami Code";
const KONAMI_ARROWS: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };

export function SettingsSearch(): JSX.Element {
    const query = useSettingsSearchQuery();
    const matchCount = useSettingsSearchMatchCount();
    const [inputValue, setInputValue] = useState(query);

    useEffect(() => {
        if (!inputValue.trim() || inputValue === KONAMI_CODE_LABEL) {
            setSettingsSearchQuery("");
            return;
        }

        const timeout = setTimeout(() => setSettingsSearchQuery(inputValue), 250);

        return () => clearTimeout(timeout);
    }, [inputValue]);

    useEffect(() => () => setSettingsSearchQuery(""), []);

    function handleChange(value: string): void {
        const code = value.toLowerCase().replace(/[\s,]/g, "")
            .replace(/up/g, "↑").replace(/down/g, "↓").replace(/left/g, "←").replace(/right/g, "→");

        if (code === "↑↑↓↓←→←→ba") {
            const settings = getQuestTweaksSettings();
            settings.usedKonamiCode = settings.usedKonamiCode !== true;
            showToast({ text: s(settings.usedKonamiCode ? "automationUnlocked" : "automationLocked"), variant: "success", duration: 5000 });
            setInputValue(KONAMI_CODE_LABEL);
            setSettingsSearchQuery("");
            return;
        }

        setInputValue(value);
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing) return;
        const arrow = KONAMI_ARROWS[event.key];
        if (!arrow) return;

        const input = event.target;
        if (!(input instanceof HTMLInputElement)) return;

        event.preventDefault();

        const isCodeLabel = input.value === KONAMI_CODE_LABEL;
        const start = isCodeLabel ? 0 : input.selectionStart ?? input.value.length;
        const end = isCodeLabel ? input.value.length : input.selectionEnd ?? start;
        input.setRangeText(arrow, start, end, "end");
        handleChange(input.value);
    }

    return (
        <div className={q("settings-search")}>
            <TextInput
                type="search"
                aria-label={s("searchSettings")}
                placeholder={s("searchPlaceholder")}
                value={inputValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
            />
            {query.trim() && matchCount === 0 && (
                <div className={q("settings-search-empty")} role="status">{s("noMatchingSettings")}</div>
            )}
        </div>
    );
}
