/*
 * Majic — global types
 */

import type { MajicNativeApi } from "../preload";

declare global {
    interface Window {
        MajicNative: MajicNativeApi;
        Majic: typeof import("./index");
    }
    const MajicNative: MajicNativeApi;
    const Majic: typeof import("./index");
}

export {};
