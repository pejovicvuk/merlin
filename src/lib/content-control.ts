import { BindableControl } from "./bindable-control.js";
import { findTemplateById, getTypeName } from "./dom-utilities.js";
import { HtmlControl, HtmlControlBindableProperty } from "./html-control.js";

const shadowHtml = '<slot name="template"></slot><slot name="content"></slot>';

const standardTemplate = document.createElement('template');
standardTemplate.innerHTML = '<text-block text="this"></text-block>';

export class ContentControl extends HtmlControl implements HtmlControlBindableProperty<'content', any>{
    static override bindableProperties = [...HtmlControl.bindableProperties, 'content'];

    #content?: any;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open", delegatesFocus: true });
        shadow.innerHTML = shadowHtml;

        const slot = this.#itemTemplateSlot;
        slot.addEventListener('slotchange', ContentControl.#onSlotChangeShared);
    }

    get content() {
        return this.getProperty('content');
    }

    onContentChanged() {
        this.#updateContent();
    }

    static #onSlotChangeShared(this: HTMLSlotElement, ev: Event) {
        ((this.parentNode as ShadowRoot).host as ContentControl).#onSlotChange();
        ev.stopPropagation();
    }

    #assignedElementsCache?: Element[];

    #onSlotChange () {
        this.#assignedElementsCache = undefined;

        if (this.#content !== undefined) this.#updateContent();
    }

    get #itemTemplateSlot() {
        return this.shadowRoot!.querySelector('slot[name="template"]') as HTMLSlotElement;
    }

    get #contentSlot() {
        return this.shadowRoot!.querySelector('slot[name="content"]') as HTMLSlotElement;
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

    #updateContent() {
        const content = this.content;
        const prevcontent = this.#content;

        if (content === prevcontent) return;

        this.#content = content;

        const slot = this.#contentSlot;

        const assigned = slot.assignedElements();

        if (getTypeName(content) === getTypeName(this.#content) && assigned.length > 0) {
            for (const el of assigned) {
                (el as BindableControl).model = content;
            }
        }
        else {
            for (const el of assigned) el.remove();

            if (content !== undefined) {
                const container = document.createElement('model-control') as BindableControl;
                const template = this.#getItemTemplateContent(content);
                container.append(template.cloneNode(true));
                container.model = content;
                container.slot = 'content';
    
                this.appendChild(container);
            }
        }
    }
}