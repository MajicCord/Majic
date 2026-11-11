/*
 * Majic — persistent key/value storage backed by IndexedDB
 */

export interface Store {
    get<T = unknown>(key: IDBValidKey): Promise<T | undefined>;
    set(key: IDBValidKey, value: unknown): Promise<void>;
    update<T = unknown>(key: IDBValidKey, updater: (old: T | undefined) => T): Promise<T>;
    delete(key: IDBValidKey): Promise<void>;
    keys(): Promise<IDBValidKey[]>;
    entries<T = unknown>(): Promise<Array<[IDBValidKey, T]>>;
    clear(): Promise<void>;
}

const asPromise = <T>(request: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

const transactionDone = (transaction: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });

export function createStore(databaseName: string, storeName = "store"): Store {
    let database: Promise<IDBDatabase> | undefined;

    const open = () => {
        database ??= (() => {
            const request = indexedDB.open(databaseName);
            request.onupgradeneeded = () => request.result.createObjectStore(storeName);
            return asPromise(request);
        })();
        return database;
    };

    const run = async <T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T> | void) => {
        const transaction = (await open()).transaction(storeName, mode);
        const request = action(transaction.objectStore(storeName));
        const [result] = await Promise.all([request ? asPromise(request) : undefined, transactionDone(transaction)]);
        return result as T;
    };

    return {
        get: key => run("readonly", store => store.get(key)),
        set: (key, value) => run("readwrite", store => void store.put(value, key)),
        delete: key => run("readwrite", store => void store.delete(key)),
        keys: () => run("readonly", store => store.getAllKeys()),
        clear: () => run("readwrite", store => void store.clear()),
        async entries<T>() {
            const [keys, values] = await Promise.all([
                run<IDBValidKey[]>("readonly", store => store.getAllKeys()),
                run<T[]>("readonly", store => store.getAll())
            ]);
            return keys.map((key, i) => [key, values[i]] as [IDBValidKey, T]);
        },
        async update<T>(key: IDBValidKey, updater: (old: T | undefined) => T) {
            const value = updater(await run<T | undefined>("readonly", store => store.get(key)));
            await run("readwrite", store => void store.put(value, key));
            return value;
        }
    };
}

export const DataStore = createStore("MajicData");
