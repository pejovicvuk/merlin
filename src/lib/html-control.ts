import { indexOfTriplet } from "./algorithms";
import { IChangeListener, IChangeTracker, clearDependencies, startEvalScope, evalTrackedScoped, endEvalScope, registerAccess } from "./dependency-tracking";
import { HtmlControlCore, IHtmlControlCore } from "./html-control-core";

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

interface AncestorsKey {};

const ancestorsKey: AncestorsKey = {};

function propagatePropertyChangeInternal(element: IHtmlControlCore, name: string, isExplicitName: string, attributeName: string) {
    for (const child of element.childControls) {
        if ((child as Record<string, any>)[isExplicitName] === true) continue;
        if (child.hasAttribute(attributeName)) continue;
        
        if (name in child && 'onChanged' in child && typeof child.onChanged === 'function') {
            child.onChanged(name);
        }

        propagatePropertyChangeInternal(child, name, isExplicitName, attributeName);
    }
}

function propagatePropertyChange(element: IHtmlControlCore, name: string) {
    if (!element.isPartOfDom) return;

    propagatePropertyChangeInternal(element, name, name + 'IsExplicit', camelToDash(name));
}

export class HtmlControl extends HtmlControlCore implements IChangeTracker, IChangeListener<string> {
    #bindingDependencies?: Map<string, any[]>; // for each binding the array of dependencies obtained using evalTracked. the key is the attribute name, not the camel-cased property name
    #bindingValues?: Map<string, any>;
    #bindingExceptions?: Map<string, any>;
    #listeners?: any []; // we pack listeners in triples for efficiency, (key, listener, token)
    #context?: any;

    protected static bindableProperties = ['context'];
    static observedAttributes = ['context'];

    override onConnectedToDom(): void {
        super.onConnectedToDom();

        const ctor = this.constructor as Function & { bindableProperties?: readonly string[] };
        if (ctor.bindableProperties !== undefined) {
            if (this.#bindingDependencies === undefined) this.#bindingDependencies = new Map();

            this.#bindingValues?.clear();
            this.#bindingExceptions?.clear();

            for (const prop of ctor.bindableProperties) {
                this.#bindingDependencies.set(prop, []);
                this.notifyListeners(prop);
            }

            this.notifyListeners(ancestorsKey);
        }
    }

    override onAncestorsChanged(): void {
        this.notifyListeners(ancestorsKey);
    }

    override onDisconnectedFromDom(): void {
        super.onDisconnectedFromDom();

        if (this.#bindingDependencies !== undefined) {
            for (const [prop, dependencies] of this.#bindingDependencies.entries()) {
                clearDependencies(this, prop, dependencies);
            }
            this.#bindingDependencies = undefined;
        }

        const ctor = this.constructor as Function & { bindableProperties?: readonly string[] };
        if (ctor.bindableProperties !== undefined) {
            this.#bindingValues?.clear();
            this.#bindingExceptions?.clear();

            for (const prop of ctor.bindableProperties) {
                this.notifyListeners(prop);
            }
        }

        this.notifyListeners(ancestorsKey);
    }

    protected evaluateBinding(name: string) {
        const maybeVal = this.#bindingValues?.get(name)
        if (maybeVal !== undefined) return maybeVal !== undefinedPlaceholder ? maybeVal : undefined;

        const maybeEx = this.#bindingExceptions?.get(name);
        if (maybeEx !== undefined) throw maybeEx;

        if (!this.isPartOfDom) {
            if (this.#bindingValues === undefined) this.#bindingValues = new Map();
            this.#bindingValues.set(name, undefinedPlaceholder);
            return undefined;
        }

        const attr = this.getAttribute(camelToDash(name));
        if (attr === null) {
            if (this.#bindingValues === undefined) this.#bindingValues = new Map();
            this.#bindingValues.set(name, undefinedPlaceholder);
            return undefined;
        }

        const dependencies = this.#bindingDependencies!.get(name)!;
        startEvalScope(dependencies);

        try {
            const thisVal = name === 'context' ? undefined : this.context;

            const val = evalTrackedScoped(attr, thisVal);
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
        finally {
            endEvalScope(this, name);
        }
    }

    protected notifyListeners(name: string | AncestorsKey) {
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

    protected clearBindingCache(name: string): boolean | undefined {
        return (this.#bindingValues?.delete(name) || this.#bindingExceptions?.delete(name));
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
        if (this.clearBindingCache(name)) this.notifyListeners(name);
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        super.attributeChangedCallback(name, oldValue, newValue);

        if (!this.isPartOfDom) return;

        const camel = dashToCamel(name);

        if (this.clearBindingCache(camel)) this.notifyListeners(camel);
    }

    setOrRemoveAttribute(qualifiedName: string, val: string | null) {
        if (val !== null) {
            this.setAttribute(qualifiedName, val);
        }
        else {
            this.removeAttribute(qualifiedName);
        }
    }

    protected getAmbientProperty(name: string, explicitVal: any): any {
        registerAccess(this, name);

        if (explicitVal !== undefined) {
            return explicitVal;
        }
        else if (this.hasAttribute(camelToDash(name))) {
            return this.evaluateBinding(name);
        }
        else {
            registerAccess(this, ancestorsKey);

            let ctl = this.parentControl;
            while (ctl !== undefined) {
                if (name in ctl) return (ctl as Record<string, any>)[name];
                ctl = ctl.parentControl;
            }

            return undefined;
        }
    }

    protected setAmbientProperty(name: string) {
        if (!this.isPartOfDom) return;
        
        this.clearBindingCache(name);
        this.notifyListeners(name);
        propagatePropertyChange(this, name);
    }

    get context() {
        return this.getAmbientProperty('context', this.#context);
    }

    set context(val: any) {
        if (this.#context === val) return;
        this.#context = val;
        this.setAmbientProperty('context');
    }

    get contextIsExplicit() {
        return this.#context !== undefined;
    }
}