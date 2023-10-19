// Returns either the closest ancestor that is a HtmlControl, or the depth
// from the top of the DOM.
function getFirstHtmlControlAncestorOrDepth(el: HtmlControl): HtmlControl | number {
    let depth = 0;
    let parent = el.parentElement;
    
    while(parent !== null) {
        if (parent instanceof HtmlControl) return parent;
        parent = parent.parentElement;
        ++depth;
    }

    return depth;
}

const topLevelControlsPerDepth: (Set<HtmlControl> | undefined)[] = [];

function getNthAncestor(el: Element, n: number): Element | null {
    while(n-- > 0) {
        const parent = el.parentElement;
        if (parent === null) return null;
        else el = parent;
    }

    return el;
}

export class HtmlControl extends HTMLElement {
    #parentOrDepth?: HtmlControl | number; // closest ancestor HtmlControl or depth from the top of the DOM if none found. undefined if not connected
    #children?: HtmlControl[];

    get isPartOfDom() {
        return this.#parentOrDepth !== undefined;
    }

    get parentControl(): HtmlControl | undefined {
        return typeof this.#parentOrDepth === 'object' ? this.#parentOrDepth : undefined;
    }

    protected onConnectedToDom(): void {
    }

    protected onDisconnectedFromDom(): void {
    }

    #connectToParent(): HtmlControl | number {
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
                set = new Set<HtmlControl>();
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
                    const child: HtmlControl = parentOrDepth.#children[--idx];

                    let search = child.parentElement!;
                    for (;;) {
                        if (search === parentOrDepth) break;
                        else if (search === this) {
                            // remove the child from parent
                            const lastIdx = parentOrDepth.#children.length - 1;
                            parentOrDepth.#children[idx] = parentOrDepth.#children[lastIdx];
                            parentOrDepth.#children.splice(lastIdx, 1);

                            // add the child to us
                            if (this.#children === undefined) this.#children = [];
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

                    if (this.#children === undefined) this.#children = [];
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
}