/*
 * Majic — lazy values
 */

export function makeLazy<T>(factory: () => T, maxTries = 5): () => T {
    let value: T | undefined;
    let tries = 0;
    return () => {
        if (value === undefined && tries < maxTries) {
            tries++;
            value = factory();
            if (value === undefined && tries === maxTries) console.error("[Majic] Lazy value could not be resolved:", factory);
        }
        return value as T;
    };
}

export const LAZY_RESOLVE = Symbol.for("majic.lazy.resolve");
export const LAZY_CACHED = Symbol.for("majic.lazy.cached");

const FUNCTION_ONLY_KEYS = ["arguments", "caller", "prototype"];

const handler: ProxyHandler<any> = {};

for (const trap of ["apply", "construct", "defineProperty", "deleteProperty", "getPrototypeOf", "has", "isExtensible", "preventExtensions", "set", "setPrototypeOf"] as const) {
    (handler as any)[trap] = (target: any, ...args: any[]) => (Reflect as any)[trap](target[LAZY_RESOLVE](), ...args);
}

handler.ownKeys = target => {
    const keys = Reflect.ownKeys(target[LAZY_RESOLVE]());
    for (const key of FUNCTION_ONLY_KEYS) if (!keys.includes(key)) keys.push(key);
    return keys;
};

handler.getOwnPropertyDescriptor = (target, key) => {
    if (typeof key === "string" && FUNCTION_ONLY_KEYS.includes(key)) return Reflect.getOwnPropertyDescriptor(target, key);
    const descriptor = Reflect.getOwnPropertyDescriptor(target[LAZY_RESOLVE](), key);
    if (descriptor) Object.defineProperty(target, key, descriptor);
    return descriptor;
};

export function proxyLazy<T>(factory: () => T, maxTries = 5, isChild = false): T {
    let isSameTick = true;
    if (!isChild) setTimeout(() => isSameTick = false, 0);

    let tries = 0;
    const shell = Object.assign(function () { }, {
        [LAZY_CACHED]: undefined as T | undefined,
        [LAZY_RESOLVE]() {
            if (!shell[LAZY_CACHED] && tries < maxTries) {
                tries++;
                shell[LAZY_CACHED] = factory();
                if (!shell[LAZY_CACHED] && tries === maxTries) console.error("[Majic] Lazy value could not be resolved:", factory);
            }
            return shell[LAZY_CACHED];
        }
    });

    return new Proxy(shell, {
        ...handler,
        get(target, key, receiver) {
            if (key === LAZY_CACHED || key === LAZY_RESOLVE) return Reflect.get(target, key, receiver);

            if (!isChild && isSameTick) {
                return proxyLazy(() => Reflect.get(target[LAZY_RESOLVE]() as object, key, receiver), maxTries, true);
            }

            const value = target[LAZY_RESOLVE]();
            if (typeof value === "object" || typeof value === "function") return Reflect.get(value, key, receiver);
            throw new Error("[Majic] proxyLazy was used on a primitive value");
        }
    }) as T;
}
