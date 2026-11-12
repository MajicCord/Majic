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
    const IS_DEV: boolean;
    const IS_REPORTER: boolean;
    const Majic: typeof import("./index");
}

export {};
