import { indexOfTriplet } from "./algorithms";
import { IChangeListener, IChangeTracker, clearDependencies, evalTracked } from "./dependency-tracking";
import { HtmlControlCore } from "./html-control-core";

function stringToDashedLowercase(s: string) {
    return '-' + s.toLowerCase();
}

function camelToDash(s: string) {
    return s.replace(/([A-Z])/g, stringToDashedLowercase);
}

function dashedLowerCaseToPascal(s: string) {
    return s.substring(1).toUpperCase();
}

function dashToCamel(s: string){
    return s.replace(/(\-[a-z])/g, dashedLowerCaseToPascal);
}

const undefinedPlaceholder = {};

export class HtmlControl extends HtmlControlCore implements IChangeTracker, IChangeListener<string> {
    #bindingDependencies?: Map<string, any[]>; // for each binding the array of dependencies obtained using evalTracked. the key is the attribute name, not the camel-cased property name
    #bindingValues?: Map<string, any>;
    #bindingExceptions?: Map<string, any>;
    #listeners?: any []; // we pack listeners in triples for efficiency, (key, listener, token)

    protected static bindableProperties?: readonly string[];

    protected override onConnectedToDom(): void {
        super.onConnectedToDom();

        const ctor = this.constructor as Function & { bindableProperties?: readonly string[] };
        if (ctor.bindableProperties !== undefined) {
            if (this.#bindingDependencies === undefined) this.#bindingDependencies = new Map();

            for (const prop of ctor.bindableProperties) {
                this.#bindingDependencies.set(prop, []);
                this.setBindingAsDirty(prop);
            }
        }
    }

    protected override onDisconnectedFromDom(): void {
        super.onDisconnectedFromDom();

        if (this.#bindingDependencies !== undefined) {
            for (const [prop, dependencies] of this.#bindingDependencies.entries()) {
                clearDependencies(this, prop, dependencies);
            }
        }

        this.#bindingDependencies = undefined;

        const ctor = this.constructor as Function & { bindableProperties?: readonly string[] };
        if (ctor.bindableProperties !== undefined) {
            for (const prop of ctor.bindableProperties) {
                this.setBindingAsDirty(prop);
            }
        }
    }

    protected evaluateBinding(name: string) {
        if (!this.isPartOfDom) return undefined;

        const maybeVal = this.#bindingValues?.get(name)
        if (maybeVal !== undefined) return maybeVal !== undefinedPlaceholder ? maybeVal : undefined;

        const maybeEx = this.#bindingExceptions?.get(name);
        if (maybeEx !== undefined) throw maybeEx;

        const attr = this.getAttribute(camelToDash(name));
        if (attr === null) {
            if (this.#bindingValues === undefined) this.#bindingValues = new Map();
            this.#bindingValues.set(name, undefinedPlaceholder);
            return undefined;
        }

        const dependencies = this.#bindingDependencies!.get(name)!;
        try {
            const val = evalTracked(attr, undefined, this, name, dependencies);
            this.#bindingExceptions?.delete(name);
            if (this.#bindingValues === undefined) this.#bindingValues = new Map();
            this.#bindingValues.set(name, val === undefined ? undefinedPlaceholder : undefined);
            return val;
        }
        catch(ex) {
            this.#bindingValues?.delete(name);
            if (this.#bindingExceptions === undefined) this.#bindingExceptions = new Map();
            this.#bindingExceptions.set(name, ex);
            throw ex;
        }
    }

    protected setBindingAsDirty(name: string) {
        if (!this.#bindingValues?.has(name) && !this.#bindingExceptions?.has(name)) return;

        this.#bindingValues?.delete(name);
        this.#bindingExceptions?.delete(name);

        if (this.#listeners === undefined) return;

        for (let x = 0; x < this.#listeners.length; x += 3) {
            const k = this.#listeners[x];
            if (k === name) {
                const handler = this.#listeners[x + 1] as IChangeListener<any>;
                const token = this.#listeners[x + 2];
                handler.onChanged(token);
            }
        }
    }

    addListener<T>(handler: IChangeListener<T>, key: any, token: T) {
        if (this.#listeners === undefined) this.#listeners = [];
        this.#listeners.push(key, handler, token);
    }

    removeListener<T>(handler: IChangeListener<T>, key: any, token: T) {
        const listeners = this.#listeners;
        if (listeners === undefined) return;

        const idx = indexOfTriplet(listeners, key, handler, token);
        if (idx < 0) return;

        const lastIdx = listeners.length - 3;
 
        listeners[idx] = listeners[lastIdx];
        listeners[idx + 1] = listeners[lastIdx + 1];
        listeners[idx + 2] = listeners[lastIdx + 2];
 
        listeners.splice(lastIdx, 3);
    }

    onChanged(name: string): void {
        this.setBindingAsDirty(name);
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        super.attributeChangedCallback(name, oldValue, newValue);

        if (!this.isPartOfDom) return;

        const camel = dashToCamel(name);

        if (this.#bindingDependencies?.has(camel)) {
            this.setBindingAsDirty(camel);
        }
    }

    setOrRemoveAttribute(qualifiedName: string, val: string | null) {
        if (val !== null) {
            this.setAttribute(qualifiedName, val);
        }
        else {
            this.removeAttribute(qualifiedName);
        }
    }
}