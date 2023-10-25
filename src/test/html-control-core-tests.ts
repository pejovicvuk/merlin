import { waitForBrowser, createNewElementName, getNestedHtmlElements, getEvent, postEvent, ensureEvent } from './unit-test-interfaces'
import { HtmlControlCore } from '../lib/html-control-core'


class HtmlControlWithEventTracking extends HtmlControlCore {
    override onConnectedToDom(): void {
        postEvent(this, this.parentControl !== undefined ? 'child' : 'top');
    }

    override onDisconnectedFromDom(): void {
        postEvent(this, 'disconnected');
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

    await waitForBrowser();

    ensureEvent(await getEvent(), parentClass, 'top');
    ensureEvent(await getEvent(), childClass, 'child');

    playground.innerHTML = '';

    ensureEvent(await getEvent(), childClass, 'disconnected');
    ensureEvent(await getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerParentThenChild(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(parent, parentClass);
    await waitForBrowser();

    ensureEvent(await getEvent(), parentClass, 'top');
    customElements.define(child, childClass);
    ensureEvent(await getEvent(), childClass, 'child');

    playground.innerHTML = '';

    ensureEvent(await getEvent(), childClass, 'disconnected');
    ensureEvent(await getEvent(), parentClass, 'disconnected');

    return undefined;
}

export async function registerChildThenParent(playground: HTMLDivElement) {
    const parent = createNewElementName();
    const child = createNewElementName()

    playground.innerHTML = getNestedHtmlElements(parent, child);

    const parentClass = class extends HtmlControlWithEventTracking {};
    const childClass = class extends HtmlControlWithEventTracking {};

    customElements.define(child, childClass);
    await waitForBrowser();

    ensureEvent(await getEvent(), childClass, 'top');
    customElements.define(parent, parentClass);
    ensureEvent(await getEvent(), parentClass, 'top');
    ensureEvent(await getEvent(), childClass, 'child');

    playground.innerHTML = '';

    ensureEvent(await getEvent(), childClass, 'disconnected');
    ensureEvent(await getEvent(), parentClass, 'disconnected');

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
    await waitForBrowser();

    ensureEvent(await getEvent(), grandparentClass, 'top');
    ensureEvent(await getEvent(), childClass, 'child');
    
    customElements.define(parent, parentClass);
    ensureEvent(await getEvent(), parentClass, 'child');
    ensureEvent(await getEvent(), childClass, 'child');

    playground.innerHTML = '';

    ensureEvent(await getEvent(), childClass, 'disconnected');
    ensureEvent(await getEvent(), parentClass, 'disconnected');
    ensureEvent(await getEvent(), grandparentClass, 'disconnected');

    return undefined;
}
