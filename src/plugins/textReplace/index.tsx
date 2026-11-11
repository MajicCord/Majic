/*
 * Majic — TextReplace plugin
 */

import { definePluginSettings } from "@api/settings";
import { Button, ExpandableSection, SubHeading, Text, TextInput } from "@components/ui";
import { createStrings } from "@i18n";
import { Logger } from "@utils/logger";
import { definePlugin, OptionType } from "@utils/types";
import { React, Tooltip, useState } from "@webpack/common";

const s = createStrings({
    en: {
        simpleTitle: "Simple Replacements",
        simpleDescription: "Simple find and replace rules. For example, find 'brb' and replace it with 'be right back'",
        regexTitle: "Regex Replacements",
        regexDescription: "More powerful replacements using regular expressions. This section is for advanced users. If you don't understand it, just ignore it",
        search: "Search for a rule...",
        noMatch: "No rules match your search.",
        name: "Name",
        nameDescription: "An optional name to help you identify this rule.",
        find: "Find",
        findText: "The text to replace",
        findRegex: "The regex pattern",
        replace: "Replace",
        replaceDescription: "The text to replace the found text with",
        onlyIfIncludes: "Only if includes",
        onlyIfIncludesDescription: "Optionally, only apply this rule if the message includes this text.",
        deleteRule: "Delete Rule",
        addRule: "Add Rule",
        emptyRule: "Empty Rule {index}",
        rule: "Rule {index} - {find}",
        tester: "Rule Tester",
        testInput: "Type a message to test rules on",
        testOutput: "Message with rules applied"
    },
    fr: {
        simpleTitle: "Remplacements simples",
        simpleDescription: "Règles simples de recherche et remplacement. Par exemple, chercher « jrv » et le remplacer par « je reviens »",
        regexTitle: "Remplacements regex",
        regexDescription: "Remplacements plus puissants avec des expressions régulières. Cette section est pour les utilisateurs avancés : si tu ne comprends pas, ignore-la",
        search: "Rechercher une règle...",
        noMatch: "Aucune règle ne correspond à ta recherche.",
        name: "Nom",
        nameDescription: "Un nom facultatif pour reconnaître cette règle.",
        find: "Chercher",
        findText: "Le texte à remplacer",
        findRegex: "Le motif regex",
        replace: "Remplacer",
        replaceDescription: "Le texte qui remplace le texte trouvé",
        onlyIfIncludes: "Seulement si contient",
        onlyIfIncludesDescription: "Facultatif : n'appliquer cette règle que si le message contient ce texte.",
        deleteRule: "Supprimer la règle",
        addRule: "Ajouter une règle",
        emptyRule: "Règle vide {index}",
        rule: "Règle {index} - {find}",
        tester: "Testeur de règles",
        testInput: "Écris un message pour tester les règles",
        testOutput: "Message avec les règles appliquées"
    }
});

const logger = new Logger("TextReplace", "#bd93f9");

interface Rule {
    name?: string;
    find: string;
    replace: string;
    onlyIfIncludes: string;
    id: string;
    [key: string]: string | undefined;
}

interface RuleWithIndex {
    rule: Rule;
    index: number;
}

type DropIndicator = { index: number; position: "before" | "after" };

const makeEmptyRule = (): Rule => ({
    name: "",
    find: "",
    replace: "",
    onlyIfIncludes: "",
    id: crypto.randomUUID()
});

const makeEmptyRuleArray = () => [makeEmptyRule()];

function RulesEditor() {
    const { stringRules, regexRules } = settings.use(["stringRules", "regexRules"]);

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <TextReplaceTesting />
            <TextReplace title={s("simpleTitle")} description={s("simpleDescription")} rulesArray={stringRules} />
            <TextReplace title={s("regexTitle")} description={s("regexDescription")} rulesArray={regexRules} isRegex />
        </div>
    );
}

const settings = definePluginSettings({
    replace: {
        type: OptionType.COMPONENT,
        description: "",
        component: RulesEditor
    },
    stringRules: {
        type: OptionType.CUSTOM,
        description: "Rules for replacing text using string matching",
        default: makeEmptyRuleArray() as Rule[]
    },
    regexRules: {
        type: OptionType.CUSTOM,
        description: "Rules for replacing text using regular expressions",
        default: makeEmptyRuleArray() as Rule[]
    }
});

