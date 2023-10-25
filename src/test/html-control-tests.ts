import { IChangeListener } from "../lib/dependency-tracking";
import { HtmlControl } from "../lib/html-control";
import { HtmlControlCore } from "../lib/html-control-core";
import {  createNewElementName, getEvent, postEvent, ensureEvent } from './unit-test-interfaces'

class BasicControl extends HtmlControl {
    protected static override bindableProperties = ["testProperty"];
    static observedAttributes = ["test-property"];

    get testProperty() {
        return this.evaluateBinding("testProperty");
    }

    get testPropertyBinding() {
        return this.getAttribute('testProperty');
    }

    set testPropertyBinding(val: string | null) {
        if (val === this.testPropertyBinding) return;

        if (val !== null) {
            this.setAttribute('test-property', val);
        }
        else {
            this.removeAttribute('test-property');
        }
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
    ensureEvent(await getEvent(), BasicControl, 'Property changed: Result');
    if (ctl.testProperty !== 3) throw new Error('Expected testProperty === 3.');
    ctl.testPropertyBinding = '3 + 4';
    ensureEvent(await getEvent(), BasicControl, 'Property changed: Result');
    if (ctl.testProperty !== 7) throw new Error('Expected testProperty === 7.');
    playground.innerHTML = '';
    ensureEvent(await getEvent(), BasicControl, 'Property changed: Result');
    if (ctl.testProperty !== undefined) throw new Error('Expected undefined.');
    return undefined;
}
