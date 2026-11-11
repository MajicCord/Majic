/*
 * Majic — ImageZoom waitFor
 */

export function waitFor(condition: () => boolean, cb: () => void) {
    if (condition()) cb();
    else requestAnimationFrame(() => waitFor(condition, cb));
}

export function debounce<T extends (...args: any[]) => void>(func: T, delay = 300): T {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    }) as T;
}
