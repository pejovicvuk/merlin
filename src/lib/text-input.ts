import { HtmlControlProperty, HtmlInputControl } from "./html-control";

export class TextInput extends HtmlInputControl implements HtmlControlProperty<'text', string | undefined>, HtmlControlProperty<'hint', string | undefined> {
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'text', 'hint'];
    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'text', 'hint'];

    constructor() {
        super();
        this.addEventListener('input', TextInput.#onInput);
    }

    get text() {
        return this.getProperty<string | undefined>('text', undefined);
    }

    get acceptsInheritedText() {
        return false;
    }

    onTextChanged() {
        if (!this.isPartOfDom) return;

        try {
            const text = this.text;
            this.value = typeof text === 'string' ? text :
                text == null ? '' :
                'typeof text !== string';
        }
        catch (err) {
            this.value = '' + err;
        }
    }

    get hint() {
        return this.getProperty<string | undefined>('hint', undefined);
    }

    get acceptsInheritedHint() {
        return false;
    }

    onHintChanged() {
        if (!this.isPartOfDom) return;

        try {
            const hint = this.hint;
            this.placeholder = typeof hint === 'string' ? hint :
                hint == null ? '' :
                'typeof hint !== string';
        }
        catch (err) {
            this.value = '' + err;
        }
    }

    #onInputImpl() {
        this.writeToBindingSource('text', this.value);
    }

    static #onInput(ev: Event) {
        (ev.currentTarget as TextInput).#onInputImpl();
    }
}

