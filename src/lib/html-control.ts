import { BindableControl, IBindableControlProperty, IBindableControl, makeBindableControl } from "./bindable-control";
import { makeHtmlControlCore } from "./html-control-core";
import { cancelTaskExecution, enqueTask } from "./task-queue";

const click: unique symbol = Symbol("click");

function clickHandler(ev: MouseEvent) {
    if (ev.currentTarget === null) return;
    (((ev.currentTarget as any)[click]) as undefined | ((ev: MouseEvent) => void))?.(ev);
}

export type HtmlControlProperty<T extends string, R> = IBindableControlProperty<T, R> & {
    readonly [_ in `on${Capitalize<T>}Changed`]: () => void;
};

const changedHandlerMap = new Map<string, string>();

function getChangedHanlderName(property: string) {
    let ret = changedHandlerMap.get(property);
    if (ret === undefined) {
        ret = 'on' + property[0].toUpperCase() + property.slice(1) + 'Changed';
        changedHandlerMap.set(property, ret);
    }
    return ret;
}

export interface IHtmlControl extends IBindableControl, HtmlControlProperty<'additionalClasses', string | undefined> {
}

export function makeHtmlControl(BaseClass: (new () => IBindableControl)): (new () => IHtmlControl) & { observedAttributes: string[]; bindableProperties: string[]; } {
    return class HtmlControl extends BaseClass implements IHtmlControl {
        readonly #scheduledEvaluations = new Map<string, number>();
        #additionalClasses?: string;
        #lastKnownAdditionalClasses?: string

        static observedAttributes = [...BindableControl.observedAttributes, 'additionalClasses', 'on-click'];
        static bindableProperties = [...BindableControl.bindableProperties, 'additionalClasses'];

        get additionalClasses() {
            return this.getProperty('additionalClasses', this.#additionalClasses);
        }

        set additionalClasses(val: string | undefined) {
            if (this.#additionalClasses === val) return;
            this.#additionalClasses = val;
            this.notifyPropertySetExplicitly('additionalClasses');
        }

        get additionalClassesIsExplicit() {
            return this.#additionalClasses !== undefined;
        }

        onAdditionalClassesChanged() {
            let additionalClasses: string | undefined = undefined;
            if (this.isPartOfDom) {
                try {
                    const ac = this.additionalClasses;
                    additionalClasses = typeof ac === 'string' ? ac : undefined;
                }
                catch(err) {
                    console.log(err);
                }
            }

            if (this.#lastKnownAdditionalClasses === additionalClasses) return;

            const oldClasses = this.#lastKnownAdditionalClasses?.split(/ +/);
            const newClasses = additionalClasses?.split(/ +/);

            if (oldClasses !== undefined) {
                for (const cls of oldClasses) {
                    if (newClasses === undefined || newClasses.indexOf(cls) < 0) {
                        this.classList.remove(cls);
                    }
                }
            }
            if (newClasses !== undefined) {
                for (const cls of newClasses) {
                    if (oldClasses === undefined || oldClasses.indexOf(cls) < 0) {
                        this.classList.add(cls);
                    }
                }
            }

            this.#lastKnownAdditionalClasses = additionalClasses;
        }

        #evaluatePropertyCallbackImpl(property: string): void {
            this.#scheduledEvaluations.delete(property);
            const handler = (this as Record<string, any>)[getChangedHanlderName(property)];
            if (typeof handler === 'function') handler.call(this);
        }

        #evaluatePropertyCallback = (property: string) => this.#evaluatePropertyCallbackImpl(property);

        override onPropertyChanged(property: string): void {
            if (!this.isPartOfDom) return;

            if (!this.#scheduledEvaluations.has(property)) {
                this.#scheduledEvaluations.set(property, enqueTask(this.#evaluatePropertyCallback, property));
            }

            super.onPropertyChanged(property);
        }

        override onDisconnectedFromDom(): void {
            for (const [property, taskId] of this.#scheduledEvaluations.entries()) {
                cancelTaskExecution(taskId);
                const handler = (this as Record<string, any>)[getChangedHanlderName(property)];
                if (typeof handler === 'function') {
                    try {
                        handler.call(this);
                    }
                    catch(err) {
                        console.log(err);
                    }
                }
            }

            this.#scheduledEvaluations.clear();
        }

        [click](ev: MouseEvent): void {
        }

        override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
            super.attributeChangedCallback(name, oldValue, newValue);

            if (name === "on-click") {
                if (oldValue === null && newValue !== null) {
                    this.addEventListener('click', clickHandler);
                }
                else if (oldValue !== null && newValue === null) {
                    this.removeEventListener('click', clickHandler);
                }
            }
        }
    };
}

export const HtmlControl = makeHtmlControl(BindableControl);
export type HtmlControl = IHtmlControl;

export type HtmlInputControl = IHtmlControl & HTMLInputElement;
export const HtmlInputControl = makeHtmlControl(makeBindableControl(makeHtmlControlCore(HTMLInputElement))) as (new () => IHtmlControl & HTMLInputElement) & { observedAttributes: string[]; bindableProperties: string[]; };
