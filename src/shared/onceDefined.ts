/*
 * Majic — onceDefined helper
 */

export function onceDefined<T extends object>(target: T, property: PropertyKey, callback: (value: any) => void) {
    const obj = target as Record<PropertyKey, unknown>;

    if (property in obj) {
        callback(obj[property]);
        return;
    }

    Object.defineProperty(obj, property, {
        configurable: true,
        enumerable: false,
        set(value) {
            delete obj[property];
            obj[property] = value;
            callback(value);
        }
    });
}
