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

