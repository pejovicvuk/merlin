import { HtmlControl, HtmlControlProperty } from "./html-control";

export class TextControl extends HtmlControl implements HtmlControlProperty<'text', any> {
    static override observedAttributes = [...HtmlControl.observedAttributes, 'text'];
    static override bindableProperties = [...HtmlControl.bindableProperties, 'text'];

    constructor() {
        super();
        this.attachShadow({mode: "open"});
    }

    get text() {
        return this.getProperty<string | undefined>('text', undefined);
    }

    readonly acceptsInheritedText = false;

    onTextChanged() {
        try {
            const text = '' + this.text;
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
}

