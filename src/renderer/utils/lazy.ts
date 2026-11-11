/*
 * Majic — lazy values
 */

export function makeLazy<T>(factory: () => T): () => T {
    let cache: T | undefined;
    return () => (cache ??= factory());
}

export function proxyLazy<T extends object>(factory: () => T | undefined, errorMessage: () => string): T {
    let cache: T | undefined;
    const get = () => {
        cache ??= factory();
        if (cache == null) throw new Error(errorMessage());
        return cache;
    };

    return new Proxy(function () { } as unknown as T, {
        get: (_, key) => Reflect.get(get(), key),
        set: (_, key, value) => Reflect.set(get(), key, value),
        has: (_, key) => Reflect.has(get(), key),
        apply: (_, thisArg, args) => Reflect.apply(get() as any, thisArg, args),
        construct: (_, args, newTarget) => Reflect.construct(get() as any, args, newTarget === _ ? get() as any : newTarget)
    });
}
