import { HtmlControlProperty } from "./html-control";
import { InputControl } from "./input-control";

export class CheckBox extends InputControl implements
    HtmlControlProperty<'checked', boolean | undefined> {
    static override observedAttributes = [...InputControl.observedAttributes, 'checked', 'type'];
    static override bindableProperties = [...InputControl.bindableProperties, 'checked'];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot!.innerHTML = '<style>:host { display: inline-flex; align-items: baseline; } label { flex: 1 0 auto; }</style><input id="input" type="checkbox" part="input"><label for="input" part="label"><slot name="content"></slot></label>';
        this.input.addEventListener('change', CheckBox.#onChange);
    }

    protected get input() {
        return this.shadowRoot!.querySelector('input') as HTMLInputElement;
    }

    get checked() {
        return this.getProperty<boolean | undefined>('checked', undefined);
    }

    readonly acceptsInheritedChecked = false;

    onCheckedChanged() {
        try {
            const checked = this.checked;
            if (typeof checked === 'boolean') {
                this.input.indeterminate = false;
                this.input.checked = checked;
            }
            else {
                this.input.indeterminate = true;
            }
        }
        catch (err) {
            this.input.indeterminate = true;
        }
    }

    #onChangeImpl() {
        this.writeToBindingSource('checked', this.input.checked);
    }

    static #onChange(ev: Event) {
        ((((ev.currentTarget as Element).parentNode) as ShadowRoot).host as CheckBox).#onChangeImpl();
    }

    override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
        if (name === 'type') {
            this.input.type = newValue === 'radio' ? 'radio' : 'checkbox';
        }
        else {
            super.attributeChangedCallback(name, oldValue, newValue);
        }
    }
}

