import { waitForBrowser, createNewElementName, getNestedHtmlElements, getEvent, postEvent, ensureEventOfType } from './unit-test-interfaces'
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

    ensureEventOfType(await getEvent(), parentClass, 'top');
    ensureEventOfType(await getEvent(), childClass, 'child');

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
    await waitForBrowser();

    ensureEventOfType(await getEvent(), parentClass, 'top');
    customElements.define(child, childClass);
    ensureEventOfType(await getEvent(), childClass, 'child');

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
    await waitForBrowser();

    ensureEventOfType(await getEvent(), childClass, 'top');
    customElements.define(parent, parentClass);
    ensureEventOfType(await getEvent(), parentClass, 'top');
    ensureEventOfType(await getEvent(), childClass, 'child');

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
    await waitForBrowser();

    ensureEventOfType(await getEvent(), grandparentClass, 'top');
    ensureEventOfType(await getEvent(), childClass, 'child');
    
    customElements.define(parent, parentClass);
    ensureEventOfType(await getEvent(), parentClass, 'child');
    ensureEventOfType(await getEvent(), childClass, 'child');

    playground.innerHTML = '';

    ensureEventOfType(await getEvent(), childClass, 'disconnected');
    ensureEventOfType(await getEvent(), parentClass, 'disconnected');
    ensureEventOfType(await getEvent(), grandparentClass, 'disconnected');

    return undefined;
}
