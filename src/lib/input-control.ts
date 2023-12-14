import { setOrRemoveAttribute } from "./bindable-control";
import { HtmlControl } from "./html-control";

export abstract class InputControl extends HtmlControl {
    protected abstract get input(): HTMLInputElement;

    override onDisabledChanged() {
        try {
            setOrRemoveAttribute(this.input, 'disabled', this.disabled === true ? '' : null);
        }
        catch {
            this.input.removeAttribute('disabled');
        }
    }
}

