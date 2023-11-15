import { HtmlControl, HtmlControlProperty, HtmlInputControl } from "./html-control";

export class BooleanInput extends HtmlControl implements
    HtmlControlProperty<'checked', boolean | undefined> {
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'checked', 'type'];
    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'checked'];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = '<input id="input" type="checkbox" part="input"><label for="input"><slot name="content"></slot></label>';
        this.#input.addEventListener('change', BooleanInput.#onChange);
    }

    get #input() {
        return this.shadowRoot!.querySelector('input') as HTMLInputElement;
    }

    get checked() {
        return this.getProperty<boolean | undefined>('checked', undefined);
    }

    readonly acceptsInheritedChecked = false;

    onCheckedChanged() {
        if (!this.isPartOfDom) return;

        try {
            const checked = this.checked;
            if (typeof checked === 'boolean') {
                this.#input.indeterminate = false;
                this.#input.checked = checked;
            }
            else {
                this.#input.indeterminate = true;
            }
        }
        catch (err) {
            this.#input.indeterminate = true;
        }
    }

    #onChangeImpl() {
        this.writeToBindingSource('checked', this.#input.checked);
    }

    static #onChange(ev: Event) {
        ((((ev.currentTarget as HTMLInputElement).parentNode) as ShadowRoot).host as BooleanInput).#onChangeImpl();
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (name === 'type') {
            this.#input.type = newValue === 'radio' ? 'radio' : 'checkbox';
        }
        else {
            super.attributeChangedCallback(name, oldValue, newValue);
        }
    }
}

