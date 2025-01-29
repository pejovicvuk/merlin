import { setOrRemoveAttribute } from "./bindable-control.js";
import { HtmlControl } from "./html-control.js";

export abstract class InputControl extends HtmlControl {
    protected abstract get input(): HTMLInputElement;

    override onEnabledChanged() {
        try {
            setOrRemoveAttribute(this.input, 'disabled', this.enabled === false ? '' : null);
        }
        catch {
            this.input.removeAttribute('disabled');
        }
    }
}

