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

