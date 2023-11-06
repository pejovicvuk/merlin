let nextControlId = 0;

export function createNewElementName() {
    return 'control-' + nextControlId++;
}

export function getNestedHtmlElements(...names: string[]): string {
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

export type Event = { sender: object, message: string };

let events: Event[] = [];
let eventsAwaiter: undefined | ((event: Event) => void) = undefined;

export function postEvent(sender: object, message: string) {
    if (eventsAwaiter === undefined) {
        events.push({ sender, message });
    }
    else {
        const awaiter = eventsAwaiter;
        eventsAwaiter = undefined;
        awaiter({ sender, message });
    }
}

export function getEvent(): Promise<Event> {
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

export function ensureEventOfType(ev: Event, type: { new(): object }, msg: string) {
    if (!(ev.sender instanceof type) || ev.message !== msg) throw new Error(`Expected type ${type.name} - ${ev.message}`);
}

export function ensureEvent(ev: Event, sender: object, msg: string) {
    if (ev.sender !== sender || ev.message !== msg) throw new Error(`Expected type ${sender.constructor.name} - ${ev.message}`);
}
