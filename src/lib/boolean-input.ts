import { HtmlControlProperty, HtmlInputControl } from "./html-control";

export class BooleanInput extends HtmlInputControl implements HtmlControlProperty<'checkedValue', string | undefined> {
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'checked-value'];
    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'checkedValue'];

    constructor() {
        super();
        this.addEventListener('change', BooleanInput.#onChange);
    }

    get checkedValue() {
        return this.getProperty<string | undefined>('checkedValue', undefined);
    }

    readonly acceptsInheritedCheckedValue = false;

    onCheckedValueChanged() {
        if (!this.isPartOfDom) return;

        try {
            const checked = this.checkedValue;
            if (typeof checked === 'boolean') {
                this.indeterminate = false;
                this.checked = checked;
            }
            else {
                this.indeterminate = true;
            }
        }
        catch (err) {
            this.indeterminate = true;
        }
    }

    #onChangeImpl() {
        this.writeToBindingSource('checkedValue', this.checked);
    }

    static #onChange(ev: Event) {
        (ev.currentTarget as BooleanInput).#onChangeImpl();
    }
}

