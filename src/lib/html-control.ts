import { BindableControl, bindable } from "./bindable-control";
import { ITask, cancelTaskExecution, enqueTask, execute } from "./task-queue";

@bindable('additionalClasses')
export class HtmlControl extends BindableControl implements ITask<string> {
    #additionalClasses?: string;
    #lastKnownAdditionalClasses?: string

    get additionalClasses() {
        return this.getProperty('additionalClasses', this.#additionalClasses);
    }

    set additionalClasses(val: string | undefined) {
        if (this.#additionalClasses === val) return;
        this.#additionalClasses = val;
        this.setProperty('additionalClasses');
    }

    #mergeClasses() {
        const additionalClasses = this.additionalClasses;

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

    [execute](property: string): void {
        if (property === 'additionalClasses') {
            this.#setAdditionalClassesTaskId = undefined;

            this.#mergeClasses();
        }
    }

    #setAdditionalClassesTaskId?: number;

    protected override onPropertyChanged(property: string): void {
        if (property === 'additionalClasses') {
            if (this.#setAdditionalClassesTaskId === undefined) {
                this.#setAdditionalClassesTaskId = enqueTask(this, 'additionalClasses');
            }
        }
        else {
            super.onPropertyChanged?.(property);
        }
    }

    override onDisconnectedFromDom(): void {
        if (this.#setAdditionalClassesTaskId !== undefined) {
            cancelTaskExecution(this.#setAdditionalClassesTaskId);
            this.#setAdditionalClassesTaskId = undefined;
        }
    }
}