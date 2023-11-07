import { bindable } from "./bindable-control";
import { HtmlControl } from "./html-control";
import { ITask, cancelTaskExecution, enqueTask, execute } from "./task-queue";

@bindable('text')
export class TextControl extends HtmlControl implements ITask<string> {
    constructor() {
        super();

        this.attachShadow({mode: "open"});
    }

    #text?: any;

    get text() {
        return this.getProperty('text', this.#text);
    }

    set text(val: any) {
        if (this.#text === val) return;
        this.#text = val;
        this.setProperty('text');
    }

    get textBinding() {
        return this.getAttribute('text');
    }

    set textBinding(val: string | null) {
        if (val === this.textBinding) return;
        this.setOrRemoveAttribute('text', val);
    }

    [execute](property: string): void {
        if (property === 'text') {
            this.#setTextTaskId = undefined;

            try {
                this.shadowRoot!.textContent = '' + this.text;
            }
            catch (err) {
                this.shadowRoot!.textContent = '' + err;
            }
        }
        else {
            super[execute](property);
        }
    }

    #setTextTaskId?: number;

    protected override onPropertyChanged(property: string): void {
        if (property === 'text') {
            if (this.#setTextTaskId === undefined) {
                this.#setTextTaskId = enqueTask(this, 'text');
            }
        }
        else {
            super.onPropertyChanged(property);
        }
    }

    override onDisconnectedFromDom(): void {
        if (this.#setTextTaskId !== undefined) {
            cancelTaskExecution(this.#setTextTaskId);
            this.#setTextTaskId = undefined;
        }
    }
}

customElements.define('text-control', TextControl);