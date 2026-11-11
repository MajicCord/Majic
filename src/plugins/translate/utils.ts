/*
 * Majic — Translate utils
 */

import type { PluginNative } from "@utils/types";
import { showToast } from "@webpack/common";

import { DeeplLanguages, deeplLanguageToGoogleLanguage, GoogleLanguages, KagiLanguages } from "./languages";
import { resetLanguageDefaults, settings } from "./settings";
import { s } from "./strings";

export const cl = (...names: Array<string | Record<string, boolean>>) => names
    .flatMap(name => typeof name === "string" ? [name] : Object.entries(name).filter(([, on]) => on).map(([key]) => key))
    .map(name => `majic-trans-${name}`)
    .join(" ");

const Native = MajicNative.pluginHelpers.Translate as PluginNative<typeof import("./native")>;

interface GoogleData {
    translation: string;
    sourceLanguage: string;
}

interface DeeplData {
    translations: {
        detected_source_language: string;
        text: string;
    }[];
}

interface KagiData {
    translation: string;
    detected_language: {
        label: string;
    };
}

export interface TranslationValue {
    sourceLanguage: string;
    text: string;
}

function onlyOnce<F extends (...args: any[]) => any>(fn: F) {
    let called = false;
    return (...args: Parameters<F>) => {
        if (called) return;
        called = true;
        return fn(...args);
    };
}

export const getLanguages = (): Record<string, string> => {
    switch (settings.store.service) {
        case "google":
            return GoogleLanguages;
        case "kagi":
            return KagiLanguages;
        default:
            return DeeplLanguages;
    }
};

export async function translate(kind: "received" | "sent", text: string): Promise<TranslationValue> {
    const translator = (() => {
        switch (settings.store.service) {
            case "google":
                return googleTranslate;
            case "kagi":
                return kagiTranslate;
            default:
                return deeplTranslate;
        }
    })();

    try {
        return await translator(
            text,
            settings.store[`${kind}Input`],
            settings.store[`${kind}Output`]
        );
    } catch (err) {
        const userMessage = typeof err === "string" ? err : s("genericError");

        showToast({ text: userMessage, variant: "critical" });

        throw err instanceof Error ? err : new Error(userMessage);
    }
}

async function googleTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    const url = "https://translate-pa.googleapis.com/v1/translate?" + new URLSearchParams({
        "params.client": "gtx",
        "dataTypes": "TRANSLATION",
        "key": "AIzaSyDLEeFI5OtFBwYBIoK_jj5m32rZK5CkCXA",
        "query.sourceLanguage": sourceLang,
        "query.targetLanguage": targetLang,
        "query.text": text
    });

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(
            `Failed to translate "${text}" (${sourceLang} -> ${targetLang})`
            + `\n${res.status} ${res.statusText}`
        );
    }

    const { sourceLanguage, translation }: GoogleData = await res.json();

    return {
        sourceLanguage: (GoogleLanguages as Record<string, string>)[sourceLanguage] ?? sourceLanguage,
        text: translation
    };
}

function fallbackToGoogle(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    return googleTranslate(
        text,
        deeplLanguageToGoogleLanguage(sourceLang),
        deeplLanguageToGoogleLanguage(targetLang)
    );
}

const showDeeplApiQuotaToast = onlyOnce(() => showToast({ text: s("deeplQuota"), variant: "critical" }));

async function deeplTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    if (!settings.store.deeplApiKey) {
        showToast({ text: s("deeplNoKey"), variant: "critical" });

        settings.store.service = "google";
        resetLanguageDefaults();

        return fallbackToGoogle(text, sourceLang, targetLang);
    }

    const { status, data } = await Native.makeDeeplTranslateRequest(
        settings.store.service === "deepl-pro",
        settings.store.deeplApiKey,
        JSON.stringify({
            text: [text],
            target_lang: targetLang,
            source_lang: sourceLang.split("-")[0]
        })
    );

    switch (status) {
        case 200:
            break;
        case -1:
            throw s("deeplConnect", { error: data });
        case 403:
            throw s("deeplInvalid");
        case 456:
            showDeeplApiQuotaToast();
            return fallbackToGoogle(text, sourceLang, targetLang);
        default:
            throw new Error(`Failed to translate "${text}" (${sourceLang} -> ${targetLang})\n${status} ${data}`);
    }

    const { translations }: DeeplData = JSON.parse(data);
    const src = translations[0].detected_source_language;

    return {
        sourceLanguage: (DeeplLanguages as Record<string, string>)[src] ?? src,
        text: translations[0].text
    };
}

async function kagiTranslate(text: string, sourceLang: string, targetLang: string): Promise<TranslationValue> {
    const { status, data } = await Native.makeKagiTranslateRequest(settings.store.kagiSession, text, sourceLang, targetLang);

    switch (status) {
        case 200:
            break;
        case 401:
            throw s("kagiInvalid");
        default:
            throw new Error(`Failed to translate "${text}" (${sourceLang} -> ${targetLang})\n${status} ${data}`);
    }

    const { detected_language, translation }: KagiData = data;

    return {
        sourceLanguage: detected_language.label,
        text: translation
    };
}
