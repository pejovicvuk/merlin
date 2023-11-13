import { HtmlControlProperty, HtmlInputControl } from "./html-control";

function stringOrNumberToString(val: string | number | undefined): string {
    return typeof val === 'string' ? val :
        typeof val === 'number' ? val.toString():
        '';
}

export class TextInput extends HtmlInputControl implements
    HtmlControlProperty<'text', string | undefined>,
    HtmlControlProperty<'hint', string | undefined>,
    HtmlControlProperty<'minValue', string | number | undefined>,
    HtmlControlProperty<'maxValue', string | number | undefined>,
    HtmlControlProperty<'customValidity', string | undefined> {

    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'text', 'hint', 'customValidity', 'minValue', 'maxValue'];
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'text', 'hint', 'custom-validity', 'min-value', 'max-value', 'is-valid'];

    constructor() {
        super();
        this.addEventListener('input', TextInput.#onInput);
    }

    get text() {
        return this.getProperty<string | undefined>('text');
    }

    readonly acceptsInheritedText = false;

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

        this.#checkValidity();
    }

    get hint() {
        return this.getProperty<string | undefined>('hint', undefined);
    }

    readonly acceptsInheritedHint = false;

    onHintChanged() {
        if (!this.isPartOfDom) return;

        try {
            const hint = this.hint;
            this.placeholder = typeof hint === 'string' ? hint :
                hint == null ? '' :
                'typeof hint !== string';
        }
        catch (err) {
            this.placeholder = '' + err;
        }
    }

    get minValue() {
        return this.getProperty<string | number | undefined>('minValue');
    }

    readonly acceptsInheritedMinValue = false;

    onMinValueChanged() {
        if (!this.isPartOfDom) return;

        try {
            this.min = stringOrNumberToString(this.minValue);
        }
        catch(err) {
            this.min = '';
        }

        this.#checkValidity();
    }

    get maxValue() {
        return this.getProperty<string | number | undefined>('maxValue');
    }

    readonly acceptsInheritedMaxValue = false;

    onMaxValueChanged() {
        if (!this.isPartOfDom) return;

        try {
            this.max = stringOrNumberToString(this.maxValue);
        }
        catch(err) {
            this.max = '';
        }

        this.#checkValidity();
    }

    get customValidity() {
        return this.getProperty<string | undefined>('customValidity', undefined);
    }

    readonly acceptsInheritedCustomValidity = false;

    onCustomValidityChanged() {
        this.#checkValidity();
    }

    #checkValidity() {
        const customError = this.customValidity;
        this.setCustomValidity(typeof customError === 'string' ? customError : '');
        this.checkValidity();
        this.writeToBindingSourceByAttribute('is-valid', this.validity.valid);
    }

    #onInputImpl() {
        this.writeToBindingSource('text', this.value);
        this.#checkValidity();
    }

    static #onInput(ev: Event) {
        (ev.currentTarget as TextInput).#onInputImpl();
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (name === 'is-valid') {
            this.#checkValidity();
        }
        else {
            super.attributeChangedCallback(name, oldValue, newValue);
        }
    }
}

