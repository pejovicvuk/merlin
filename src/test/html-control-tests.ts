import { waitForBrowser, createNewElementName } from './unit-test-interfaces'
import { HtmlControl } from '../lib/html-control'

type Event = { sender: HtmlControl, message: string };

let events: Event[] = [];
let eventsAwaiter: undefined | ((event: Event) => void) = undefined;

function postEvent(sender: HtmlControl, message: string) {
    if (eventsAwaiter === undefined) {
        events.push({ sender, message });
    }
    else {
        const awaiter = eventsAwaiter;
        eventsAwaiter = undefined;
        awaiter({ sender, message });
    }
}

function getEvent(): Promise<Event> {
    return new Promise<Event> (resolve => {
        if (events.length > 0) {
            const first = events[0];
            events.splice(0, 1);
            resolve(first);
        }
        else {
            eventsAwaiter = resolve;
        }
    });
}

function getNestedHtmlElements(...names: string[]): string {
    let ret = '';
    for (const name of names) {
        ret += '<' + name + '>';
    }

    let x = names.length;
    while(x-- > 0) {
        ret += '</' + names[x] + '>';
    }

    return ret;
}

class HtmlControlWithEventTracking extends HtmlControl {
    override onConnectedToDom(): void {
        postEvent(this, this.parentControl !== undefined ? 'child' : 'top');
    }

    override onDisconnectedFromDom(): void {
        postEvent(this, 'disconnected');
    }
}

function ensureEvent(ev: Event, type: { new(): object }, msg: string) {
    if (!(ev.sender instanceof type) || ev.message !== msg) throw new Error(`Expected type ${type.name} - ${ev.message}`);
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
