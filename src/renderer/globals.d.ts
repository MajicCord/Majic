/*
 * Majic — global types
 */

import type { MajicNativeApi } from "../preload";

declare global {
    interface Window {
        MajicNative: MajicNativeApi;
        Majic: typeof import("./index");
        webpackChunkdiscord_app: unknown[];
    }
    const MajicNative: MajicNativeApi;
}

export {};
