import { addArrayListener, getTracker, removeArrayListener } from "./dependency-tracking";
import { HtmlControl, HtmlControlBindableProperty } from "./html-control";

export class ItemsControl extends HtmlControl implements HtmlControlBindableProperty<'items', Iterable<any>> {
    static override bindableProperties = [...HtmlControl.bindableProperties, 'items'];

    #displayedItems?: Iterable<any>;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = '<slot id="template"><template>No template</template></slot>';

        const slot = shadow.getElementById('template') as HTMLSlotElement;
        slot.addEventListener('slotchange', this.#onSlotChange);
    }

    #onSlotChange = () => {
        if (this.#displayedItems === undefined) return;

        while(this.lastChild !== this.firstChild) this.lastChild!.remove();

        const slot = this.shadowRoot!.getElementById('template') as HTMLSlotElement;
        
        const maybeTemplate = slot.assignedElements({ flatten: true })[0];
        const innerHTML = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate.innerHTML : '<text-control text="this"></text-control>';
        for (const item of this.#displayedItems) {
            const ctl = document.createElement('model-control') as HtmlControl;
            ctl.innerHTML = innerHTML;
            ctl.model = item; // safe as we are descendant of HtmlControl so if we are created then so is HtmlControl
            this.shadowRoot!.appendChild(ctl);
        }
    };

    get items() {
        return this.getProperty<Iterable<any> | undefined>('items', undefined);
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

        while(this.lastChild !== this.firstChild) this.lastChild!.remove();

        this.#displayedItems = items;

        if (this.#displayedItems !== undefined) {
            if (Array.isArray(this.#displayedItems)) {
                const tracker = getTracker(this.#displayedItems);
                if (tracker !== undefined) {
                    tracker[addArrayListener](this.#onArrayChanged);
                }
            }

            const slot = this.shadowRoot!.getElementById('template') as HTMLSlotElement;
            const maybeTemplate = slot.assignedElements({ flatten: true })[0];
            const innerHTML = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate.innerHTML : '<text-control text="this"></text-control>';
            for (const item of this.#displayedItems) {
                const ctl = document.createElement('model-control') as HtmlControl;
                ctl.innerHTML = innerHTML;
                ctl.model = item; // safe as we are descendant of HtmlControl so if we are created then so is HtmlControl
                this.shadowRoot!.appendChild(ctl);
            }
        }
    }

    #onArrayChanged = (index: number, inserted: number, deleted: number) => {
        const arr = this.#displayedItems as any[];

        let same = Math.min(inserted, deleted);
        inserted -= same;
        deleted -= same;

        while(same-- > 0) {
            const item = arr[index++];
            const ctl = this.shadowRoot!.children[index] as HtmlControl;
            ctl.model = item;
        }

        const slot = this.shadowRoot!.getElementById('template') as HTMLSlotElement;
        const maybeTemplate = slot.assignedElements({ flatten: true })[0];
        const innerHTML = maybeTemplate instanceof HTMLTemplateElement ? maybeTemplate.innerHTML : '<text-control text="this"></text-control>';
        while(inserted-- > 0) {
            const ctl = document.createElement('model-control') as HtmlControl;
            ctl.innerHTML = innerHTML;
            ctl.model = arr[index++]; // safe as we are descendant of HtmlControl so if we are created then so is HtmlControl
            if (index < this.shadowRoot!.childElementCount) {
                this.insertBefore(this.shadowRoot!.children[index], ctl);
            }
            else {
                this.appendChild(ctl);
            }
        }

        while(deleted > 0) {
            this.children[index + deleted--].remove();
        }
    };

    override onDisconnectedFromDom(): void {
        super.onDisconnectedFromDom();
        this.onItemsChanged();
    }
}