import { CheckBox } from './checkbox.js';
import { HtmlControl } from './html-control.js';
import { ItemsControl } from './items-control.js';
import { RadioButton } from './radio-button.js';
import { TextControl } from './text-control.js';
import { TextInput } from './text-input.js';

customElements.define('model-control', HtmlControl);
customElements.define('text-control', TextControl);
customElements.define('text-input', TextInput);
customElements.define('check-box', CheckBox);
customElements.define('radio-button', RadioButton);
customElements.define('items-control', ItemsControl);