function stringToRegex(str: string) {
    const match = str.match(/^(\/)?(.+?)(?:\/([gimsuyv]*))?$/);
    return match
        ? new RegExp(
            match[2],
            match[3]
                ?.split("")
                .filter((char, pos, flags) => flags.indexOf(char) === pos)
                .join("")
            ?? "g"
        )
        : new RegExp(str);
}

function renderFindError(find: string) {
    try {
        stringToRegex(find);
        return null;
    } catch (err) {
        return <span style={{ color: "var(--text-feedback-critical)" }}>{String(err)}</span>;
    }
}

function Input({ initialValue, onChange, placeholder }: { placeholder: string; initialValue: string; onChange(value: string): void }) {
    const [value, setValue] = useState(initialValue);
    return (
        <TextInput
            placeholder={placeholder}
            value={value}
            onChange={setValue}
            spellCheck={false}
            onBlur={() => value !== initialValue && setTimeout(() => onChange(value), 0)}
        />
    );
}

function TextRow({ label, description, value, onChange }: { label: string; description: string; value: string; onChange(value: string): void }) {
    return (
        <>
            <Tooltip text={description}>
                {(props: Record<string, unknown>) => <span {...props} className="majic-textreplace-label">{label}</span>}
            </Tooltip>
            <Input placeholder={description} initialValue={value} onChange={onChange} />
        </>
    );
}

const isEmptyRule = (rule: Rule) => !rule.find;

function matchesRuleSearch(rule: Rule, query: string) {
    if (!query) return true;
    const normalizedQuery = query.trim().toLowerCase();
    return [rule.name ?? "", rule.find, rule.replace, rule.onlyIfIncludes].some(value => value.toLowerCase().includes(normalizedQuery));
}

function normalizeRule(rule: Rule) {
    rule.name ??= "";
    rule.id ??= crypto.randomUUID();
}

function TextReplace({ title, description, rulesArray, isRegex = false }: { title: string; description: string; rulesArray: Rule[]; isRegex?: boolean }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);

    function onClickRemove(index: number) {
        rulesArray.splice(index, 1);
    }

    function onChange(value: string, index: number, key: string) {
        rulesArray[index][key] = value;

        const rule = rulesArray[index];
        if (rule.name === "" && rule.find === "" && rule.replace === "" && rule.onlyIfIncludes === "" && index !== rulesArray.length - 1) {
            rulesArray.splice(index, 1);
        }
    }

    const filteredRules = rulesArray.reduce((acc: RuleWithIndex[], rule, index) => {
        if (matchesRuleSearch(rule, searchQuery)) acc.push({ rule, index });
        return acc;
    }, []);

    const handleDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        if (draggedIndex === null || searchQuery) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const position = e.clientY - rect.top < rect.height / 2 ? "before" : "after";
        setDropIndicator(prev => prev?.index === index && prev.position === position ? prev : { index, position });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (draggedIndex === null || !dropIndicator || searchQuery) {
            setDraggedIndex(null);
            setDropIndicator(null);
            return;
        }

        let targetIndex = dropIndicator.index + (dropIndicator.position === "after" ? 1 : 0);
        if (targetIndex > draggedIndex) targetIndex -= 1;

        if (targetIndex !== draggedIndex) {
            const draggedRule = rulesArray.splice(draggedIndex, 1)[0];
            rulesArray.splice(targetIndex, 0, draggedRule);
        }

        setDraggedIndex(null);
        setDropIndicator(null);
    };

    return (
        <>
            <div>
                <SubHeading>{title}</SubHeading>
                <Text muted>{description}</Text>
                <div className="majic-textreplace-search-input">
                    <TextInput placeholder={s("search")} value={searchQuery} onChange={setSearchQuery} />
                </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5em", paddingBottom: "1.25em" }}>
                {!filteredRules.length && searchQuery && <Text muted>{s("noMatch")}</Text>}
                {filteredRules.map(({ rule, index }) => (
                    <div
                        key={rule.id}
                        onDragOver={handleDragOver(index)}
                        onDrop={handleDrop}
                        style={{ opacity: draggedIndex === index ? 0.5 : 1, position: "relative" }}
                    >
                        {dropIndicator?.index === index && dropIndicator.position === "before" && (
                            <div className="majic-textreplace-drop-indicator" style={{ top: 0 }} />
                        )}
                        {dropIndicator?.index === index && dropIndicator.position === "after" && (
                            <div className="majic-textreplace-drop-indicator" style={{ bottom: 0 }} />
                        )}
                        <ExpandableSection
                            renderContent={() => (
                                <>
                                    <div className="majic-textreplace-input-grid">
                                        <TextRow label={s("name")} description={s("nameDescription")} value={rule.name ?? ""} onChange={v => onChange(v, index, "name")} />
                                        <TextRow label={s("find")} description={isRegex ? s("findRegex") : s("findText")} value={rule.find} onChange={v => onChange(v, index, "find")} />
                                        <TextRow label={s("replace")} description={s("replaceDescription")} value={rule.replace} onChange={v => onChange(v, index, "replace")} />
                                        <TextRow label={s("onlyIfIncludes")} description={s("onlyIfIncludesDescription")} value={rule.onlyIfIncludes} onChange={v => onChange(v, index, "onlyIfIncludes")} />
                                    </div>
                                    {isRegex && renderFindError(rule.find)}
                                    <Button className="majic-textreplace-delete-button" variant="danger" onClick={() => onClickRemove(index)}>
                                        {s("deleteRule")}
                                    </Button>
                                </>
                            )}
                        >
                            <div
                                draggable={!searchQuery}
                                onDragStart={e => {
                                    setDraggedIndex(index);
                                    e.dataTransfer.setData("text/plain", index.toString());
                                }}
                                onDragEnd={() => {
                                    setDraggedIndex(null);
                                    setDropIndicator(null);
                                }}
                                style={{ cursor: searchQuery ? "default" : "grab", flex: 1 }}
                            >
                                {rule.name
                                    ? rule.name
                                    : isEmptyRule(rule)
                                        ? s("emptyRule", { index: index + 1 })
                                        : s("rule", { index: index + 1, find: rule.find })}
                            </div>
                        </ExpandableSection>
                    </div>
                ))}
                <Button
                    onClick={() => {
                        setSearchQuery("");
                        rulesArray.push(makeEmptyRule());
                    }}
                    disabled={rulesArray.length > 0 && isEmptyRule(rulesArray[rulesArray.length - 1])}
                >
                    {s("addRule")}
                </Button>
            </div>
        </>
    );
}

