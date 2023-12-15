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

export function indexOfPair<T>(arr: readonly T[], first: T, second: T, start = 0) {
    for (let idx = 0; idx < arr.length; idx += 2) {
        if (arr[idx] === first && arr[idx + 1] === second) return idx;
    }

    return -1;
}

export function indexOfTriplet<T>(arr: readonly T[], first: T, second: T, third: T, start = 0) {
    for (let idx = 0; idx < arr.length; idx += 3) {
        if (arr[idx] === first && arr[idx + 1] === second && arr[idx + 2] === third) return idx;
    }

    return -1;
}

