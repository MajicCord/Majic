/*
 * Majic — patch canonicalization
 * Adapted from Vencord, GPL-3.0-or-later
 */

import { runtimeHashMessageKey } from "./intlHash";
import type { PatchReplacement } from "./types";

const IDENTIFIER = String.raw`(?:[A-Za-z_$][\w$]*)`;

export function canonicalizeMatch<T extends string | RegExp>(match: T): T {
    const isString = typeof match === "string";
    let source = isString ? match : match.source;

    source = source.replaceAll(/#{intl::([\w$+/]*)(?:::(\w+))?}/g, (_, key: string, modifier?: string) => {
        const hashed = modifier === "raw" ? key : runtimeHashMessageKey(key);
        const needsBrackets = !Number.isNaN(Number(hashed[0])) || hashed.includes("+") || hashed.includes("/");

        if (needsBrackets) {
            return isString ? `["${hashed}"]` : String.raw`(?:\["${hashed}"\])`.replaceAll("+", "\\+");
        }
        return isString ? `.${hashed}` : String.raw`(?:\.${hashed})`;
    });

    if (isString) return source as T;

    source = source.replaceAll(/(\\*)\\i/g, (m, escapes: string) =>
        escapes.length % 2 === 0 ? `${escapes}${IDENTIFIER}` : m.slice(1)
    );

    const regex = new RegExp(source, match.flags);
    regex.toString = match.toString.bind(match);
    return regex as T;
}

export function canonicalizeReplace(replace: PatchReplacement["replace"], pluginName: string): PatchReplacement["replace"] {
    const self = `Majic.Plugins.plugins[${JSON.stringify(pluginName)}]`;

    if (typeof replace === "function") {
        return (...args) => replace(...args).replaceAll("$self", self);
    }
    return replace.replaceAll("$self", self);
}

export function canonicalizeReplacement(replacement: PatchReplacement, pluginName: string): PatchReplacement {
    return {
        ...replacement,
        match: canonicalizeMatch(replacement.match),
        replace: canonicalizeReplace(replacement.replace, pluginName)
    };
}
