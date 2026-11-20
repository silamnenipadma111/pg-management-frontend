import { Routes } from '@angular/router';
import { guestGuard, roleGuard } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  {
    path: 'signin',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/signin.component').then(m => m.SigninComponent)
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/signup.component').then(m => m.SignupComponent)
  },
  { path: 'verify-email', loadComponent: () => import('./pages/auth/verify-email.component').then(m => m.VerifyEmailComponent) },
  { path: 'forgot-password', loadComponent: () => import('./pages/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
  { path: 'reset-password', loadComponent: () => import('./pages/auth/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'customer-care', loadComponent: () => import('./pages/info/customer-care.component').then(m => m.CustomerCareComponent) },
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
  // links used by older notifications and emails
  { path: 'customer/rents', redirectTo: 'my-rents' },
  { path: 'owner/dashboards', redirectTo: 'owner/dashboard' },
  { path: '**', redirectTo: '' }
];
