import { Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe } from '../core/i18n.service';
import { UiService } from '../core/ui.service';
import { IconComponent } from './icon.component';
import { initialsOf } from './user-menu.component';

export interface DashTab {
  key: string;
  /** Translation key. */
  label: string;
  icon: string;
  count?: number | null;
}

/**
 * Dashboard frame shared by the customer ("My Bookings & Rents") and owner dashboards: a profile card,
 * section tabs with counters and a help box in the sidebar; the page content is projected into the main column.
 * On small screens the tabs become a horizontal strip above the content.
 */
@Component({
  selector: 'app-dash-layout',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="container dash">
      <aside class="dash-side no-print">
        <div class="dash-side-inner">
          <div class="card profile-card">
            <span class="avatar avatar-lg">{{ initials() }}</span>
            <div class="profile-text">
              <p class="eyebrow">{{ badge() }}</p>
              <h2 class="display">{{ name() }}</h2>
              <p class="muted small">{{ sub() }}</p>
            </div>
          </div>

          <nav class="card dash-nav" [attr.aria-label]="'dash.sections' | t">
            @for (tab of tabs(); track tab.key) {
              <button type="button" [class.active]="tab.key === active()" (click)="tabChange.emit(tab.key)"
                      [attr.aria-current]="tab.key === active() ? 'page' : null">
                <span class="dash-nav-label"><app-icon [name]="tab.icon" [size]="18" />{{ tab.label | t }}</span>
                @if (tab.count !== null && tab.count !== undefined) { <span class="count">{{ tab.count }}</span> }
              </button>
            }
          </nav>

          <div class="help-box">
            <p class="eyebrow">{{ 'dash.helpEyebrow' | t }}</p>
            <h3 class="display">{{ 'dash.helpTitle' | t }}</h3>
            <p>{{ 'dash.helpText' | t }}</p>
            <button type="button" class="btn btn-glass block" (click)="ui.assistantOpen.set(true)">
              {{ 'dash.helpAction' | t }} <app-icon name="arrow-right" [size]="14" />
            </button>
          </div>
        </div>
      </aside>

      <div class="dash-main">
        <div class="dash-tabs-mobile no-print" role="tablist">
          @for (tab of tabs(); track tab.key) {
            <button type="button" role="tab" [class.active]="tab.key === active()" [attr.aria-selected]="tab.key === active()"
                    (click)="tabChange.emit(tab.key)">
              {{ tab.label | t }}
              @if (tab.count) { <span class="count">{{ tab.count }}</span> }
            </button>
          }
        </div>
        <ng-content />
      </div>
    </div>
  `
})
export class DashLayoutComponent {
  readonly ui = inject(UiService);
  /** Small gold line above the name, e.g. "PG OWNER". */
  badge = input('');
  name = input('');
  sub = input('');
  tabs = input<DashTab[]>([]);
  active = input('');
  tabChange = output<string>();
  initials = computed(() => initialsOf(this.name()));
}