function TextReplaceTesting() {
    const [value, setValue] = useState("");

    return (
        <div>
            <SubHeading>{s("tester")}</SubHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <TextInput placeholder={s("testInput")} value={value} onChange={setValue} />
                <TextInput placeholder={s("testOutput")} value={applyRules(value)} onChange={() => { }} readOnly />
            </div>
        </div>
    );
}

function applyRules(content: string): string {
    if (content.length === 0) return content;

    for (const rule of settings.store.stringRules as Rule[]) {
        if (!rule.find) continue;
        if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

        content = ` ${content} `.replaceAll(rule.find, rule.replace.replaceAll("\\n", "\n")).replace(/^\s|\s$/g, "");
    }

    for (const rule of settings.store.regexRules as Rule[]) {
        if (!rule.find) continue;
        if (rule.onlyIfIncludes && !content.includes(rule.onlyIfIncludes)) continue;

        try {
            content = content.replace(stringToRegex(rule.find), rule.replace.replaceAll("\\n", "\n"));
        } catch {
            logger.error(`Invalid regex: ${rule.find}`);
        }
    }

    return content.trim();
}

export default definePlugin({
    name: "TextReplace",
    description: "Replaces text in your messages with your own rules",
    authors: [{ name: "SnailyStudios" }],
    translations: {
        fr: {
            description: "Remplace du texte dans tes messages avec tes propres règles"
        }
    },
    settings,

    css: [
        ".majic-textreplace-input-grid { display: grid; grid-template-columns: max-content 1fr; gap: 0.25em 1em; align-items: center; }",
        ".majic-textreplace-label { color: var(--text-default); font-size: 14px; font-weight: 500; }",
        ".majic-textreplace-delete-button { width: 100%; margin-block: 0.75em 0.5em; }",
        ".majic-textreplace-drop-indicator { position: absolute; left: 0; right: 0; height: 2px; background: var(--majic-accent); border-radius: 1px; pointer-events: none; z-index: 1; }",
        ".majic-textreplace-search-input { margin-top: 8px; }"
    ].join(" "),

    start() {
        (settings.store.stringRules as Rule[]).forEach(normalizeRule);
        (settings.store.regexRules as Rule[]).forEach(normalizeRule);
    },

    onBeforeMessageSend(_channelId: string, message: { content: string }) {
        message.content = applyRules(message.content);
    }
});
