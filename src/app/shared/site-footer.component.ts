import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from '../core/auth.service';
import { TranslatePipe } from '../core/i18n.service';
import { UiService } from '../core/ui.service';
import { BrandComponent } from './brand.component';

/** Dark editorial footer: brand, quick links for the visitor's role and the support contact. */
@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, TranslatePipe, BrandComponent],
  template: `
    <footer class="site-footer no-print">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <app-brand [onDark]="true" />
            <p>{{ 'footer.about' | t }}</p>
          </div>

          <div>
            <h4>{{ 'footer.explore' | t }}</h4>
            <ul>
              <li><a routerLink="/">{{ 'footer.findPg' | t }}</a></li>
              @switch (auth.role()) {
                @case ('OWNER') {
                  <li><a routerLink="/owner/register-pg">{{ 'nav.registerPg' | t }}</a></li>
                  <li><a routerLink="/owner/dashboard">{{ 'nav.dashboards' | t }}</a></li>
                }
                @case ('CUSTOMER') {
                  <li><a routerLink="/my-rents">{{ 'nav.myRents' | t }}</a></li>
                }
                @case ('SUPPORT') {
                  <li><a routerLink="/support">{{ 'nav.support' | t }}</a></li>
                }
                @default {
                  <li><a routerLink="/signup" [queryParams]="{ role: 'OWNER' }">{{ 'footer.listPg' | t }}</a></li>
                  <li><a routerLink="/signin">{{ 'nav.signin' | t }}</a></li>
                }
              }
              <li><button type="button" (click)="ui.assistantOpen.set(true)">{{ 'nav.assistant' | t }}</button></li>
            </ul>
          </div>

          <div>
            <h4>{{ 'footer.contact' | t }}</h4>
            <p>{{ 'footer.contactText' | t }}</p>
            <p><a class="footer-mail" [href]="'mailto:' + supportEmail">{{ supportEmail }}</a></p>
            <p><a class="footer-phone" [href]="'tel:' + supportPhone.replaceAll(' ', '')">{{ supportPhone }}</a></p>
            <p class="footer-hours">{{ 'care.hours' | t }}</p>
          </div>
        </div>

        <div class="footer-bottom">
          <p>© {{ year }} PG-STAY · {{ 'footer.rights' | t }}</p>
          <div>
            <a routerLink="/customer-care">{{ 'nav.customerCare' | t }}</a>
            <a [href]="'mailto:' + supportEmail">{{ 'footer.writeToUs' | t }}</a>
          </div>
        </div>
      </div>
    </footer>
  `
})
export class SiteFooterComponent {
  readonly auth = inject(AuthService);
  readonly ui = inject(UiService);
  readonly supportEmail = environment.supportEmail;
  readonly supportPhone = environment.supportPhone;
  readonly year = new Date().getFullYear();
}
