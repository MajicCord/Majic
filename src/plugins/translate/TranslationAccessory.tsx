/*
 * Majic — Translate message accessory
 */

import { Parser, React, useEffect, useState } from "@webpack/common";

import { s } from "./strings";
import { TranslateIcon } from "./TranslateIcon";
import { cl, type TranslationValue } from "./utils";

interface TranslationSetter {
    messageId: string;
    handleTranslation(value: TranslationValue): void;
}

const TranslationSetters = new Set<TranslationSetter>();

export function handleTranslate(messageId: string, data: TranslationValue) {
    for (const setter of TranslationSetters) {
        if (setter.messageId === messageId) setter.handleTranslation(data);
    }
}

function Dismiss({ onDismiss }: { onDismiss: () => void }) {
    return (
        <button onClick={onDismiss} className={cl("dismiss")}>
            {s("dismiss")}
        </button>
    );
}

export function TranslationAccessory({ message }: { message: any }) {
    const [translation, setTranslation] = useState<TranslationValue>();

    useEffect(() => {
        if (message.majicEmbeddedBy) return;

        const setter: TranslationSetter = {
            messageId: message.id,
            handleTranslation: setTranslation
        };

        TranslationSetters.add(setter);
        return () => void TranslationSetters.delete(setter);
    }, []);

    if (!translation) return null;

    return (
        <span className={cl("accessory")}>
            <TranslateIcon width={16} height={16} className={cl("accessory-icon")} />
            {Parser.parse(translation.text)}
            <br />
            ({s("translatedFrom", { language: translation.sourceLanguage })} - <Dismiss onDismiss={() => setTranslation(undefined)} />)
        </span>
    );
}
