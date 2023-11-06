import { createNewElementName, getNestedHtmlElements, getEvent, postEvent, ensureEventOfType } from './unit-test-interfaces'
import { HtmlControlCore } from '../lib/html-control-core'

class HtmlControlWithEventTracking extends HtmlControlCore {
    override onConnectedToDom(): void {
        postEvent(this, 'connected');
    }

    override onDisconnectedFromDom(): void {
        postEvent(this, 'disconnected');
    }

    override onAncestorsChanged(): void {
        postEvent(this, 'ancestors');
    }
}

export async function registerParentAndChild(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(parent, parentClass);
    customElements.define(child, childClass);

    ensureEventOfType(getEvent(), parentClass, 'connected');
    ensureEventOfType(getEvent(), childClass, 'connected');

    playground.innerHTML = '';

    ensureEventOfType(getEvent(), childClass, 'disconnected');
    ensureEventOfType(getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerParentThenChild(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(parent, parentClass);

    ensureEventOfType(getEvent(), parentClass, 'connected');
    customElements.define(child, childClass);
    ensureEventOfType(getEvent(), childClass, 'connected');

    playground.innerHTML = '';

    ensureEventOfType(getEvent(), childClass, 'disconnected');
    ensureEventOfType(getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerChildThenParent(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(child, childClass);
    ensureEventOfType(getEvent(), childClass, 'connected');
    customElements.define(parent, parentClass);
    ensureEventOfType(getEvent(), parentClass, 'connected');
    ensureEventOfType(getEvent(), childClass, 'ancestors');

    playground.innerHTML = '';

    ensureEventOfType(getEvent(), childClass, 'disconnected');
    ensureEventOfType(getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerGrandparentAndChildThenParent(playground: HTMLDivElement) {
    const grandparent = createNewElementName();
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(grandparent, parent, child);

    const grandparentClass = class extends HtmlControlWithEventTracking {};
    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};
    
    customElements.define(grandparent, grandparentClass);
    customElements.define(child, childClass);

    ensureEventOfType(getEvent(), grandparentClass, 'connected');
    ensureEventOfType(getEvent(), childClass, 'connected');
    
    customElements.define(parent, parentClass);
    ensureEventOfType(getEvent(), parentClass, 'connected');
    ensureEventOfType(getEvent(), childClass, 'ancestors');

    playground.innerHTML = '';

    ensureEventOfType(getEvent(), childClass, 'disconnected');
    ensureEventOfType(getEvent(), parentClass, 'disconnected');
    ensureEventOfType(getEvent(), grandparentClass, 'disconnected');

    return undefined;
}
