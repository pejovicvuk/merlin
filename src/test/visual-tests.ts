import { toTracked } from '../lib/dependency-tracking';
import { HtmlControl } from '../lib/html-control';
import '../lib/register-controls';

class TextModel {
    text = "";

    readonly hint = "Enter text";

    get classes() {
        return (this.text.length & 1) === 0 ? 'odd' : 'even';
    }
}

const textModel = toTracked(new TextModel());

const contextControl = document.getElementById('context') as HtmlControl
contextControl.context = textModel;
