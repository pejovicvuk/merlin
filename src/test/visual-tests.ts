import { toTracked } from '../lib/dependency-tracking';
import { HtmlControl } from '../lib/html-control';
import '../lib/register-controls';

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

    text = "";
    
    get textClasses() {
        return (this.text.length & 1) === 0 ? 'odd' : 'even';
    }

    // radio

    option = 0;

    get option1() {
        return this.option === 0;
    }

    set option1(val: boolean) {
        if (val) this.option = 0;
    }

    get option2() {
        return this.option === 1;
    }

    set option2(val: boolean) {
        if (val) this.option = 1;
    }

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
}

const textModel = toTracked(new TextModel());

const contextControl = document.getElementById('context') as HtmlControl
contextControl.context = textModel;
