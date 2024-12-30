import { map } from "./algorithms.js";
import { AmbientProperty, BindableControl, BindableProperty } from "./bindable-control.js";
import { cancelTaskExecution, enqueTask } from "./task-queue.js";

function callHandler(event: Event, type: string) {
    if (event.currentTarget === null) return;
    const element = event.currentTarget as HtmlControl;
    if (element.disabled) return;
    
    const attr = element.getAttribute(type);
    if (attr === null) return;
    const model = element.model;

    const func = Function("element", "event", "self", "window", "globals", "console", "top", `"use strict";return (${attr});`);
    func.call(model, element, event);
}

const events = [
    "animationcancel", "animationend", "animationiteration", "animationstart", "afterscriptexecute", "auxclick",
    "blur", "click", "compositionend", "compositionstart", "compositionupdate", "contextmenu",
    "copy", "cut", "dblclick", "error", "focusin", "focusout", "focus", "fullscreenchange", "fullscreenerror", "gesturechange",
    "gestureend", "gesturestart", "gotpointercapture", "keydown", "keypress", "keyup", "lostpointercapture", "mousedown",
    "mouseenter", "mouseleave", "mousemove", "mouseout", "mouseover", "mouseup", "mousewheel", "paste", "pointercancel",
    "pointerdown", "pointerenter", "pointerleave", "pointermove", "pointerout", "pointerover", "pointerup", "scroll",
    "select", "touchcancel", "touchend", "touchmove", "touchstart", "transitioncancel", "transitionend", "transitionrun",
    "transitionstart", "wheel", "drag", "dragend", "dragenter", "dragleave", "dragover", "dragstart", "drop"
];

const eventsToEventHandlers = new Map(events.map(x => ['on-' + x, (ev: Event) => callHandler(ev, 'on-' + x)]));

export type HtmlControlBindableProperty<T extends string, R> = BindableProperty<T, R> & {
    readonly [_ in `on${Capitalize<T>}Changed`]: () => void;
};

export type HtmlControlAmbientProperty<T extends string, R> = AmbientProperty<T, R> & {
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

export class HtmlControl extends BindableControl implements
    HtmlControlBindableProperty<'classes', string | undefined>,
    HtmlControlAmbientProperty<'disabled', boolean | undefined>  {

    readonly #scheduledEvaluations = new Map<string, number>();
    #lastKnownClasses?: string

    static override readonly bindableProperties = [...BindableControl.bindableProperties, 'classes'];
    static override ambientProperties = [...BindableControl.ambientProperties, 'disabled'];
    static override readonly additionalAttributes = [...BindableControl.additionalAttributes, ...map(events, x => 'on-' + x)];

    get classes() {
        return this.getProperty<string | undefined>('classes', undefined);
    }

    onClassesChanged() {
        let classes: string | undefined = undefined;
        if (this.isPartOfDom) {
            try {
                const ac = this.classes;
                classes = typeof ac === 'string' ? ac : undefined;
            }
            catch(err) {
                console.log(err);
            }
        }

        if (this.#lastKnownClasses === classes) return;

        const oldClasses = this.#lastKnownClasses?.split(/ +/);
        const newClasses = classes?.split(/ +/);

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

        this.#lastKnownClasses = classes;
    }

    get disabled() {
        return this.getProperty<boolean | undefined>('disabled', undefined);
    }

    readonly hasExplicitDisabled = false;

    onDisabledChanged() {
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

export async function importCss(imp: ImportMeta, name: string): Promise<CSSStyleSheet> {
    const cssAddress = imp.resolve(name)
    var cssRequest = await fetch(cssAddress);
    if (!cssRequest.ok) throw new Error(`Could not load '${cssAddress}'.`);
    return await new CSSStyleSheet({ baseURL: import.meta.url }).replace(await cssRequest.text())
}
