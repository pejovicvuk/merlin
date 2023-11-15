import { HtmlControl, HtmlControlProperty, HtmlInputControl } from "./html-control";

export class RadioButton extends HtmlControl implements
    HtmlControlProperty<'value', any | undefined>,  HtmlControlProperty<'option', any | undefined>{
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'value', 'option'];
    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'value', 'option'];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = '<style>:host { display: inline-flex; align-items: baseline; } label { flex: 1 0 auto; }</style><input id="input" type="radio" part="input"><label for="input" part="label"><slot name="content"></slot></label>';
        this.#input.addEventListener('change', RadioButton.#onChange);
    }

    get #input() {
        return this.shadowRoot!.querySelector('input') as HTMLInputElement;
    }

    get value() {
        return this.getProperty<boolean | undefined>('value', undefined);
    }

    readonly acceptsInheritedValue = false;

    #evaluate() {
        try {
            this.#input.indeterminate = false;
            this.#input.checked = this.value === this.option;
        }
        catch (err) {
            this.#input.indeterminate = true;
        }
    }

    onValueChanged() {
        this.#evaluate();
    }

    get option() {
        return this.getProperty<boolean | undefined>('option', undefined);
    }

    readonly acceptsInheritedOption = false;

    onOptionChanged() {
        this.#evaluate
    }

    #onChangeImpl() {
        if (this.#input.checked) {
            this.writeToBindingSource('value', this.option);
        }
    }

    static #onChange(ev: Event) {
        ((((ev.currentTarget as Element).parentNode) as ShadowRoot).host as RadioButton).#onChangeImpl();
    }
}

