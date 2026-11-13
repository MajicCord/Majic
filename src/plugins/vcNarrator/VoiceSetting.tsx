/*
 * Majic — VcNarrator voice picker
 */

import { Select, SubHeading, Text } from "@components/ui";
import { React, useMemo, useState } from "@webpack/common";

import { getCurrentVoice, s, settings } from "./settings";

interface PickerProps {
    voice: string | undefined;
    voices: SpeechSynthesisVoice[];
}

function groupByLanguage(voices: SpeechSynthesisVoice[]) {
    const groups: Record<string, SpeechSynthesisVoice[]> = {};
    for (const voice of voices) (groups[voice.lang] ??= []).push(voice);
    return groups;
}

function SimplePicker({ voice, voices }: PickerProps) {
    const options = voices.map(v => ({ label: v.name, value: v.voiceURI }));
    return (
        <Select
            placeholder={s("selectVoice")}
            value={options.find(option => option.value === voice)?.value ?? ""}
            options={options}
            onChange={value => settings.store.voice = String(value)}
        />
    );
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

function ComplexPicker({ voice, voices }: PickerProps) {
    const grouped = useMemo(() => groupByLanguage(voices), [voices]);

    const languages = useMemo(() => {
        const list: Array<{ name: string; friendlyName: string }> = [];
        for (const name in grouped) {
            try {
                const friendlyName = languageNames.of(name);
                if (friendlyName) list.push({ name, friendlyName });
            } catch { }
        }
        return list;
    }, [grouped]);

    const [selectedLanguage, setSelectedLanguage] = useState(() => getCurrentVoice()?.lang ?? languages[0]?.name);

    if (languages.length === 1) return <SimplePicker voice={voice} voices={grouped[languages[0].name]} />;

    const languageOptions = languages.map(language => ({ label: language.friendlyName, value: language.name }));

    return (
        <>
            <SubHeading>{s("language")}</SubHeading>
            <Select
                placeholder={s("selectLanguage")}
                value={languageOptions.find(option => option.value === selectedLanguage)?.value ?? ""}
                options={languageOptions}
                onChange={value => setSelectedLanguage(String(value))}
            />
            <SubHeading>{s("voice")}</SubHeading>
            <SimplePicker voice={voice} voices={grouped[selectedLanguage] ?? []} />
        </>
    );
}

function VoiceSetting() {
    const voices = useMemo(() => window.speechSynthesis?.getVoices() ?? [], []);
    const { voice } = settings.use(["voice"]);

    if (!voices.length) return <Text>{s("noVoices")}</Text>;

    const Picker = voices.length > 20 ? ComplexPicker : SimplePicker;
    return <Picker voice={voice as string | undefined} voices={voices} />;
}

export function VoiceSettingSection() {
    return (
        <section>
            <SubHeading>{s("voice")}</SubHeading>
            <VoiceSetting />
        </section>
    );
}
