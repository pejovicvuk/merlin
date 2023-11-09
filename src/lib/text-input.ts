import { setOrRemoveAttribute } from "./bindable-control";
import { HtmlControlProperty, HtmlInputControl } from "./html-control";

export class TextInput extends HtmlInputControl  implements HtmlControlProperty<'text', string | undefined> {
    static override observedAttributes = [...HtmlInputControl.observedAttributes, 'text'];
    static override bindableProperties = [...HtmlInputControl.bindableProperties, 'text'];

    #text?: string;

    get text() {
        return this.getProperty('text', this.#text);
    }

    set text(val: string | undefined) {
        if (this.#text === val) return;
        this.#text = val;
        this.notifyPropertySetExplicitly('text');
    }

    get textBinding() {
        return this.getAttribute('text');
    }

    get textIsExplicit() {
        return true;
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

    set textBinding(val: string | null) {
        if (val === this.textBinding) return;
        setOrRemoveAttribute(this, 'text', val);
    }

    #onInputImpl(ev: Event) {
        this.writeToBindingSource('text', this.value);
    }

    static #onInput(ev: Event) {
        (ev.currentTarget as TextInput).#onInputImpl(ev);
    }

    override onConnectedToDom(): void {
        this.addEventListener('input', TextInput.#onInput);
        super.onConnectedToDom();
    }

    override onDisconnectedFromDom(): void {
        this.removeEventListener('input', TextInput.#onInput);
        super.onDisconnectedFromDom();
    }
}

