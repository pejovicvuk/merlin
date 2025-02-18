import { BindableControl } from "./bindable-control.js";
import { addArrayListener, getTracker, removeArrayListener } from "./dependency-tracking.js";
import { HtmlControl, HtmlControlBindableProperty } from "./html-control.js";

const standardTemplate = document.createElement('template');
standardTemplate.innerHTML = '<text-block text="this"></text-block>';

const shadowHtml = '<slot name="item-template"></slot><div part="container"></div>';

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

    #onSlotChange () {
        if (this.#displayedItems === undefined) return;

        const div = this.itemsContainer;
        for (const slot of div.children) {
            for (const el of (slot as HTMLSlotElement).assignedElements()) el.remove();
        }
        div.innerHTML = '';

        const template = this.#itemTemplateContent;
        for (const item of this.#displayedItems) {
            const ctl = this.createItemContainer();

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

    get #itemTemplateContent(): DocumentFragment {
        const maybeTemplate = this.#itemTemplateSlot.assignedElements({ flatten: true })[0];
        const template = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate : standardTemplate;
        return template.content;
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

            const template = this.#itemTemplateContent;
            for (const item of items) {
                const ctl = this.createItemContainer();
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

        const template = this.#itemTemplateContent;
        while(inserted-- > 0) {
            const ctl = this.createItemContainer();
            ctl.append(template.cloneNode(true));
            ctl.model = arr[index]; // safe as we are descendant of BindableControl so if we are created then so is BindalbeControl


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
