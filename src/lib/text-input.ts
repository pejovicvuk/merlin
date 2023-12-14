import { setOrRemoveAttribute } from "./bindable-control";
import { HtmlControlProperty } from "./html-control";
import { InputControl } from "./input-control";

function stringOrNumberToStringOrNull(val: string | number | undefined | null): string | null {
    return typeof val === 'string' ? val :
        typeof val === 'number' ? val.toString() :
        val == null ? null :
        '';
}

function toStringOrErrorOrNull(text: string | undefined | null): string | null {
    return typeof text === 'string' ? text :
        text == null ? null:
        'typeof text === ' + typeof text;
}

export class TextInput extends InputControl implements
    HtmlControlProperty<'text', string | undefined>,
    HtmlControlProperty<'hint', string | undefined>,
    HtmlControlProperty<'min', string | number | undefined>,
    HtmlControlProperty<'max', string | number | undefined>,
    HtmlControlProperty<'step', string | number | undefined>,
    HtmlControlProperty<'customValidity', string | undefined> {

    static override bindableProperties = [...InputControl.bindableProperties, 'text', 'hint', 'customValidity', 'min', 'max', 'step'];
    static override observedAttributes = [...InputControl.observedAttributes, 'text', 'hint', 'custom-validity', 'min', 'max', 'step', 'is-valid', 'type', 'required'];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = '<style>:host { display: inline-flex; flex-direction: column; }</style><input part="input">';
        this.addEventListener('input', TextInput.#onInput);
    }

    protected get input() {
        return this.shadowRoot!.querySelector('input') as HTMLInputElement;
    }

    get text() {
        return this.getProperty<string | undefined>('text');
    }

    readonly acceptsInheritedText = false;

    onTextChanged() {
        try {
            this.input.value = toStringOrErrorOrNull(this.text) ?? '';
        }
        catch {
            this.input.value = '';
        }
        this.#checkValidity();
    }

    get hint() {
        return this.getProperty<string | undefined>('hint', undefined);
    }

    readonly acceptsInheritedHint = false;

    onHintChanged() {
        try {
            setOrRemoveAttribute(this.input, 'placeholder', toStringOrErrorOrNull(this.hint));
        }
        catch {
            this.input.removeAttribute('placeholder');
        }
    }

    get min() {
        return this.getProperty<string | number | undefined>('min');
    }

    readonly acceptsInheritedMin = false;

    onMinChanged() {
        try {
            setOrRemoveAttribute(this.input, 'min', stringOrNumberToStringOrNull(this.min));
        }
        catch {
            this.input.removeAttribute('min');
        }
        this.#checkValidity();
    }

    get max() {
        return this.getProperty<string | number | undefined>('max');
    }

    readonly acceptsInheritedMax = false;

    onMaxChanged() {
        try {
            setOrRemoveAttribute(this.input, 'max', stringOrNumberToStringOrNull(this.max));
        }
        catch {
            this.input.removeAttribute('max');
        }
        this.#checkValidity();
    }

    get step() {
        return this.getProperty<string | number | undefined>('step');
    }

    readonly acceptsInheritedStep = false;

    onStepChanged() {
        try {
            setOrRemoveAttribute(this.input, 'step', stringOrNumberToStringOrNull(this.step));
        }
        catch {
            this.input.removeAttribute('step');
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
        this.input.setCustomValidity(typeof customError === 'string' ? customError : '');
        this.input.checkValidity();
        this.writeToBindingSourceByAttribute('is-valid', this.input.validity.valid);
    }

    #onInputImpl() {
        this.writeToBindingSource('text', this.input.value);
        this.#checkValidity();
    }

    static #onInput(ev: Event) {
        (ev.currentTarget as TextInput).#onInputImpl();
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (name === 'is-valid') {
            this.#checkValidity();
        }
        else if (name === 'type') {
            this.input.type = newValue ?? 'text';
        }
        else if (name === 'required') {
            this.input.required = newValue != null;
        }
        else {
            super.attributeChangedCallback(name, oldValue, newValue);
        }
    }
}

