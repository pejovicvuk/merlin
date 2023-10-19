function sleepAsync(timeout: number) {
    return new Promise<void> (resolve => 
        setTimeout(() => resolve(), timeout)
    );
}

export function waitForBrowser() {
    return sleepAsync(100);
}

let nextControlId = 0;

export function createNewElementName() {
    return 'control-' + nextControlId++;
}
