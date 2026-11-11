/*
 * Majic — misc helpers
 */

import { useReducer } from "@webpack/common";

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export function useForceUpdater(): () => void {
    return useReducer((x: number) => x + 1, 0)[1] as () => void;
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
