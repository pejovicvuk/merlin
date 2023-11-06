import { IChangeListener, toTracked, hasListeners } from "../lib/dependency-tracking";
import { HtmlControl } from "../lib/html-control";
import { HtmlControlCore } from "../lib/html-control-core";
import { createNewElementName, getEvent, postEvent, ensureEvent } from './unit-test-interfaces'

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
}

class Listener implements IChangeListener<string> {
    #ctl: HtmlControlCore;

    constructor(ctl: HtmlControlCore) {
        this.#ctl = ctl;
    }

    onChanged(property: string): void {
        postEvent(this.#ctl, 'Property changed: ' + property);
    }
}

export async function testBasicControl(playground: HTMLDivElement) {
    const name = createNewElementName();
    customElements.define(name, BasicControl);

    const ctl = document.createElement(name) as BasicControl;
    ctl.addListener(new Listener(ctl), "testProperty", "Result");
    playground.appendChild(ctl);
    if (ctl.testProperty !== undefined) throw new Error('Expected testProperty === undefined.');
    ctl.testPropertyBinding = '1 + 2';
    ensureEvent(await getEvent(), ctl, 'Property changed: Result');
    if (ctl.testProperty !== 3) throw new Error('Expected testProperty === 3.');
    ctl.testPropertyBinding = '3 + 4';
    ensureEvent(await getEvent(), ctl, 'Property changed: Result');
    if (ctl.testProperty !== 7) throw new Error('Expected testProperty === 7.');
    playground.innerHTML = '';
    ensureEvent(await getEvent(), ctl, 'Property changed: Result');
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

export async function testContext(playground: HTMLDivElement) {
    const parentName = createNewElementName();
    customElements.define(parentName, ParentControl);
    const childName = createNewElementName();
    customElements.define(childName, ChildControl);

    const parent = document.createElement(parentName) as ParentControl;
    parent.addListener(new Listener(parent), "context", "context");
    const child = document.createElement(childName) as ChildControl;
    child.addListener(new Listener(child), "context", "context");
    child.addListener(new Listener(child), "testProperty", "testProperty");

    parent.appendChild(child);

    const model = toTracked(new Model());
    parent.context = model;

    playground.appendChild(parent);
    ensureEvent(await getEvent(), parent, 'Property changed: context');
    ensureEvent(await getEvent(), child, 'Property changed: context');

    child.testPropertyBinding = "this.c";
    if (child.testProperty !== 3) throw new Error("Expected child.testProperty === 3.");
    model.a = 3;
    ensureEvent(await getEvent(), child, 'Property changed: testProperty');
    ensureEvent(await getEvent(), model, 'HasListeners: true');
    if (child.testProperty !== 5) throw new Error("Expected child.testProperty === 5.");
    
    // if (parent.testProperty !== undefined) throw new Error('Expected testProperty === undefined.');
    // parent.testPropertyBinding = '1 + 2';
    // ensureEvent(await getEvent(), parent, 'Property changed: Result');
    // if (parent.testProperty !== 3) throw new Error('Expected testProperty === 3.');
    // parent.testPropertyBinding = '3 + 4';
    // ensureEvent(await getEvent(), parent, 'Property changed: Result');
    // if (parent.testProperty !== 7) throw new Error('Expected testProperty === 7.');
    // playground.innerHTML = '';
    // ensureEvent(await getEvent(), parent, 'Property changed: Result');
    // if (parent.testProperty !== undefined) throw new Error('Expected undefined.');
    // return undefined;
}
