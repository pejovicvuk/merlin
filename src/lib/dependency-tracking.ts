import { indexOfPair, indexOfTriplet } from "./algorithms";

export interface IChangeTracker {
    addListener<T>(handler: IChangeListener<T>, key: any, token: T): void;
    removeListener<T>(handler: IChangeListener<T>, key: any, token: T): void;
}

export interface IChangeListener<T> {
    onChanged(token: T): void;
}

let accessDependencies: undefined | (any[]);
let accessDependenciesExistingStart = 0;
let accessDependenciesExistingEnd = 0;

// accessDependencies starts with a list of pairs (key, tracker) stored pairwise
// into even and odd indices. Initially accessDependenciesExistingStart and accessDependenciesExistingEnd
// are both stored to accessDependencies.length.
//
// Calls to registerAccess will, if the dependency is not stored in accessDependencies, simply add it there,
// while if it does it will move it to accessDependenciesExistingStart - 2 and then decrement accessDependenciesExistingStart
// by two

export function registerAccess (tracker: IChangeTracker, key: any): void {
    if (accessDependencies === undefined) return;

    const idx = indexOfPair(accessDependencies, key, tracker);
    if (idx < 0) {
        accessDependencies.push(key, tracker);
    }
    else if (idx < accessDependenciesExistingStart) { // otherwise already handled by previous calls to this function
        accessDependenciesExistingStart -= 2;
        accessDependencies[idx] = accessDependencies[accessDependenciesExistingStart];
        accessDependencies[idx + 1] = accessDependencies[accessDependenciesExistingStart + 1];
        accessDependencies[accessDependenciesExistingStart] = key;
        accessDependencies[accessDependenciesExistingStart + 1] = tracker;
    }
}

function reconcileAccessDependencies(listener: IChangeListener<any>, token: any) {
    for (let x = 0; x < accessDependenciesExistingStart; ) {
        const key = accessDependencies![x++];
        const tracker = accessDependencies![x++] as IChangeTracker;
        tracker.removeListener(listener, key, token);
    }

    for (let x = accessDependenciesExistingEnd; x < accessDependencies!.length; ) {
        const key = accessDependencies![x++];
        const tracker = accessDependencies![x++] as IChangeTracker;
        tracker.addListener(listener, key, token);
    }

    if (accessDependencies!.length - accessDependenciesExistingStart < accessDependenciesExistingStart) {
        accessDependencies!.splice(0, accessDependenciesExistingStart);
    }
    else {
        accessDependencies!.copyWithin(0, accessDependencies!.length - accessDependenciesExistingStart);
        accessDependencies!.splice(accessDependencies!.length - accessDependenciesExistingStart, accessDependenciesExistingStart);
    }
}

class ChainedSet<T> extends Set<T> {
    constructor(private readonly parent?: ChainedSet<T>) {
        super();
    }

    contains(val: T): boolean {
        let x: ChainedSet<T> | undefined = this;
        do {
            if (x.has(val)) return true;
            x = x.parent;
        }
        while(x !== undefined);
        return false;
    }
}

const protoToGettersAndSetters = new Map<object, { readonly getters: ChainedSet<string | symbol> | undefined; readonly setters: ChainedSet<string | symbol> | undefined ; }> ();

function createGettersAndSetters(proto: object): { readonly getters: ChainedSet<string | symbol> | undefined; readonly setters: ChainedSet<string | symbol> | undefined; } {
    const parentProto = Object.getPrototypeOf(proto);
    const parent = parentProto === null ? undefined :
        protoToGettersAndSetters.get(parentProto) ?? createGettersAndSetters(parentProto);

    let getters: ChainedSet<string | symbol> | undefined = undefined;
    let setters: ChainedSet<string | symbol> | undefined = undefined;

    const map = Object.getOwnPropertyDescriptors(proto);
    
    for (const name of Object.getOwnPropertyNames(map)) {
        const desc = map[name];
        if (desc.get !== undefined) {
            if (getters === undefined) getters = new ChainedSet(parent?.getters);
            getters.add(name);
        }
        if (desc.set !== undefined) {
            if (setters === undefined) setters = new ChainedSet(parent?.setters);
            setters.add(name);
        }
    }
    for (const sym of Object.getOwnPropertySymbols(map)) {
        const desc = (map as any)[sym];
        if (desc.get !== undefined) {
            if (getters === undefined) getters = new ChainedSet(parent?.getters);
            getters.add(sym);
        }
        if (desc.set !== undefined) {
            if (setters === undefined) setters = new ChainedSet(parent?.setters);
            setters.add(sym);
        }
    }

    const ret = { getters: getters ?? parent?.getters, setters: setters ?? parent?.setters };
    protoToGettersAndSetters.set(proto, ret);

    return ret;
}

function isGetter(obj: object, prop: string | symbol): boolean {
    const proto = Object.getPrototypeOf(obj);
    if (proto === null) return false;

    const lookup = protoToGettersAndSetters.get(proto)!;
    return lookup.getters?.contains(prop) ?? false;
}

function isSetter(obj: object, prop: string | symbol): boolean {
    const proto = Object.getPrototypeOf(obj);
    if (proto === null) return false;

    const lookup = protoToGettersAndSetters.get(proto)!;
    return lookup.setters?.contains(prop) ?? false;;
}

