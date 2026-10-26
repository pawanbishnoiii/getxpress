# GetXpress roadmap

## Current requested batch
- [x] Remix setup: secrets updated, migration history reset, Google Maps linked
- [x] Bnoy Delivery database replaced with full GetXpress schema + file folders
- [ ] Country-code picker and +91 phone prefix on every booking form + phone validation test
- [ ] Live bill that updates while filling the ship form
- [ ] Hub booking with wallet payment + customer booking end-to-end test
- [ ] Admin manual user creation with role (no verification) + hub account test
- [ ] Admin control of optional/hidden form fields (district hidden by default)
- [ ] Mobile-friendly hub screen; scan many parcels into one bag; bag/seal labels
- [ ] Moving delivery-vehicle banner animation; upgraded offer codes; role dashboard review
- [ ] Supplied landing hero with admin replacement control and branded banners
- [ ] Faster indexed PIN search and booking contact/billing fields
- [ ] Staff role and territory management
- [ ] Company dashboard charts and wallet transaction sheet with search/help
- [ ] Isolated role-test environment and admin demo fixtures
- [ ] Shiprocket documented configuration; live calls require credentials
- [ ] Preview and regression verification

## Done
- New GetXpress logo everywhere (light version on dark sidebar)
- Onboarding: no placeholder email, verified phone chip, state + district only
- AI address check page for staff
- Orders: multi-sort, pincode/date filters, bulk status, CSV + Excel
- Audit log (orders, roles, providers, WhatsApp, parcel scans) with live view
- Fullscreen button, dashboard quick actions, database migrations started
- PIN lookup: 26,711 codes with town/post-office suggestions; imported into the database
- All-state district selectors, optional onboarding PIN and required WhatsApp
- Domestic booking tested through test-code confirmation, bill and tracking read-back
- International quote form tested with saved request and reference; no live international dispatch
- Landing photograph/footer refreshed, GSAP retained, reduced-motion Lottie added
- Tracking progress, parcel IDs, refresh, copy link and missing/error states
- Admin parcel/service/handling prices and policy consent; prohibited-item screening
- Reviewed migration conflict, applied additive shipping fields and quote request storage
- Available admin dashboard/pages visited; role navigation tests passed
- International quote read back on admin dashboard; onboarding Raisinghnagar search verified
- Public sitemap and unique page metadata checked; all 57 tests passed

## Open
- Live Maps rendering/reverse lookup — user must test on an authorized deployed origin
- Other-role live dashboard checks and account creation — need isolated test environment or approved real staff identities
- WhatsApp OTP + "WhatsApp off" banner + admin settings — waiting on TezSender API example
- Branded email notifications — needs an email domain set up
- Real support WhatsApp number (currently placeholder)
- Final legal policy approval, exact refund fees/timing and liability terms — business owner confirmation needed
- [ ] Real payment/SMS/courier API calls + partner webhooks (blocked: partner API keys/docs)
- [ ] Per-role test accounts check (blocked: needs isolated test environment)
- [ ] New landing photography + advanced GSAP motion pass

## Remix setup
- [x] Update SMTP_PASSWORD and SMTP_USERNAME through secure forms
- [x] Link managed Google Maps to this remix
- [x] Remove copied migrations and snapshots; initialize empty PostgreSQL journal without changing stored data
- [x] Repair malformed SMTP page header blocking preview

## Oct 23 batch
- [x] Warehouse hero photo with branding + female ops lead
- [x] GXQ international references trackable on /track
- [x] Removed /address-check; dashboard greeting removed
- [x] Users list includes every account
- [ ] Isolated test setup + per-role accounts (needs a separate test backend)
- [ ] International: auto dial code per country, 8–12 city suggestions
- [ ] Staff console rework (country → number → user → area/hub PIN; 28 states; UT list; area names)
- [x] Manual UPI/bank deposit with UTR + photo, admin approval credits wallet
- [x] Staff assignment (user → role → state → area → hub PIN) + territory map
- [ ] network/state manager/hub dashboards & CRM
- [ ] Admin on/off for roles and services; email logo + automation upgrade; GSAP scroll effect
- [x] Tracking question box with code entry on /track; international air-weight + customs checklist; hero regenerated; phone sign-in without photo

## Batch 2026-10-23
- [x] /calculator with rate card, destination pincode, products, hidden admin margin
- [x] Shipping desk redesign; torn-poster footer; email sign-in code via SMTP
- [ ] 5:2 layered hero images + 10 generated icons + more GSAP
- [ ] Manifest page; barcode tracking upgrade; Shiprocket credential form test
- [ ] Company-style desktop dashboard; demo-data button; full staff management
- [ ] Booking form + Need Help end-to-end retest

## Oct 23 batch
- [x] International live prices (GetXpress.in names, customer price only, admin key + hidden margin)
- [x] Manual gateway: admin UPI/bank details shown in hub wallet; UTR deposits approved by admin
- [ ] Email OTP for signup via SMTP
- [ ] Hero redesign (5:2 layered), 10 icons, more GSAP
- [ ] Manifest page, barcode tracking upgrade
- [ ] Company-style dashboard, demo data button, staff management upgrade
- [ ] Booking form + Need Help end-to-end test; Shiprocket form test
- [ ] Hubs managing international shipping

## Oct 24 batch
- [x] Coupon check works for signed-out users (server-side validation)
- [x] Tab/Enter picks highlighted PIN/location suggestion
- [x] Wallet transactions hidden from customers (hub/staff/admin only)
- [x] Admin can edit and delete offers
- [ ] Email sign-up code via SMTP
- [ ] /international: two-step form, city/postal suggestions, icons, separate calculator button
- [ ] Admin international price gateway page (host URL, API key, webhook, result renaming)
- [ ] Dashboard search, AI help tickets, company dashboard + demo data, staff/hub intl controls, barcode upgrade
- [ ] E2E tests: booking, Need Help, Shiprocket

## Oct 24 batch
- [x] App pointed back at this project's own database (fixes blank/erroring admin pages); missing profile-on-signup step restored
- [x] Starting settings, email templates, 26,711 PIN codes and delivery prices loaded
- [x] International live prices: base URL saved, key stored securely, service turned on, live quote verified
- [x] One adjustment at a time: +% margin or −% discount (admin gateways + calculator)
- [x] Calculator: postal/city suggestions for every country (Google for signed-in, OSM for visitors), auto postal code
- [x] "Start here" block removed; Ship a parcel form kept
- [x] Admin creates hub/network/area/state staff logins with email + password (no verification)
- [x] Parcel status emails from scans and bulk updates; SMTP test email delivered (250 OK)
- [x] Browser-verified with a temporary test account (removed afterwards): scan, company dashboard, order search, help ticket AI answer, quote request, staff account creation
- [ ] Parcel size price editor shows no rows (stored ids don't match built-in sizes; booking uses built-in prices) — needs a small data-model decision

## Oct 24 Diwali batch
- [ ] Dashboard crash fix (summary data shape)
- [ ] Offers dynamic + one-tap claim (landing, booking promo box)
- [ ] Country pickers: type, suggestions, flags, dial codes (calculator + international)
- [ ] Calculator: weight per piece as the main field
- [ ] Diwali hero banner, transport PNGs, icon set, new fonts, GSAP upgrade; Ship a parcel first
- [ ] Parcel sizes & handling prices editor wired to booking price
- [ ] Admin page to create hub/network/area cluster manager accounts
- [ ] Hub workspace: orders, shipments, tracking
- [ ] International quote reference → booking form; status timeline on /track
- [ ] Wallet for all users: add money, pay bookings from wallet, admin approvals/adjustments
