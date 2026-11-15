import { Routes } from '@angular/router';
import { roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'signin', loadComponent: () => import('./pages/auth/signin.component').then(m => m.SigninComponent) },
  { path: 'signup', loadComponent: () => import('./pages/auth/signup.component').then(m => m.SignupComponent) },
  { path: 'customer-care', loadComponent: () => import('./pages/info/customer-care.component').then(m => m.CustomerCareComponent) },
  { path: 'faq', loadComponent: () => import('./pages/info/faq.component').then(m => m.FaqComponent) },
  {
    path: 'pgs/:id',
    canActivate: [roleGuard()],
    loadComponent: () => import('./pages/pg-detail/pg-detail.component').then(m => m.PgDetailComponent)
  },
  {
    path: 'pgs/:id/book',
    canActivate: [roleGuard('CUSTOMER')],
    loadComponent: () => import('./pages/booking/booking.component').then(m => m.BookingComponent)
  },
  {
    path: 'my-rents',
    canActivate: [roleGuard('CUSTOMER')],
    loadComponent: () => import('./pages/customer/my-rents.component').then(m => m.MyRentsComponent)
  },
  {
    path: 'invoice/:id',
    canActivate: [roleGuard('CUSTOMER')],
    loadComponent: () => import('./pages/customer/invoice.component').then(m => m.InvoiceComponent)
  },
  {
    path: 'owner/register-pg',
    canActivate: [roleGuard('OWNER')],
    loadComponent: () => import('./pages/owner/register-pg.component').then(m => m.RegisterPgComponent)
  },
  {
    path: 'owner/pgs/:id/edit',
    canActivate: [roleGuard('OWNER')],
    loadComponent: () => import('./pages/owner/register-pg.component').then(m => m.RegisterPgComponent)
  },
  {
    path: 'owner/dashboard',
    canActivate: [roleGuard('OWNER')],
    loadComponent: () => import('./pages/owner/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'support',
    canActivate: [roleGuard('SUPPORT')],
    loadComponent: () => import('./pages/support/support.component').then(m => m.SupportComponent)
  },
  {
    path: 'notifications',
    canActivate: [roleGuard()],
    loadComponent: () => import('./pages/notifications/notifications.component').then(m => m.NotificationsComponent)
  },
  { path: 'customer/rents', redirectTo: 'my-rents' },
  { path: 'owner/dashboards', redirectTo: 'owner/dashboard' },
  { path: '**', redirectTo: '' }
];
