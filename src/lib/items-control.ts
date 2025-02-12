import { BindableControl } from "./bindable-control.js";
import { addArrayListener, getTracker, removeArrayListener } from "./dependency-tracking.js";
import { HtmlControl, HtmlControlBindableProperty } from "./html-control.js";

const standardTemplate = document.createElement('template');
standardTemplate.innerHTML = '<text-block text="this"></text-block>';

export class ItemsControl extends HtmlControl implements HtmlControlBindableProperty<'items', Iterable<any>> {
    static override bindableProperties = [...HtmlControl.bindableProperties, 'items'];

    #displayedItems?: Iterable<any>;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        shadow.innerHTML = '<slot name="item-template"></slot><div part="container"></div>';

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
        div.innerHTML = '';

        const template = this.#itemTemplateContent;
        for (const item of this.#displayedItems) {
            const ctl = this.createItemContainer();

            ctl.append(template.cloneNode(true));
            ctl.model = item; // safe as we are descendant of BindableControl so if we are created then so is BindalbeControl
            div.appendChild(ctl);
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
        return this.shadowRoot!.querySelector('div')!
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
        div.innerHTML = '';

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
                div.appendChild(ctl);
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
            const ctl = div.children[index++] as BindableControl;
            ctl.model = item;
        }

        const template = this.#itemTemplateContent;
        while(inserted-- > 0) {
            const ctl = this.createItemContainer();
            ctl.append(template.cloneNode(true));
            ctl.model = arr[index]; // safe as we are descendant of BindableControl so if we are created then so is BindalbeControl
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

    createItemContainer(): BindableControl {
        return document.createElement('model-control') as BindableControl;
    }
}