const trackingProxyHandlerSymbol = Symbol("TrackingProxyHandler");

export const hasListeners: unique symbol = Symbol("hasListeners");

class TrackingProxyHandler<T extends object & { [hasListeners]?: boolean; }> implements ProxyHandler<T>, IChangeTracker {
    #listeners?: (string | symbol | IChangeListener<any>) []; // we pack listeners in pairs for efficiency, first the key and then the object
    #target: T;

    constructor(target: T) {
        this.#target = target;

        const proto = Object.getPrototypeOf(target);
        if (proto !== null) {
            if (!protoToGettersAndSetters.has(proto)) createGettersAndSetters(proto);
        }
    }

    #notifyListeners(key: string | symbol) {
        if (this.#listeners === undefined) return;
        for (let x = 0; x < this.#listeners.length; x += 3) {
            const k = this.#listeners[x];
            if (k === key) {
                const handler = this.#listeners[x + 1] as IChangeListener<any>;
                const token = this.#listeners[x + 2];
                handler.onChanged(token);
            }
        }
    }

    addListener<T>(handler: IChangeListener<T>, key: any, token: any) {
        const noListeners = this.#listeners === undefined || this.#listeners.length === 0;

        this.#listeners ??= [];
        this.#listeners.push(key, handler, token);

        if (noListeners) this.#target[hasListeners] = true;
    }

    removeListener<T>(handler: IChangeListener<T>, key: any, token: any) {
        const listeners = this.#listeners;
        if (listeners === undefined) return;

        const idx = indexOfTriplet(listeners, key, handler, token);
        if (idx < 0) return;

        const lastIdx = listeners.length - 3;
        listeners[idx] = listeners[lastIdx];
        listeners[idx + 1] = listeners[lastIdx + 1];
        listeners[idx + 2] = listeners[lastIdx + 2];
        listeners.splice(lastIdx, 3);

        if (listeners.length === 0) this.#target[hasListeners] = false;
    }

    get(target: T, property: string | symbol, receiver: any): any {
        if (property === trackingProxyHandlerSymbol) return this;

        if (!isGetter(target, property)) {
            registerAccess?.(this, property);
        }
        return Reflect.get(target, property, receiver);
    }

    set(target: T, property: string | symbol, newValue: any, receiver: any): boolean {
        if (isSetter(target, property)) {
            return Reflect.set(target, property, newValue, receiver);
        }
        else {
            const changed = Reflect.get(target, property, receiver) === newValue;
            const ret = Reflect.set(target, property, newValue, receiver);
            if (ret && changed) this.#notifyListeners(property);
            return ret;
        }
    }

    deleteProperty(target: T, property: string | symbol): boolean {
        const ret = Reflect.deleteProperty(target, property);
        if (ret) this.#notifyListeners(property);
        return ret;
    }

    defineProperty(target: T, property: string | symbol, attributes: PropertyDescriptor): boolean {
        const ret = Reflect.defineProperty(target, property, attributes);
        if (ret) this.#notifyListeners(property);
        return ret;
    }
}

export function toTracked<T extends object & { [hasListeners]?: boolean; }>(obj: T) {
    return new Proxy(obj, new TrackingProxyHandler<T>(obj));
}

const dependencyChain: (any[] | number | undefined)[] = [];

export function startEvalScope(dependencies: any[]) {
    dependencyChain.push(accessDependencies);
    dependencyChain.push(accessDependenciesExistingStart);
    dependencyChain.push(accessDependenciesExistingEnd);

    accessDependencies = dependencies;
    accessDependenciesExistingStart = accessDependenciesExistingEnd = dependencies.length;
}

export function evalTrackedScoped(s: string, thisArg: any,) {
    const func = Function("self", "window", "globals", "console", "top", `"use strict";return (${s});`);
    return func.apply(thisArg);
}

export function endEvalScope<T>(listener: IChangeListener<T>, token: T) {
    reconcileAccessDependencies(listener, token);

    accessDependenciesExistingEnd = dependencyChain.pop() as number;
    accessDependenciesExistingStart = dependencyChain.pop() as number;
    accessDependencies = dependencyChain.pop() as undefined | any[];
}

export function evalTracked<T>(s: string, thisArg: any, listener: IChangeListener<T>, token: T, dependencies: any[]) {
    const prevDependencies = accessDependencies;
    const prevStart = accessDependenciesExistingStart;
    const prevEnd = accessDependenciesExistingEnd;

    accessDependencies = dependencies;
    accessDependenciesExistingStart = accessDependenciesExistingEnd = dependencies.length;

    try {
        const func = Function("self", "window", "globals", "console", "top", `"use strict";return (${s});`);
        return func.apply(thisArg);
    }
    finally {
        reconcileAccessDependencies(listener, token);

        accessDependencies = prevDependencies;
        accessDependenciesExistingStart = prevStart;
        accessDependenciesExistingEnd = prevEnd;
    }
}

export function clearDependencies<T>(listener: IChangeListener<T>, token: T, dependencies: any[]) {
    for (let x = 0; x < dependencies.length; x += 2) {
        const key = dependencies[x];
        const tracker = dependencies[x + 1] as IChangeTracker;
        tracker.removeListener(listener, key, token);
    }
}
