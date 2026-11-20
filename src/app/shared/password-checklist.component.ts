import { Component, input } from '@angular/core';
import { TranslatePipe } from '../core/i18n.service';
import { PasswordCheck } from '../core/validators';
import { IconComponent } from './icon.component';

/** Live strength meter and rule checklist shown under a "new password" field. */
@Component({
  selector: 'app-password-checklist',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="strength" [attr.data-score]="check().score" aria-hidden="true">
      <span></span><span></span><span></span><span></span>
    </div>
    <p class="strength-label" aria-live="polite">{{ 'pwd.strength' + check().score | t }}</p>
    <ul class="checklist">
      @for (rule of check().rules; track rule.key) {
        <li [class.ok]="rule.ok">
          <app-icon [name]="rule.ok ? 'check' : 'x'" [size]="13" [stroke]="2.2" />{{ rule.key | t }}
        </li>
      }
    </ul>
  `
})
export class PasswordChecklistComponent {
  check = input.required<PasswordCheck>();
}
