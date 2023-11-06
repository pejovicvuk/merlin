import { toTracked, hasListeners } from "../lib/dependency-tracking";
import { HtmlControl } from "../lib/html-control";
import { createNewElementName, postEvent, ensureEvent, throwIfHasEvents } from './unit-test-interfaces'

class BasicControl extends HtmlControl {
    protected static override bindableProperties = [...HtmlControl.bindableProperties, "testProperty"];
    static override observedAttributes = [...HtmlControl.observedAttributes, "test-property"];

    #testProperty?: any;

    get testProperty() {
        return this.getAmbientProperty('testProperty', this.#testProperty);
    }

    set testProperty(val: any) {
        if (this.#testProperty === val) return;
        this.#testProperty = val;
        this.setAmbientProperty('testProperty');
    }

    get testPropertyBinding() {
        return this.getAttribute('testProperty');
    }

    set testPropertyBinding(val: string | null) {
        if (val === this.testPropertyBinding) return;

        this.setOrRemoveAttribute('test-property', val);
    }

    protected override onPropertyChanged(property: string): void {
        postEvent(this, 'onPropertyChanged: ' + property);
       
    }
}

export function testBasicControl(playground: HTMLDivElement) {
    const name = createNewElementName();
    customElements.define(name, BasicControl);

    const ctl = document.createElement(name) as BasicControl;
    playground.appendChild(ctl);
    ensureEvent(ctl, 'onPropertyChanged: context');
    ensureEvent(ctl, 'onPropertyChanged: testProperty');

    throwIfHasEvents();

    if (ctl.testProperty !== undefined) throw new Error('Expected testProperty === undefined.');
    ctl.testPropertyBinding = '1 + 2';
    ensureEvent(ctl, 'onPropertyChanged: testProperty');

    throwIfHasEvents();

    if (ctl.testProperty !== 3) throw new Error('Expected testProperty === 3.');
    ctl.testPropertyBinding = '3 + 4';
    ensureEvent(ctl, 'onPropertyChanged: testProperty');

    throwIfHasEvents();
    
    if (ctl.testProperty !== 7) throw new Error('Expected testProperty === 7.');
    playground.innerHTML = '';
    ensureEvent(ctl, 'onPropertyChanged: context');
    ensureEvent(ctl, 'onPropertyChanged: testProperty');
    if (ctl.testProperty !== undefined) throw new Error('Expected undefined.');
    return undefined;
}

class ParentControl extends BasicControl {
};

class ChildControl extends BasicControl {
};

class Model {
    a = 1;

    b = 2;

    get c() {
        return this.a + this.b;
    }

    set [hasListeners] (val: boolean) {
        postEvent(this, 'HasListeners: ' + val);
    }
}

export function testContext(playground: HTMLDivElement) {
    const parentName = createNewElementName();
    customElements.define(parentName, ParentControl);
    const childName = createNewElementName();
    customElements.define(childName, ChildControl);

    const parent = document.createElement(parentName) as ParentControl;
    const child = document.createElement(childName) as ChildControl;

    parent.appendChild(child);

    const model = toTracked(new Model());
    parent.context = model;

    throwIfHasEvents();

    playground.appendChild(parent);
    ensureEvent(parent, 'onPropertyChanged: context');
    ensureEvent(parent, 'onPropertyChanged: testProperty');
    ensureEvent(child, 'onPropertyChanged: context');
    ensureEvent(child, 'onPropertyChanged: testProperty');

    throwIfHasEvents();

    child.testPropertyBinding = "this.c";
    ensureEvent(child, 'onPropertyChanged: testProperty');
    if (child.testProperty !== 3) throw new Error("Expected child.testProperty === 3.");
    model.a = 3;
    ensureEvent(model, 'HasListeners: true');
    ensureEvent(child, 'onPropertyChanged: testProperty');
    if (child.testProperty !== 5) throw new Error("Expected child.testProperty === 5.");
    
    throwIfHasEvents();
    
    playground.innerHTML = '';
    ensureEvent(model, 'HasListeners: false');
    ensureEvent(child, 'onPropertyChanged: context');
    ensureEvent(child, 'onPropertyChanged: testProperty');
    ensureEvent(parent, 'onPropertyChanged: context');
    ensureEvent(parent, 'onPropertyChanged: testProperty');
}
