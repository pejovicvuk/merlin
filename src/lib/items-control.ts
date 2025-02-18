import { BindableControl } from "./bindable-control.js";
import { addArrayListener, getTracker, removeArrayListener } from "./dependency-tracking.js";
import { HtmlControl, HtmlControlBindableProperty } from "./html-control.js";

const standardTemplate = document.createElement('template');
standardTemplate.innerHTML = '<text-block text="this"></text-block>';

const shadowHtml = '<slot name="item-template"></slot><div part="container"></div>';

function findTemplateById(ctl: Element, id: string): HTMLTemplateElement | undefined {
    for (;;) {
        const root = ctl.getRootNode();
        if (root instanceof ShadowRoot) {
            const maybeTemplate = root.getElementById(id);
            if (maybeTemplate instanceof HTMLTemplateElement) return maybeTemplate;
            ctl = root.host;
        }
        else if (root instanceof Document) {
            const maybeTemplate = root.getElementById(id);
            return maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate : undefined;
        }
        else {
            return undefined;
        }
    }
}

function getTypeName(item: any): string {
    const tp = typeof item;
    if (tp === 'object') {
        return Object.getPrototypeOf(item).constructor.name;
    }
    else if (tp == 'function') {
        return item.name;
    }
    else {
        return tp;
    }
}


export class ItemsControl extends HtmlControl implements HtmlControlBindableProperty<'items', Iterable<any>> {
    static override bindableProperties = [...HtmlControl.bindableProperties, 'items'];

    #displayedItems?: Iterable<any>;
    #slotCount = 0;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        shadow.innerHTML = shadowHtml;

        const slot = this.#itemTemplateSlot;
        slot.addEventListener('slotchange', ItemsControl.#onSlotChangeShared);
    }

    static #onSlotChangeShared(this: HTMLSlotElement, ev: Event) {
        ((this.parentNode as ShadowRoot).host as ItemsControl).#onSlotChange();
        ev.stopPropagation();
    }

    #assignedElementsCache?: Element[];

    #onSlotChange () {
        this.#assignedElementsCache = undefined;

        if (this.#displayedItems === undefined) return;

        const div = this.itemsContainer;
        for (const slot of div.children) {
            for (const el of (slot as HTMLSlotElement).assignedElements()) el.remove();
        }
        div.innerHTML = '';

        for (const item of this.#displayedItems) {
            const ctl = this.createItemContainer();

            const template = this.#getItemTemplateContent(item);

            ctl.append(template.cloneNode(true));
            ctl.model = item; // safe as we are descendant of BindableControl so if we are created then so is BindalbeControl

            const slotName = 'i-' + this.#slotCount++;

            ctl.slot = slotName;
            this.appendChild(ctl);

            const slot = document.createElement('slot');
            slot.name = slotName;
            div.appendChild(slot);
        }
    }

    get #itemTemplateSlot() {
        return this.shadowRoot!.querySelector('slot[name="item-template"]') as HTMLSlotElement;
    }

    #getItemTemplateContent(item: any): DocumentFragment {
        const name = getTypeName(item);

        this.#assignedElementsCache ??= this.#itemTemplateSlot.assignedElements();

        let anonymous: HTMLTemplateElement | undefined = undefined;
        let numAnonymous = 0;
        let numNamed = 0;

        for(const template of this.#assignedElementsCache) {
            if (!(template instanceof HTMLTemplateElement)) continue;

            if (template.id === name) return template.content;
            else if (template.id === "") {
                anonymous = template;
                ++numAnonymous;
            }
            else {
                ++numNamed;
            }
        }

        if (numAnonymous === 1 && numNamed === 0 && anonymous !== undefined) {
            return anonymous.content;
        }
        else {
            return (findTemplateById(this, name) ?? standardTemplate).content;
        }
    }

    get items() {
        return this.getProperty<Iterable<any> | undefined>('items', undefined);
    }

    get itemsContainer(): HTMLElement {
        return this.shadowRoot!.querySelector('div[part="container"]')!;
    }

    onItemsChanged() {
        let items: Iterable<any> | undefined;
        try {
            items = this.items;
        }
        catch {
            items = undefined;
        }

        if (items === this.#displayedItems) return;

        if (Array.isArray(this.#displayedItems)) {
            const tracker = getTracker(this.#displayedItems);
            if (tracker !== undefined) {
                tracker[removeArrayListener](this.#onArrayChanged);
            }
        }

        const div = this.itemsContainer;
        for (const slot of div.children) {
            for (const el of (slot as HTMLSlotElement).assignedElements()) el.remove();
        }
        div.innerHTML = '';

        let chNum = this.children.length;
        while (chNum-- > 0) {
            const ch = this.children[chNum];

            if (ch instanceof HTMLSlotElement && ch.name.startsWith('i-')) ch.remove();
        }

        this.#displayedItems = items;

        if (items !== undefined) {
            if (Array.isArray(this.#displayedItems)) {
                const tracker = getTracker(this.#displayedItems);
                if (tracker !== undefined) {
                    tracker[addArrayListener](this.#onArrayChanged);
                }
            }

            for (const item of items) {
                const ctl = this.createItemContainer();
                const template = this.#getItemTemplateContent(item);
                ctl.append(template.cloneNode(true));
                ctl.model = item; // safe as we are descendant of BindableControl so if we are created then so is BindalbeControl

                const slotName = 'i-' + this.#slotCount++;

                ctl.slot = slotName;
                this.appendChild(ctl);

                const slot = document.createElement('slot');
                slot.name = slotName;
                div.appendChild(slot);
            }
        }
    }

    #onArrayChanged = (arr: any[], index: number, inserted: number, deleted: number) => {
        const div = this.itemsContainer;

        let same = Math.min(inserted, deleted);
        inserted -= same;
        deleted -= same;

        while(same-- > 0) {
            const item = arr[index];
            const ctl = (div.children[index++] as HTMLSlotElement).assignedElements()[0] as BindableControl;
            ctl.model = item;
        }

        while(inserted-- > 0) {
            const item = arr[index];

            const ctl = this.createItemContainer();
            const template = this.#getItemTemplateContent(item);
            ctl.append(template.cloneNode(true));
            ctl.model = item; // safe as we are descendant of BindableControl so if we are created then so is BindalbeControl


            const slotName = 'i-' + this.#slotCount++;

            ctl.slot = slotName;
            this.appendChild(ctl);

            const slot = document.createElement('slot');
            slot.name = slotName;

            if (index < div.childElementCount) {
                div.insertBefore(slot, div.children[index]);
            }
            else {
                div.appendChild(slot);
            }

            ++index;
        }

        while(deleted > 0) {
            const slot = div.children[index + --deleted] as HTMLSlotElement;
            for (const assigned of slot.assignedElements()) assigned.remove();
            slot.remove();
        }
    };

    override onDisconnectedFromDom(): void {
        super.onDisconnectedFromDom();
        this.onItemsChanged();
    }

    createItemContainer(): BindableControl {
        return document.createElement('model-control') as BindableControl;
    }
}
