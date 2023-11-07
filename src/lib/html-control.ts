import { BindableControl, bindable } from "./bindable-control";
import { ITask, cancelTaskExecution, enqueTask, execute } from "./task-queue";

const click: unique symbol = Symbol("click");

function clickHandler(ev: MouseEvent) {
    if (ev.currentTarget === null) return;
    (((ev.currentTarget as any)[click]) as undefined | ((ev: MouseEvent) => void))?.(ev);
}

@bindable('additionalClasses')
export class HtmlControl extends BindableControl implements ITask<string> {
    readonly #scheduledEvaluations = new Map<string, number>();
    #additionalClasses?: string;
    #lastKnownAdditionalClasses?: string

    static override observedAttributes = [...BindableControl.observedAttributes, 'on-click'];

    get additionalClasses() {
        return this.getProperty('additionalClasses', this.#additionalClasses);
    }

    set additionalClasses(val: string | undefined) {
        if (this.#additionalClasses === val) return;
        this.#additionalClasses = val;
        this.setProperty('additionalClasses');
    }

    #mergeClasses() {
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

    protected evaluateProperty(property: string) {
        if (property === 'additionalClasses') {
            this.#mergeClasses();
        }
    }

    [execute](property: string): void {
        this.#scheduledEvaluations.delete(property);
        this.evaluateProperty(property);
    }

    protected override onPropertyChanged(property: string): void {
        if (!this.isPartOfDom) return;

        if (!this.#scheduledEvaluations.has(property)) {
            this.#scheduledEvaluations.set(property, enqueTask(this, property));
        }

        super.onPropertyChanged?.(property);
    }

    override onDisconnectedFromDom(): void {
        for (const [property, taskId] of this.#scheduledEvaluations.entries()) {
            cancelTaskExecution(taskId);
            this.evaluateProperty(property);
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
}
