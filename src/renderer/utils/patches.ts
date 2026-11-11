/*
 * Majic — patch canonicalization
 */

import { runtimeHashMessageKey } from "./intlHash";
import type { PatchReplacement } from "./types";

const INTL_TOKEN = /#{intl::([\w$+/]*)(?:::(raw))?}/g;
const IDENTIFIER_TOKEN = /(?<!\\)((?:\\\\)*)\\i/g;
const IDENTIFIER = "(?:[A-Za-z_$][\\w$]*)";

const escapeForRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function intlAccessor(key: string, raw: boolean) {
    const hash = raw ? key : runtimeHashMessageKey(key);
    return /^\d|[+/]/.test(hash) ? `["${hash}"]` : `.${hash}`;
}

export function canonicalizeMatch<T extends string | RegExp>(match: T): T {
    if (typeof match === "string") {
        return match.replace(INTL_TOKEN, (_, key, raw) => intlAccessor(key, Boolean(raw))) as T;
    }

    const source = match.source
        .replace(INTL_TOKEN, (_, key, raw) => `(?:${escapeForRegex(intlAccessor(key, Boolean(raw)))})`)
        .replace(IDENTIFIER_TOKEN, (_, escapes) => escapes + IDENTIFIER);

    const canonical = new RegExp(source, match.flags);
    canonical.toString = () => match.toString();
    return canonical as T;
}

export function canonicalizeReplace(replace: PatchReplacement["replace"], pluginName: string): PatchReplacement["replace"] {
    const self = `Majic.Plugins.plugins[${JSON.stringify(pluginName)}]`;
    const inject = (code: string) => code.replaceAll("$self", self);
    return typeof replace === "function" ? (...args) => inject(replace(...args)) : inject(replace);
}

export function canonicalizeReplacement(replacement: PatchReplacement, pluginName: string): PatchReplacement {
    return {
        ...replacement,
        match: canonicalizeMatch(replacement.match),
        replace: canonicalizeReplace(replacement.replace, pluginName)
    };
}
