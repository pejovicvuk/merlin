import { CheckBox } from './checkbox';
import { HtmlControl } from './html-control';
import { RadioButton } from './radio-button';
import { TextControl } from './text-control';
import { TextInput } from './text-input';

customElements.define('text-control', TextControl);
customElements.define('text-input', TextInput);
customElements.define('check-box', CheckBox);
customElements.define('radio-button', RadioButton);
customElements.define('model-control', HtmlControl);
