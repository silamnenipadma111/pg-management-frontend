# PG Management - Frontend (Angular)

Angular 19 web app for the PG (paying guest) management website. Backend (Spring Boot API):
https://github.com/padma-silamneni1/pg-management-backend

## Features
- **First visit**: pop-up to choose the content language (English / हिन्दी / తెలుగు) and allow location access.
- **Menu**: Home, Sign up / Sign in, Customer Care, FAQ's, language selector (+ role menus after sign-in).
- **Home**: nearby PGs (by browser location, radius filter) shown one by one with an image slider (next / previous arrows),
  "More Info" and "Book a request / bed" (redirects to sign-in when logged out). Filters: search by area/city/name,
  city, sharing type, rent range, gender preference, AC / non-AC, distance, sorting.
- **Sign up / Sign in** as Owner or Customer (Customer Care agents sign in with their staff account).
- **Customer**: PG details (photos, videos, facilities, rooms & rent), visual floor → room → bed booking page
  (floor plan or list view, filters for sharing / AC / rent / available only), daily / weekly / monthly / yearly booking
  (yearly can be paid monthly), *My Bookings & Rents* with tabs **My bookings / Upcoming rents / Payment history** and printable invoices.
- **Owner**: *Register PG's* (photos/videos upload, facilities, floors, rooms, beds, availability, sharing, daily/weekly/monthly rent;
  edit existing PGs), *Dashboards* per PG or all PGs: **Availability** (click beds to mark available / not available),
  **Approvals** (booking requests with customer contact details, payments to accept), **Pending rents**, bookings.
- **Bed status flow**: request → *Blocked*; owner approves → customer pays → owner accepts payment → *Booked* + invoice.
- **Customer Care**: support phone/email + call-back form (owners can choose "Register my PG");
  the support console lets an agent register a PG on an owner's behalf with the same mandatory details.
- Notifications (bell icon) for booking requests, approvals, payments.

## Run locally
Requires Node.js 18.19+ (20 LTS recommended) and the backend running on http://localhost:8080.
```bash
npm install
npm start            # http://localhost:4200
```
Demo accounts (password `Password@123`): `customer@pgstay.in`, `owner@pgstay.in`, `support@pgstay.in`.

## Configuration
- `src/environments/environment.ts` – local dev: API calls go to the same origin and `npm start` proxies `/api` and `/uploads` to `http://localhost:8080` (`proxy.conf.json`).
- `src/environments/environment.prod.ts` – production API URL, support phone and email. **Set `apiUrl` to your API domain**
  (e.g. `https://api.yourdomain.com`) before building for production.
- Translations: `src/app/core/translations.ts` (missing Hindi/Telugu keys fall back to English).

## Build
```bash
npm run build        # output: dist/pg-management-frontend/browser
```

## Hosting on GoDaddy (cPanel / Web Hosting)
1. `npm run build`
2. In GoDaddy cPanel → **File Manager** → `public_html` (or the folder of your domain/sub-domain),
   upload **everything inside** `dist/pg-management-frontend/browser/` – including the hidden `.htaccess`
   (enable "Show Hidden Files"). Zip + "Extract" in File Manager is fastest.
3. `.htaccess` (from `public/.htaccess`) rewrites all routes to `index.html` so deep links like `/my-rents` work,
   and enables compression/caching. Uncomment the HTTPS redirect once SSL is active (cPanel → SSL/TLS Status).
4. The Spring Boot API cannot run on shared hosting – host it on a GoDaddy VPS (see the backend README),
   point `api.yourdomain.com` to it and add your site URL to the API's `CORS_ALLOWED_ORIGINS`.

Upload via FTP instead: cPanel → FTP Accounts, then e.g. `lftp -u user,pass ftp.yourdomain.com -e "mirror -R dist/pg-management-frontend/browser public_html; quit"`.
