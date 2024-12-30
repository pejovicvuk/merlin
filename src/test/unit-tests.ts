import { testArrayTrackingBasics1, testArrayTrackingBasics2 } from './array-tracking-tests.js';
import { registerParentAndChild, registerParentThenChild, registerChildThenParent, registerGrandparentAndChildThenParent } from './html-control-core-tests.js';
import { testBasicControl, testModel } from './html-control-tests.js';
import { throwIfHasEvents } from './unit-test-interfaces.js';

const results = document.getElementById('results') as HTMLDivElement;
const playground = document.getElementById('test-playground') as HTMLDivElement;

function runTest(name: string, test: (playground: HTMLDivElement) => string | undefined | void) {
    playground.innerHTML = '';

    const div = document.createElement('div');
    div.innerText = name;

    results.appendChild(div);
    try {
        const maybeError = test(playground);
        if (typeof maybeError !== 'string') {
            div.className = 'success';
        }
        else {
            const errorDiv = document.createElement('div');
            errorDiv.innerText = maybeError;
            div.appendChild(errorDiv);
            div.className = 'failure';
        }

        throwIfHasEvents();
    }
    catch(err) {
        const errorDiv = document.createElement('div');
        errorDiv.innerText = '' + err;
        div.appendChild(errorDiv);
        div.className = 'failure';
    }    
}

runTest('Array tracking', testArrayTrackingBasics1);
runTest('Array tracking', testArrayTrackingBasics2);
runTest('Register parent and child.', registerParentAndChild);
runTest('Register parent then child.', registerParentThenChild);
runTest('Register child then parent.', registerChildThenParent);
runTest('Register grandparent and child then parent', registerGrandparentAndChildThenParent);
runTest('Basic control', testBasicControl);
runTest('Control model', testModel);

const done = document.createElement('div');
done.innerText = 'Done.'
results.appendChild(done);