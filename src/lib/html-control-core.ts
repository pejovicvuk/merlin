// Returns either the closest ancestor that is a HtmlControl, or the depth
// from the top of the DOM.
function getFirstHtmlControlAncestorOrDepth(el: HtmlControlCore): HtmlControlCore | number {
    let depth = 0;
    let parent = el.parentElement;
    
    while(parent !== null) {
        if (parent instanceof HtmlControlCore) return parent;
        parent = parent.parentElement;
        ++depth;
    }

    return depth;
}

const topLevelControlsPerDepth: (Set<HtmlControlCore> | undefined)[] = [];

function getNthAncestor(el: Element, n: number): Element | null {
    while(n-- > 0) {
        const parent = el.parentElement;
        if (parent === null) return null;
        else el = parent;
    }

    return el;
}

// Provides a base class for all custom HTMLElements in out library. Basically adds a consistent, synchronous view of the parent-child
// relationships between various controls by adding two methods and two getters:
// protected onConnectedToDom - called when an element is attached to the DOM or when it's parent HtmlControlCore has changed
// protected onDisconnectedFromDom - called when an element is detached from the DOM
// get isPartOfDom - returns whether an element is part of the DOM
// get parentControl - returns the parent HtmlCoreControl if any
//
// The reason for this class is that, depending on the browser queue and when customElements.define is called, the parent HtmlControl
// may change while the page is loading. The above callbacks provide a consistent interface for getting the parent HtmlControl.

export class HtmlControlCore extends HTMLElement {
    #parentOrDepth?: HtmlControlCore | number; // closest ancestor HtmlControl or depth from the top of the DOM if none found. undefined if not connected
    #children?: HtmlControlCore[];

    get isPartOfDom() {
        return this.#parentOrDepth !== undefined;
    }

    get parentControl(): HtmlControlCore | undefined {
        return typeof this.#parentOrDepth === 'object' ? this.#parentOrDepth : undefined;
    }

    protected onConnectedToDom(): void {
    }

    protected onDisconnectedFromDom(): void {
    }

    #connectToParent(): HtmlControlCore | number {
        const parent = getFirstHtmlControlAncestorOrDepth(this);

        this.#parentOrDepth = parent;

        if (typeof parent === 'object') {
            if (parent.#parentOrDepth === undefined) parent.#connectToParent();

            if (parent.#children === undefined) parent.#children = [];
            parent.#children.push(this);
        }
        else {
            let set = topLevelControlsPerDepth[parent];
            if (set === undefined) {
                set = new Set<HtmlControlCore>();
                topLevelControlsPerDepth[parent] = set;
            }
            set.add(this);
        }

        this.onConnectedToDom();

        return parent;
    }

    connectedCallback() {
        if (this.#parentOrDepth !== undefined) return;
        
        const parentOrDepth = this.#connectToParent();

        if (typeof parentOrDepth === 'object') {
            // in case we are between our parent and our children and we are only now getting the connectedCallback
            // (probably because our customElements.define was not called until now), see if any children currently attached to
            // the parent are actually our children and reconnect them here
            if (parentOrDepth.#children !== undefined)  {
                let idx = parentOrDepth.#children.length;
                while(idx > 0) {
                    const child: HtmlControlCore = parentOrDepth.#children[--idx];

                    let search = child.parentElement!;
                    for (;;) {
                        if (search === parentOrDepth) break;
                        else if (search === this) {
                            // remove the child from parent
                            const lastIdx = parentOrDepth.#children.length - 1;
                            parentOrDepth.#children[idx] = parentOrDepth.#children[lastIdx];
                            parentOrDepth.#children.splice(lastIdx, 1);

                            // add the child to us
                            this.#children ??= [];
                            this.#children.push(child);

                            child.#parentOrDepth = this;
                            child.onConnectedToDom();

                            break;
                        }
                        else {
                            search = search.parentElement!;
                        }
                    }
                }
            }
        }
        else {
            // in case we are a top-level control that is only now getting the connectedCallback
            // (probably because our customElements.define was not called until now), see if there are any
            // top-level elements that are actually our children and adopt them

            for (let depth = parentOrDepth + 1; depth < topLevelControlsPerDepth.length; ++depth) {
                const set = topLevelControlsPerDepth[depth];
                if (set === undefined) continue;

                let childrenStart = this.#children === undefined ? 0 : this.#children.length;
                for (const ctl of set) {
                    if (getNthAncestor(ctl, depth - parentOrDepth) !== this) continue;

                    this.#children ??= [];
                    this.#children.push(ctl);
                }

                if (this.#children !== undefined) {
                    for (let idx = childrenStart; idx < this.#children.length; ++idx) {
                        const child = this.#children[idx];
                        set.delete(child);
                        child.#parentOrDepth = this;
                        child.onConnectedToDom();
                    }
                }
            }
        }
    }

    #disconnectChildrenAndSelfRecursively() {
        const children = this.#children;
        if (children !== undefined) {
            this.#children = undefined;
            for (const child of children) {
                child.#disconnectChildrenAndSelfRecursively();
            }
        }

        this.#parentOrDepth = undefined;

        this.onDisconnectedFromDom();
    }

    disconnectedCallback() {
        const parent = this.#parentOrDepth;
        if (parent === undefined) return; // already disconnected by the parent control as it got the disconnectedCallback before us

        this.#disconnectChildrenAndSelfRecursively();
        
        if (typeof parent === 'number') {
            topLevelControlsPerDepth[parent]!.delete(this);
        }
        else if (typeof parent === 'object' && parent.#children !== undefined) {
            const idx = parent.#children.indexOf(this);
            if (idx >= 0) parent.#children.splice(idx, 1);
        }
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    }
}