<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Database migration history
- This remix starts with an empty PostgreSQL migration journal; add future schema changes through the migration tool rather than restoring the source project history, to avoid replaying copied schema changes.

## Shipping architecture
- Resolve Indian postal suggestions from the lazy-loaded local post-office directory before remote providers, preserving town and district separately; this avoids network-dependent booking validation.
- International bookings are authenticated persisted quote requests, not confirmed courier dispatches; acceptance and final prices require provider review.
- Validate prohibited-item declaration in client/server schemas and enforce consent on shipment insertion; automated keywords do not replace operational inspection.
- District reference names permit manual entry because public datasets can lag administrative changes.
- Outgoing email uses admin-managed SMTP (smtp_settings + SMTP_PASSWORD/SMTP_USERNAME secrets) via worker-mailer in src/lib/email.functions.ts; worker-mailer uses Cloudflare sockets, so sends only work on the deployed worker.
- Hub (point role) non-cash bookings debit the hub wallet via a database trigger, so the ledger cannot be skipped by client code.
- `cloudflare:sockets` is aliased in vite.config.ts to src/lib/cloudflare-sockets-shim.ts, which loads the real module at runtime; bundlers cannot resolve the `cloudflare:` scheme and preview builds fail otherwise.

- Hero image overrides are admin-owned app settings with a bundled supplied-artwork fallback; public company reads project only safe branding fields.
- Numeric PIN autocomplete uses prebuilt prefix buckets and cached local directory reads so typing never scans the entire list.
- Staff role grants and territory writes use one admin-authorized database function to prevent partial assignments.
- Per-role fixtures live in an isolated QA draft, never in the production customer database.
- International prices are computed only in server functions (live rate API first, src/data/intl-rates.json fallback) with the admin's single signed percent adjustment from app_settings, so base rates and margins never reach the browser.
- The live rate API key lives in the SHIPGLOBAL_API_KEY server secret; an admin-saved key in gateway_configs overrides it, so the key never needs to be stored in table data.
- Worldwide city/postal suggestions use authenticated Google Places server functions for signed-in users and OpenStreetMap for visitors, so no public endpoint can spend Maps quota.
- Staff logins are created server-side by an admin (pre-confirmed, then assigned through manage_staff_assignment; the login is deleted if assignment fails) so no partial staff accounts exist.
- Parcel status changes from scans or bulk updates send the shipment_update email template through SMTP via a staff-only server function.
