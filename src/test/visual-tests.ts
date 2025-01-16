import { sleepAsync, toTracked, HtmlControl } from '../lib/index.js';
import '../lib/register-controls.js';

class TextModel {
    // check boxes

    red = true;
    blue = false;

    get redAndBlue() {
        return this.red === this.blue ? this.red : undefined;
    }

    set redAndBlue(val: boolean | undefined) {
        if (val === undefined) return;

        this.red = this.blue = val;
    }

    // text

    get hint() {
        return this.red && this.blue ? 'Red and Blue' :
            this.red ? 'Red' :
            this.blue ? 'Blue' :
            '';
    }

    text = "a";
    
    get oddOrEven() {
        return (this.text.length & 1) === 0 ? 'odd' : 'even';
    }

    // radio

    radio = 0;

    // pickers

    time = "";
    date = "";
    color = "";
    month = "";

    readonly minDate = "2020-01-01";
    readonly maxDate = "2030-01-01";

    isDateValid = false;

    get dateCheck() {
        return this.isDateValid ? this.date : "invalid";
    }

    // validity text

    email = 'bad';

    get emailCustomValidity() {
        const at = this.email.indexOf('@');
        return at <= 0 || at + 1 == this.email.length ? 'Must enter email' : undefined;
    }

    isEmailValid = false;

    get emailValidationMessage(){
        return this.isEmailValid ? 'good' : 'bad';
    }

    // number

    number = "10";
    numberValid = false;

    clicked(ev: MouseEvent) {
        alert(ev.button);
    }

    // disable
    enabled = true;

    array = toTracked([1, 2, 3]);

    onButtonClicked(ev: MouseEvent) {
        alert('Button!');
    }
}

const textModel = toTracked(new TextModel());

const modelControl = document.getElementById('model') as HtmlControl
modelControl.model = textModel;

for (let i = 0; i < 6; i++) {
    await sleepAsync(1000);
    textModel.array.push(textModel.array.length + 1);
}

await sleepAsync(1000);
textModel.array[1] = 0;

await sleepAsync(1000);
textModel.array.splice(2, 0, 9, 9, 9);

await sleepAsync(1000);
textModel.array.splice(5, 1);
