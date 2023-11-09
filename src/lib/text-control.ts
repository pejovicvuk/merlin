import { setOrRemoveAttribute } from "./bindable-control";
import { HtmlControl, HtmlControlProperty } from "./html-control";

export class TextControl extends HtmlControl implements HtmlControlProperty<'text', any> {
    static override observedAttributes = [...HtmlControl.observedAttributes, 'text'];
    static override bindableProperties = [...HtmlControl.bindableProperties, 'text'];

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
        this.notifyPropertySetExplicitly('text');
    }

    get textBinding() {
        return this.getAttribute('text');
    }

    get textIsExplicit() {
        return true;
    }

    onTextChanged() {
        try {
            const text = (this.isPartOfDom ? '' + this.text : '').trim();
            if (text === '') {
                this.shadowRoot!.innerHTML = '&nbsp';
            }
            else {
                this.shadowRoot!.textContent = text;
            }
        }
        catch (err) {
            this.shadowRoot!.textContent = '' + err;
        }
    }

    set textBinding(val: string | null) {
        if (val === this.textBinding) return;
        setOrRemoveAttribute(this, 'text', val);
    }
}

