import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { I18nService } from './core/i18n.service';
import { AssistantComponent } from './shared/assistant.component';
import { LocationPromptComponent } from './shared/location-prompt.component';
import { NotificationDrawerComponent } from './shared/notification-drawer.component';
import { OverlaysComponent } from './shared/overlays.component';
import { SiteFooterComponent } from './shared/site-footer.component';
import { SiteHeaderComponent } from './shared/site-header.component';

/** Application shell: header, routed page, footer and the app-wide overlays. */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SiteHeaderComponent, SiteFooterComponent, LocationPromptComponent, AssistantComponent,
    NotificationDrawerComponent, OverlaysComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>
    <app-site-header />
    <main id="main" class="site-main">
      <router-outlet />
    </main>
    <app-site-footer />
    <app-location-prompt />
    <app-notification-drawer />
    <app-assistant />
    <app-overlays />
  `
})
export class AppComponent implements OnInit {
  private readonly i18n = inject(I18nService);

  ngOnInit(): void {
    document.documentElement.lang = this.i18n.lang();
  }
}
