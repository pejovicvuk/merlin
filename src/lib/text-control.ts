import { bindable } from "./bindable-control";
import { HtmlControl } from "./html-control";
import { ITask } from "./task-queue";

@bindable('text')
export class TextControl extends HtmlControl implements ITask<string> {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
    }

    #text?: any;

    get text() {
        return this.getProperty('text', this.#text);
    }

    set text(val: any) {
        if (this.#text === val) return;
        this.#text = val;
        this.setProperty('text');
    }

    get textBinding() {
        return this.getAttribute('text');
    }

    set textBinding(val: string | null) {
        if (val === this.textBinding) return;
        this.setOrRemoveAttribute('text', val);
    }

    #setShadowText() {
        try {
            this.shadowRoot!.textContent = this.isPartOfDom ? '' + this.text : '';
        }
        catch (err) {
            this.shadowRoot!.textContent = '' + err;
        }
    }

    protected override evaluateProperty(property: string): void {
        if (property === 'text') this.#setShadowText();
        else super.evaluateProperty(property);
    }

}

customElements.define('text-control', TextControl);