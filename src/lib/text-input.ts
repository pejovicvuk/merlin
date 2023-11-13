import { HtmlControlProperty, HtmlInputControl, copyPropertyConverted } from "./html-control";

function stringOrNumberToString(val: string | number | undefined): string {
    return typeof val === 'string' ? val :
        typeof val === 'number' ? val.toString():
        '';
}

function toStringOrError(text: string | undefined): string {
    return typeof text === 'string' ? text : 'typeof text === ' + typeof text;
}

export class TextInput extends HtmlInputControl implements
    HtmlControlProperty<'text', string | undefined>,
    HtmlControlProperty<'hint', string | undefined>,
    HtmlControlProperty<'minValue', string | number | undefined>,
    HtmlControlProperty<'maxValue', string | number | undefined>,
    HtmlControlProperty<'stepValue', string | number | undefined>,
    HtmlControlProperty<'customValidity', string | undefined> {

    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'text', 'hint', 'customValidity', 'minValue', 'maxValue', 'stepValue'];
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'text', 'hint', 'custom-validity', 'min-value', 'max-value', 'step-value', 'is-valid'];

    constructor() {
        super();
        this.addEventListener('input', TextInput.#onInput);
    }

    get text() {
        return this.getProperty<string | undefined>('text');
    }

    readonly acceptsInheritedText = false;

    onTextChanged() {
        copyPropertyConverted(this, 'value', 'text', '', toStringOrError);
        this.#checkValidity();
    }

    get hint() {
        return this.getProperty<string | undefined>('hint', undefined);
    }

    readonly acceptsInheritedHint = false;

    onHintChanged() {
        copyPropertyConverted(this, 'value', 'text', '',toStringOrError);
    }

    get minValue() {
        return this.getProperty<string | number | undefined>('minValue');
    }

    readonly acceptsInheritedMinValue = false;

    onMinValueChanged() {
        copyPropertyConverted(this, 'min', 'minValue', '', stringOrNumberToString);
        this.#checkValidity();
    }

    get maxValue() {
        return this.getProperty<string | number | undefined>('maxValue');
    }

    readonly acceptsInheritedMaxValue = false;

    onMaxValueChanged() {
        copyPropertyConverted(this, 'max', 'maxValue', '', stringOrNumberToString);
        this.#checkValidity();
    }

    get stepValue() {
        return this.getProperty<string | number | undefined>('stepValue');
    }

    readonly acceptsInheritedStepValue = false;

    onStepValueChanged() {
        copyPropertyConverted(this, 'step', 'stepValue', '', stringOrNumberToString);
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

