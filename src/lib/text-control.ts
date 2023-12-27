import { HtmlControl, HtmlControlBindableProperty } from "./html-control";

export class TextControl extends HtmlControl implements HtmlControlBindableProperty<'text', any> {
    static override bindableProperties = [...HtmlControl.bindableProperties, 'text'];

    constructor() {
        super();
        const shadow = this.attachShadow({mode: "open"});
        shadow.innerHTML = '<span part="text"> </span>';
    }

    get text() {
        return this.getProperty<string | undefined>('text', undefined);
    }

    onTextChanged() {
        const span = this.shadowRoot?.firstElementChild as HTMLSpanElement;
        try {
            const text = '' + this.text;
            span.textContent = text === '' ? ' ' : text;
        }
        catch (err) {
            const text = '' + err;
            span.textContent = text === '' ? ' ' : text;
        }
    }
}

