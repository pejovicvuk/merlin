export function* map<A, B>(collection: Iterable<A>, func: (a: A) => B): Iterable<B> {
    for (const a of collection) {
        yield func(a);
    }
}

export function contains<T>(collection: Iterable<T>, val: T): boolean {
    for (const x of collection) {
        if (val === x) return true;
    }

    return false;
}

export function indexOfPair<T>(arr: readonly T[], first: T, second: T) {
    for (let idx = 0; idx < arr.length; idx += 2) {
        if (arr[idx] === first && arr[idx + 1] === second) return idx;
    }

    return -1;
}

export function indexOfTriplet<T>(arr: readonly T[], first: T, second: T, third: T) {
    for (let idx = 0; idx < arr.length; idx += 3) {
        if (arr[idx] === first && arr[idx + 1] === second && arr[idx + 2] === third) return idx;
    }

    return -1;
}

export function removePair<T>(arr: T[], first: T, second: T) {
    const idx = indexOfPair(arr, first, second);
    if (idx < 0) return;

    const lastIdx = arr.length - 2;
    arr[idx] = arr[lastIdx];
    arr[idx + 1] = arr[lastIdx + 1];
    arr.splice(lastIdx, 2);
}

export function sleepAsync(ms: number, signal?: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
            signal?.removeEventListener('abort', abortHandler);
            resolve();
        }, ms);

        const abortHandler = () => {
            clearTimeout(timeout);
            reject(signal);
        };

        signal?.addEventListener('abort', abortHandler);
    });
}

export class AsyncDemux<R> {
    readonly #ac: AbortController;
    readonly #waiters: { resolve: (arg: R) => any; reject: (reason: any) => any; signal?: AbortSignal }[] = [];
    readonly #done?: () => void;
    readonly #completed?: (result: R) => void;

    constructor(promise: Promise<R>, ac: AbortController, done?: () => void, completed?: (result: R) => void) {
        this.#ac = ac;
        this.#waitOnPromise(promise);
        this.#done = done;
        this.#completed = completed;
    }

    async #waitOnPromise(promise: Promise<R>) {
        try {
            const result = await promise;

            for (const { resolve, signal } of this.#waiters) {
                signal?.removeEventListener('abort', this.#onSignalAborted);
                try {
                    resolve(result);
                }
                catch(ex) {
                    console.error(ex);
                }
            }

            if (this.#waiters.length > 0) this.#completed?.(result);
        }
        catch(reason: any) {
            for (const { reject, signal } of this.#waiters) {
                signal?.removeEventListener('abort', this.#onSignalAborted);
                try {
                    reject(reason);
                }
                catch(ex) {
                    console.error(ex);
                }
            }
        }

        if (this.#waiters.length > 0) this.#done?.();
    }

    addCaller(signal?: AbortSignal): Promise<R> {
        if (signal?.aborted) return Promise.reject(signal);

        const ret = new Promise<R>((resolve, reject) => {
            if (signal?.aborted) {
                reject(signal);
            }
            else {
                this.#waiters.push({ resolve, reject, signal });
                signal?.addEventListener('abort', this.#onSignalAborted);
            }
        });

        return ret;
    }

    readonly #onSignalAborted = () => {
        const wait = this.#waiters;
        let len = wait.length;
        while(len-- > 0) {
            const { reject, signal } = wait[len];
            if (signal?.aborted) {
                wait[len] = wait[wait.length - 1];
                wait.pop()!
                reject(signal);
            }
        }

        if (wait.length === 0) {
            this.#done?.();
            this.#ac.abort();
        }
    }
}