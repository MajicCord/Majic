/*
 * Majic — lazy values
 */

export function makeLazy<T>(factory: () => T, maxTries = 5): () => T {
    let value: T | undefined;
    let tries = 0;
    return () => {
        if (value == null && tries < maxTries) {
            tries++;
            value = factory();
            if (value == null && tries === maxTries) console.error("[Majic] Lazy value could not be resolved:", factory);
        }
        return value as T;
    };
}

export const LAZY_RESOLVE = Symbol.for("majic.lazy.resolve");

const FUNCTION_ONLY_KEYS = new Set<string>(["arguments", "caller", "prototype"]);

export function proxyLazy<T>(factory: () => T, maxTries = 5): T {
    const resolve = makeLazy(factory, maxTries);

    const target = () => {
        const value = resolve();
        if (value == null) throw new Error("[Majic] Lazy value is not available yet");
        return value as any;
    };

    return new Proxy(function () { } as any, {
        get(_, key) {
            if (key === LAZY_RESOLVE) return resolve;
            const value = resolve();
            if (value == null) return proxyLazy(() => (resolve() as any)?.[key], maxTries);
            return (value as any)[key];
        },
        set: (_, key, value) => Reflect.set(target(), key, value),
        has: (_, key) => key in target(),
        deleteProperty: (_, key) => Reflect.deleteProperty(target(), key),
        defineProperty: (_, key, descriptor) => Reflect.defineProperty(target(), key, descriptor),
        apply: (_, thisArg, args) => Reflect.apply(target(), thisArg, args),
        construct: (_, args) => Reflect.construct(target(), args),
        getPrototypeOf: () => Reflect.getPrototypeOf(target()),
        ownKeys: () => [...new Set<string | symbol>([...Reflect.ownKeys(target()), ...FUNCTION_ONLY_KEYS])],
        getOwnPropertyDescriptor(shell, key) {
            if (typeof key === "string" && FUNCTION_ONLY_KEYS.has(key)) return Reflect.getOwnPropertyDescriptor(shell, key);
            const descriptor = Reflect.getOwnPropertyDescriptor(target(), key);
            if (!descriptor) return undefined;
            const configurable = { ...descriptor, configurable: true };
            Object.defineProperty(shell, key, configurable);
            return configurable;
        }
    }) as T;
}
