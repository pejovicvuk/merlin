import { BindableControl, BindableProperty, IBindableControl, makeBindableControl } from "./bindable-control";
import { makeHtmlControlCore } from "./html-control-core";
import { cancelTaskExecution, enqueTask } from "./task-queue";

function callHandler(event: Event, type: string) {
    if (event.currentTarget === null) return;
    const element = event.currentTarget as HtmlControl;
    const attr = element.getAttribute(type);
    if (attr === null) return;
    const model = element.model;

    const func = Function("element", "event", "self", "window", "globals", "console", "top", `"use strict";return (${attr});`);
    func.call(model, element, event);
}

const events = [
    "animationcancel", "animationend", "animationiteration", "animationstart", "afterscriptexecute", "auxclick",
    "beforescriptexecute", "blur", "click", "compositionend", "compositionstart", "compositionupdate", "contextmenu",
    "copy", "cut", "dblclick", "error", "focusin", "focusout", "focus", "fullscreenchange", "fullscreenerror", "gesturechange",
    "gestureend", "gesturestart", "gotpointercapture", "keydown", "keypress", "keyup", "lostpointercapture", "mousedown",
    "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "paste", "pointercancel",
    "pointerdown", "pointerenter", "pointerleave", "pointermove", "pointerout", "pointerover", "pointerup", "scroll",
    "select", "touchcancel", "touchend", "touchmove", "touchstart", "transitioncancel", "transitionend", "transitionrun",
    "transitionstart", "wheel"
];

const eventsToEventHandlers = new Map(events.map(x => ['on-' + x, (ev: Event) => callHandler(ev, 'on-' + x)]));

export type HtmlControlProperty<T extends string, R> = BindableProperty<T, R> & {
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

export function copyProperty<T extends IHtmlControl, Property extends keyof T, PropType extends T[Property]>(ctl: T, dst: Property, src: Property, errorVal: PropType) {
    try {
        ctl[dst] = ctl[src];
    }
    catch (err) {
        ctl[dst] = errorVal;
    }
}

export function copyPropertyConverted<T extends IHtmlControl, DestProperty extends keyof T, SrcProperty extends keyof T, PropType extends T[DestProperty]>(ctl: T, dst: DestProperty, src: SrcProperty, errorVal: PropType, convert: (val: T[SrcProperty]) => T[DestProperty]) {
    try {
        ctl[dst] = convert(ctl[src]);
    }
    catch (err) {
        ctl[dst] = errorVal;
    }

}

export function makeHtmlControl(BaseClass: (new () => IBindableControl)): (new () => IHtmlControl) & { observedAttributes: string[]; bindableProperties: string[]; } {
    return class HtmlControl extends BaseClass implements IHtmlControl {
        readonly #scheduledEvaluations = new Map<string, number>();
        #lastKnownAdditionalClasses?: string

        static observedAttributes = [...BindableControl.observedAttributes, 'additionalClasses', 'on-click'];
        static bindableProperties = [...BindableControl.bindableProperties, 'additionalClasses'];

        get additionalClasses() {
            return this.getProperty<string | undefined>('additionalClasses', undefined);
        }

        readonly acceptsInheritedAdditionalClasses = false;

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
            for (const taskId of this.#scheduledEvaluations.values()) {
                cancelTaskExecution(taskId);
            }

            this.#scheduledEvaluations.clear();

            super.onDisconnectedFromDom();
        }

        override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
            super.attributeChangedCallback(name, oldValue, newValue);

            const func = eventsToEventHandlers.get(name);
            if (func !== undefined) {
                const event = name.substring(3);

                if (oldValue === null && newValue !== null) {
                    this.addEventListener(event, func);
                }
                else if (oldValue !== null && newValue === null) {
                    this.removeEventListener(event, func);
                }
            }
        }
    };
}

export const HtmlControl = makeHtmlControl(BindableControl);
export type HtmlControl = IHtmlControl;

export type HtmlInputControl = IHtmlControl & HTMLInputElement;
export const HtmlInputControl = makeHtmlControl(makeBindableControl(makeHtmlControlCore(HTMLInputElement))) as (new () => IHtmlControl & HTMLInputElement) & { observedAttributes: string[]; bindableProperties: string[]; };
