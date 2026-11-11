/*
 * Majic — misc helpers
 */

import { useEffect, useMemo, useReducer, useState } from "@webpack/common";

export const IS_MAC = navigator.platform.toLowerCase().startsWith("mac");

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function useForceUpdater(): () => void {
    return useReducer((x: number) => x + 1, 0)[1] as () => void;
}

export function useTimer({ interval = 1000, deps = [] }: { interval?: number; deps?: unknown[] }) {
    const [time, setTime] = useState(0);
    const start = useMemo(() => Math.round(performance.now()), deps);

    useEffect(() => {
        const intervalId = setInterval(() => setTime(Math.round(performance.now()) - start), interval);
        return () => {
            setTime(0);
            clearInterval(intervalId);
        };
    }, deps);

    return time;
}

export function formatDuration(ms: number, human = false) {
    const DAY = 86_400_000;
    const HOUR = 3_600_000;
    const MINUTE = 60_000;

    const days = Math.floor(ms / DAY);
    const hours = Math.floor((ms % DAY) / HOUR);
    const minutes = Math.floor((ms % HOUR) / MINUTE);
    const seconds = Math.floor((ms % MINUTE) / 1000);

    const pad = (n: number) => human ? String(n) : n.toString().padStart(2, "0");
    const unit = (suffix: string) => human ? suffix : "";

    const showDays = days !== 0;
    const showHours = showDays || hours !== 0;
    const showMinutes = showHours || minutes !== 0 || !human;

    const duration = [
        showHours && `${pad(hours)}${unit("h")}`,
        showMinutes && `${pad(minutes)}${unit("m")}`,
        `${pad(seconds)}${unit("s")}`
    ].filter(Boolean).join(human ? " " : ":");

    return (showDays ? `${days}d ` : "") + duration;
}

export class Queue {
    private readonly queue: Array<() => unknown> = [];
    private promise?: Promise<unknown>;

    constructor(public readonly maxSize = Infinity) { }

    private next() {
        const task = this.queue.shift();
        this.promise = task ? Promise.resolve().then(task).finally(() => this.next()) : undefined;
    }

    private run() {
        if (!this.promise) this.next();
    }

    push(task: () => unknown) {
        if (this.size >= this.maxSize) this.queue.shift();
        this.queue.push(task);
        this.run();
    }

    unshift(task: () => unknown) {
        if (this.size >= this.maxSize) this.queue.pop();
        this.queue.unshift(task);
        this.run();
    }

    get size() {
        return this.queue.length;
    }
}

export const classes = (...names: Array<string | false | null | undefined>) => names.filter(Boolean).join(" ");

export type AwaiterResult<T> = [value: T, error: unknown, pending: boolean];

export function useAwaiter<T>(factory: () => Promise<T>, options: { fallbackValue: T; deps?: unknown[]; onError?(error: unknown): void; onSuccess?(value: T): void }): AwaiterResult<T> {
    const [state, setState] = useState({ value: options.fallbackValue, error: null as unknown, pending: true });

    useEffect(() => {
        let isAlive = true;
        if (!state.pending) setState({ ...state, pending: true });

        factory()
            .then(value => {
                if (!isAlive) return;
                setState({ value, error: null, pending: false });
                options.onSuccess?.(value);
            })
            .catch(error => {
                if (!isAlive) return;
                setState({ value: options.fallbackValue, error, pending: false });
                options.onError?.(error);
            });

        return () => void (isAlive = false);
    }, options.deps ?? []);

    return [state.value, state.error, state.pending];
}
