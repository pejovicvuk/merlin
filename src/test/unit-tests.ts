import { registerParentAndChild, registerParentThenChild, registerChildThenParent, registerGrandparentAndChildThenParent } from './html-control-core-tests';
import { testBasicControl, testContext } from './html-control-tests';

const results = document.getElementById('results') as HTMLDivElement;
const playground = document.getElementById('test-playground') as HTMLDivElement;

async function runTest(name: string, test: (playground: HTMLDivElement) => Promise<string | undefined | void>) {
    playground.innerHTML = '';

    const div = document.createElement('div');
    div.innerText = name;

    results.appendChild(div);
    try {
        const maybeError = await test(playground);
        if (typeof maybeError !== 'string') {
            div.className = 'success';
        }
        else {
            const errorDiv = document.createElement('div');
            errorDiv.innerText = maybeError;
            div.appendChild(errorDiv);
            div.className = 'failure';
        }
    }
    catch(err) {
        const errorDiv = document.createElement('div');
        errorDiv.innerText = '' + err;
        div.appendChild(errorDiv);
        div.className = 'failure';
    }    
}

await runTest('Register parent and child.', registerParentAndChild);
await runTest('Register parent then child.', registerParentThenChild);
await runTest('Register child then parent.', registerChildThenParent);
await runTest('Register grandparent and child then parent', registerGrandparentAndChildThenParent);
await runTest('Basic control', testBasicControl);
await runTest('Control context', testContext);

const done = document.createElement('div');
done.innerText = 'Done.'
results.appendChild(done);