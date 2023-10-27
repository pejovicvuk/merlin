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

    ensureEventOfType(await getEvent(), parentClass, 'connected');
    ensureEventOfType(await getEvent(), childClass, 'connected');

    playground.innerHTML = '';

    ensureEventOfType(await getEvent(), childClass, 'disconnected');
    ensureEventOfType(await getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerParentThenChild(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(parent, parentClass);

    ensureEventOfType(await getEvent(), parentClass, 'connected');
    customElements.define(child, childClass);
    ensureEventOfType(await getEvent(), childClass, 'connected');

    playground.innerHTML = '';

    ensureEventOfType(await getEvent(), childClass, 'disconnected');
    ensureEventOfType(await getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerChildThenParent(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(child, childClass);
    ensureEventOfType(await getEvent(), childClass, 'connected');
    customElements.define(parent, parentClass);
    ensureEventOfType(await getEvent(), parentClass, 'connected');
    ensureEventOfType(await getEvent(), childClass, 'ancestors');

    playground.innerHTML = '';

    ensureEventOfType(await getEvent(), childClass, 'disconnected');
    ensureEventOfType(await getEvent(), parentClass, 'disconnected');

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

    ensureEventOfType(await getEvent(), grandparentClass, 'connected');
    ensureEventOfType(await getEvent(), childClass, 'connected');
    
    customElements.define(parent, parentClass);
    ensureEventOfType(await getEvent(), parentClass, 'connected');
    ensureEventOfType(await getEvent(), childClass, 'ancestors');

    playground.innerHTML = '';

    ensureEventOfType(await getEvent(), childClass, 'disconnected');
    ensureEventOfType(await getEvent(), parentClass, 'disconnected');
    ensureEventOfType(await getEvent(), grandparentClass, 'disconnected');

    return undefined;
}
