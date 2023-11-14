import { indexOfTriplet } from "./algorithms";
import { IChangeTracker, clearDependencies, startEvalScope, endEvalScope, registerAccess, addListener, removeListener } from "./dependency-tracking";
import { HtmlControlCore, IHtmlControlCore } from "./html-control-core";

function stringToDashedLowercase(s: string) {
    return '-' + s.toLowerCase();
}

function propertyNameToAttributeName(s: string) {
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

function acceptsInherited<T extends object>(obj: T, acceptsInheritedPropertyName: string) {
    return (obj as Record<string, any>)[acceptsInheritedPropertyName] === true;
}

const acceptsInheritedPropertyNameMap = new Map<string, string>();

function getAcceptsInheritedPropertyName(name: string) {
    let ret = acceptsInheritedPropertyNameMap.get(name);
    if (ret === undefined) {
        ret = 'acceptsInherited' + name[0].toUpperCase() + name.slice(1);
        acceptsInheritedPropertyNameMap.set(name, ret);
    }
    return ret;
}

function propagatePropertyChangeInternal(element: IHtmlControlCore, name: string, acceptsInheritedPropertyName: string, attributeName: string) {
    for (const child of element.childControls) {
        if (!acceptsInherited(child, acceptsInheritedPropertyName) || child.hasAttribute(attributeName)) continue;
        
        if (name in child && 'onChanged' in child && typeof child.onChanged === 'function') {
            child.onChanged(name);
        }

        propagatePropertyChangeInternal(child, name, acceptsInheritedPropertyName, attributeName);
    }
}

function propagatePropertyChange(element: IHtmlControlCore, name: string) {
    if (!element.isPartOfDom) return;

    propagatePropertyChangeInternal(element, name, getAcceptsInheritedPropertyName(name), propertyNameToAttributeName(name));
}

export function bindable(...properties: string[]) {
    return function<BC extends abstract new (...args: any) => any = abstract new (...args: any) => any> (target: BC, context: ClassDecoratorContext<BC>) {
        if (properties.length === 0) return;

        context.addInitializer(() => {
            if (target.name === "BindableControl") {
                console.log('target is a function');
            }

            const ctl = target as { bindableProperties?: string[]; observedAttributes?: string[]; };

            if (!Object.hasOwn(ctl, 'bindableProperties')) {
                ctl.bindableProperties = ctl.bindableProperties !== undefined ? [...ctl.bindableProperties, ...properties] : [...properties];
            }
            else {
                ctl.bindableProperties!.push(...properties);
            }

            if (!Object.hasOwn(ctl, 'observedAttributes')) {
                const mapped = properties.map(x => propertyNameToAttributeName(x));
                ctl.observedAttributes = ctl.observedAttributes !== undefined ? [...ctl.observedAttributes, ...mapped] : [...mapped];
            }
            else {
                ctl.observedAttributes!.push(...properties);
            }
        });
    };
}

export function setOrRemoveAttribute(element: Element, qualifiedName: string, val: string | null) {
    if (val !== null) {
        element.setAttribute(qualifiedName, val);
    }
    else {
        element.removeAttribute(qualifiedName);
    }
}

export type BindableProperty<T extends string, R> = {
    [_ in T]: R;
} & {
    readonly [_ in `acceptsInherited${Capitalize<T>}`]: boolean;
};

export interface IBindableControl extends IChangeTracker, IHtmlControlCore, BindableProperty<'model', any> {
    onPropertyChanged(property: string): void;
    getProperty<T>(name: string, explicitVal?: T): T | undefined;
    getAmbientProperty<T>(name: string, explicitVal: T): T | undefined;
    notifyPropertySetExplicitly(name: string): void;
    notifyAmbientPropertySetExplicitly(name: string): void;
    writeToBindingSource<T>(property: string, val: T): boolean;
    writeToBindingSourceByAttribute<T>(attributeName: string, val: T): boolean;
}

export function makeBindableControl(BaseClass: (new () => HtmlControlCore)): (new () => IBindableControl) & { observedAttributes: string[]; bindableProperties: string[]; } {
    return class BindableControl extends BaseClass implements IBindableControl {
        #bindingDependencies?: Map<string, any[]>; // for each binding the array of dependencies obtained using evalTracked. the key is the attribute name, not the camel-cased property name
        #bindingValues?: Map<string, any>;
        #bindingExceptions?: Map<string, any>;
        #listeners?: any []; // we pack listeners in triples for efficiency, (key, listener, token)
        #model?: any;
    
        static observedAttributes = ['model'];
        static bindableProperties = ['model'];
    
        override onConnectedToDom(): void {
            super.onConnectedToDom();
    
            const ctor = this.constructor as Function & { bindableProperties?: readonly string[] };
            if (ctor.bindableProperties !== undefined) {
                this.#bindingValues?.clear();
                this.#bindingExceptions?.clear();
    
                for (const prop of ctor.bindableProperties) {
                    this.#notifyListeners(prop);
                }
    
                this.#notifyListeners(ancestorsKey);
            }
        }
    
        override onAncestorsChanged(): void {
            this.#notifyListeners(ancestorsKey);
        }
    
        override onDisconnectedFromDom(): void {
            super.onDisconnectedFromDom();
    
            if (this.#bindingDependencies !== undefined) {
                for (const [prop, dependencies] of this.#bindingDependencies.entries()) {
                    clearDependencies(this.#onChanged, prop, dependencies);
                }
                this.#bindingDependencies = undefined;
            }
    
            const ctor = this.constructor as Function & { bindableProperties?: readonly string[] };
            if (ctor.bindableProperties !== undefined) {
                this.#bindingValues?.clear();
                this.#bindingExceptions?.clear();
    
                // for (const prop of ctor.bindableProperties) {
                //     this.#notifyListeners(prop);
                // }
            }
    
            // this.#notifyListeners(ancestorsKey);
        }
    
        #evaluateBinding(name: string) {
            const maybeVal = this.#bindingValues?.get(name)
            if (maybeVal !== undefined) return maybeVal !== undefinedPlaceholder ? maybeVal : undefined;
    
            const maybeEx = this.#bindingExceptions?.get(name);
            if (maybeEx !== undefined) throw maybeEx;
    
            if (!this.isPartOfDom) {
                if (this.#bindingValues === undefined) this.#bindingValues = new Map();
                this.#bindingValues.set(name, undefinedPlaceholder);
                return undefined;
            }
    
            const attr = this.getAttribute(propertyNameToAttributeName(name));
            if (attr === null) {
                if (this.#bindingValues === undefined) this.#bindingValues = new Map();
                this.#bindingValues.set(name, undefinedPlaceholder);
                return undefined;
            }
    
            if (this.#bindingDependencies === undefined) this.#bindingDependencies = new Map();
            let dependencies = this.#bindingDependencies.get(name);
            if (dependencies === undefined) {
                dependencies = [];
                this.#bindingDependencies.set(name, dependencies);
            }
            startEvalScope(dependencies);
    
            try {
                const thisVal = name === 'model' ? undefined : this.model;
    
                const func = Function("element", "self", "window", "globals", "console", "top", `"use strict";return (${attr});`);
                const val = func.call(thisVal, this);
            
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
                endEvalScope(this.#onChanged, name);
            }
        }
    
        onPropertyChanged(property: string): void {
        }
    
        #notifyListeners(name: string | AncestorsKey) {
            if (typeof name === 'string') this.onPropertyChanged(name);
    
            if (this.#listeners === undefined) return;
    
            for (let x = 0; x < this.#listeners.length; x += 3) {
                const k = this.#listeners[x];
                if (k === name) {
                    const listener = this.#listeners[x + 1] as (token: any) => void;
                    const token = this.#listeners[x + 2];
                    try {
                        listener(token);
                    }
                    catch(err) {
                        console.log(err);
                    }
                }
            }
        }
    
        #clearBindingCache(name: string): boolean | undefined {
            return (this.#bindingValues?.delete(name) || this.#bindingExceptions?.delete(name));
        }
    
        [addListener]<T>(handler: (token: T) => void, key: any, token: T) {
            if (this.#listeners === undefined) this.#listeners = [];
            this.#listeners.push(key, handler, token);
        }
    
        [removeListener]<T>(handler: (token: T) => void, key: any, token: T) {
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
    
        #onChangedImpl(name: string) {
            if (this.#clearBindingCache(name)) this.#notifyListeners(name);
        }
    
        #onChanged = (name: string) => this.#onChangedImpl(name);
    
        override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
            super.attributeChangedCallback(name, oldValue, newValue);
    
            if (!this.isPartOfDom) return;
    
            const camel = dashToCamel(name);
    
            this.#clearBindingCache(camel);
            this.#notifyListeners(camel);
        }
    
        getProperty<T>(name: string, explicitVal?: T): T | undefined {
            registerAccess(this, name);
    
            if (explicitVal !== undefined) {
                return explicitVal;
            }
            else if (this.hasAttribute(propertyNameToAttributeName(name))) {
                return this.#evaluateBinding(name);
            }
            else {
                return undefined;
            }
        }
    
        getAmbientProperty<T>(name: string, explicitVal: T): T | undefined {
            registerAccess(this, name);
    
            if (explicitVal !== undefined) {
                return explicitVal;
            }
            else if (this.hasAttribute(propertyNameToAttributeName(name))) {
                return this.#evaluateBinding(name);
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
    
        notifyPropertySetExplicitly(name: string) {
            if (!this.isPartOfDom) return;
    
            this.#clearBindingCache(name);
            this.#notifyListeners(name);
        }
    
        notifyAmbientPropertySetExplicitly(name: string) {
            if (!this.isPartOfDom) return;
    
            this.#clearBindingCache(name);
            this.#notifyListeners(name);
            propagatePropertyChange(this, name);
        }
    
        get model() {
            return this.getAmbientProperty('model', this.#model);
        }
    
        set model(val: any) {
            if (this.#model === val) return;
            this.#model = val;
            this.notifyAmbientPropertySetExplicitly('model');
        }
    
        get acceptsInheritedModel() {
            return this.#model === undefined;
        }

        writeToBindingSource<T>(property: string, val: T): boolean {
            const attributeName = propertyNameToAttributeName(property);
            return this.writeToBindingSourceByAttribute(attributeName, val);
        }

        writeToBindingSourceByAttribute<T>(attributeName: string, val: T): boolean {
            const expression = this.getAttribute(attributeName);
            if (expression === null) return false;

            if (!expression.startsWith('this.')) return false;

            let obj = this.model;
            if (obj == null) return false;

            if (typeof obj !== 'object') return false;

            let start = 5;
            for (;;) {
                const dotIdx = expression.indexOf('.', start);
                if (dotIdx < 0) {
                    const member = expression.slice(start);
                    obj[member] = val;
                    return true;
                }
                else {
                    if (dotIdx === start) return false;

                    const member = expression.slice(start, dotIdx);
                    start = dotIdx + 1;
                    obj = obj[member];
                    if (typeof obj !== 'object') return false;
                }
            }
        }
    };
}

export const BindableControl = makeBindableControl(HtmlControlCore);
export type BindableControl = typeof BindableControl;