import { addArrayListener, getTracker, removeArrayListener } from "./dependency-tracking.js";
import { HtmlControl, HtmlControlBindableProperty } from "./html-control.js";

export class ItemsControl extends HtmlControl implements HtmlControlBindableProperty<'items', Iterable<any>> {
    static override bindableProperties = [...HtmlControl.bindableProperties, 'items'];

    #displayedItems?: Iterable<any>;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        shadow.innerHTML = '<slot name="item-template"></slot><div part="container"></div>';

        const slot = this.#itemTemplateSlot;
        slot.addEventListener('slotchange', this.#onSlotChange);
    }

    #onSlotChange = () => {
        if (this.#displayedItems === undefined) return;

        const div = this.#div;
        div.innerHTML = '';

        const slot = this.#itemTemplateSlot;
        
        const maybeTemplate = slot.assignedElements({ flatten: true })[0];
        const innerHTML = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate.innerHTML : '<text-block text="this"></text-block>';
        for (const item of this.#displayedItems) {
            const ctl = document.createElement('model-control') as HtmlControl;
            ctl.innerHTML = innerHTML;
            ctl.model = item; // safe as we are descendant of HtmlControl so if we are created then so is HtmlControl
            div.appendChild(ctl);
        }
    };

    get #itemTemplateSlot() {
        return this.shadowRoot!.querySelector('slot[name="item-template"]') as HTMLSlotElement;
    }

    get items() {
        return this.getProperty<Iterable<any> | undefined>('items', undefined);
    }

    get #div() {
        return this.shadowRoot!.querySelector('div')!
    }

    onItemsChanged() {
        const items = this.items;

        if (items === this.#displayedItems) return;

        if (Array.isArray(this.#displayedItems)) {
            const tracker = getTracker(this.#displayedItems);
            if (tracker !== undefined) {
                tracker[removeArrayListener](this.#onArrayChanged);
            }
        }

        const div = this.#div;
        div.innerHTML = '';

        this.#displayedItems = items;

        if (items !== undefined) {
            if (Array.isArray(this.#displayedItems)) {
                const tracker = getTracker(this.#displayedItems);
                if (tracker !== undefined) {
                    tracker[addArrayListener](this.#onArrayChanged);
                }
            }

            const slot = this.#itemTemplateSlot;
            const maybeTemplate = slot.assignedElements({ flatten: true })[0];
            const innerHTML = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate.innerHTML : '<text-block text="this"></text-block>';
            for (const item of items) {
                const ctl = document.createElement('model-control') as HtmlControl;
                ctl.innerHTML = innerHTML;
                ctl.model = item; // safe as we are descendant of HtmlControl so if we are created then so is HtmlControl
                div.appendChild(ctl);
            }
        }
    }

    #onArrayChanged = (index: number, inserted: number, deleted: number) => {
        const arr = this.#displayedItems as any[];
        const div = this.#div;

        let same = Math.min(inserted, deleted);
        inserted -= same;
        deleted -= same;

        while(same-- > 0) {
            const item = arr[index];
            const ctl = div.children[index++] as HtmlControl;
            ctl.model = item;
        }

        const slot = this.#itemTemplateSlot;
        const maybeTemplate = slot.assignedElements({ flatten: true })[0];
        const innerHTML = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate.innerHTML : '<text-block text="this"></text-block>';
        while(inserted-- > 0) {
            const ctl = document.createElement('model-control') as HtmlControl;
            ctl.innerHTML = innerHTML;
            ctl.model = arr[index]; // safe as we are descendant of HtmlControl so if we are created then so is HtmlControl
            if (index < div.childElementCount) {
                div.insertBefore(ctl, div.children[index++]);
            }
            else {
                div.appendChild(ctl);
            }
        }

        while(deleted > 0) {
            div.children[index + --deleted].remove();
        }
    };

    override onDisconnectedFromDom(): void {
        super.onDisconnectedFromDom();
        this.onItemsChanged();
    }
}
