import { CheckBox } from './checkbox.js';
import { HtmlControl } from './html-control.js';
import { ItemsControl } from './items-control.js';
import { RadioButton } from './radio-button.js';
import { TextBlock } from './text-block.js';
import { TextInput } from './text-input.js';
import { ButtonControl } from './button-control.js';

customElements.define('model-control', HtmlControl);
customElements.define('text-block', TextBlock);
customElements.define('text-input', TextInput);
customElements.define('check-box', CheckBox);
customElements.define('radio-button', RadioButton);
customElements.define('items-control', ItemsControl);
customElements.define('button-control', ButtonControl);