import { HtmlControlBindableProperty } from "./html-control";
import { InputControl } from "./input-control";

export class RadioButton extends InputControl implements
    HtmlControlBindableProperty<'value', any | undefined>, 
    HtmlControlBindableProperty<'option', any | undefined> {
    
    static override bindableProperties = [...InputControl.bindableProperties, 'value', 'option'];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = '<style>:host { display: inline-flex; align-items: baseline; } label { flex: 1 0 auto; }</style><input id="input" type="radio" part="input"><label for="input" part="label"><slot name="content"></slot></label>';
        this.input.addEventListener('change', RadioButton.#onChange);
    }

    protected get input() {
        return this.shadowRoot!.querySelector('input') as HTMLInputElement;
    }

    get value() {
        return this.getProperty<boolean | undefined>('value', undefined);
    }

    #evaluate() {
        try {
            this.input.indeterminate = false;
            this.input.checked = this.value === this.option;
        }
        catch (err) {
            this.input.indeterminate = true;
        }
    }

    onValueChanged() {
        this.#evaluate();
    }

    get option() {
        return this.getProperty<boolean | undefined>('option', undefined);
    }

    onOptionChanged() {
        this.#evaluate
    }

    #onChangeImpl() {
        if (this.input.checked) {
            this.writeToBindingSource('value', this.option);
        }
    }

    static #onChange(ev: Event) {
        ((((ev.currentTarget as Element).parentNode) as ShadowRoot).host as RadioButton).#onChangeImpl();
    }
}

