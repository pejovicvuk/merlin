import { toTracked } from '../lib/dependency-tracking';
import { TextControl } from '../lib/text-control'
import '../lib/text-control';

const textControl = document.getElementById('text-binding') as TextControl;

class TextModel {
    result = 1;

    get classes() {
        return (this.result & 1) === 0 ? 'odd' : 'even';
    }
}

const textModel = toTracked(new TextModel());

textControl.context = textModel;

const intervalId = setInterval(() => {
    if (++textModel.result === 10) {
        clearInterval(intervalId);
    }
}, 1000);
