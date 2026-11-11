/*
 * Majic — VoiceMessages utils
 */

import { FluxDispatcher, useEffect, useRef } from "@webpack/common";

export const cl = (...names: Array<string | string[]>) => names.flat().map(name => `majic-vmsg-${name}`).join(" ");

export function useFluxSubscription(event: string, callback: (...args: any[]) => void) {
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        const handler = (...args: any[]) => callbackRef.current(...args);
        FluxDispatcher.subscribe(event, handler);
        return () => FluxDispatcher.unsubscribe(event, handler);
    }, [event]);
}

export function chooseFile(mimeTypes: string) {
    return new Promise<File | null>(resolve => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        input.accept = mimeTypes;
        input.onchange = () => resolve(input.files?.[0] ?? null);

        document.body.appendChild(input);
        input.click();
        setTimeout(() => document.body.removeChild(input), 0);
    });
}
