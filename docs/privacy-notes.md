# Privacy notes (technical facts)

Status: Phase 5, 2026-10-19.

This file lists **technical facts** about how the website handles data. It is input for whoever writes the privacy policy (Datenschutzerklärung) and the records of processing. **It is not legal text and not legal advice.** The privacy policy itself is entered by the association in the CMS (`Datenschutzerklärung`) and should be reviewed by a qualified person.

## Visitors who only read

| Topic | Fact |
|---|---|
| Cookies | None. No language cookie (next-intl's cookie is switched off), no theme cookie, no analytics, no consent banner script. Checked by an end-to-end test on every page in every language |
| Local storage | None |
| Third-party requests | None. Fonts are self-hosted; there are no CDNs, embeds (video, maps), social widgets, payment widgets or analytics. Checked by an end-to-end test (public pages and the CMS) |
| Content Security Policy | The browser may load scripts, styles, images, fonts and connections from the website's own origin only (`default-src 'self'`, no external host allowed). See [Security headers](#security-headers) |
| Server logs | The application logs errors and operational events (start-up, migrations, the nightly retention job). It does not log page views, IP addresses or form contents. **To be decided at deployment:** the reverse proxy (Caddy) writes access logs with IP addresses unless configured otherwise; their retention must be set (Phase 6) |
| Hosting | `[PLACEHOLDER: hosting provider and location]`. Database: PostgreSQL in the same deployment. Media files: S3-compatible storage, `[PLACEHOLDER: provider and EU region]` |

## Forms

There are two forms: the **membership application** and the **contact form**. Both are processed on the website's own server and stored only in the website's own PostgreSQL database.

### Data collected

| Form | Fields | Notes |
|---|---|---|
| Membership application | first name, last name, e-mail, street and number, postcode, city, country, type of membership (ordinary / supporting), "at least 16" (checkbox), "under 18" (checkbox), declarations on principles/aims (Satzung §§ 2–3) and fees (§ 4), consent | Only the fields the Satzung requires (plan §6). **Not collected:** date of birth, phone, gender, nationality, religion, bank details, free text |
| — applicants under 18 | name and e-mail of a parent or guardian | Stored only when "under 18" is ticked; otherwise discarded on the server even if typed in. The association obtains the consent itself (e.g. in writing) and records the date in the CMS; an application cannot be accepted before that date is recorded. Which form of consent is sufficient is for the board to decide |
| Contact | name, e-mail, topic (fixed list), message (max. 5000 characters), consent | |

**Stored with each submission:** the language of the form, the time of submission, and the **consent record**: that consent was given, when, the version of the privacy policy at that time (field "Version" of the privacy-policy page in the CMS) and the exact wording of the consent checkbox shown.

**Not stored:** IP address, browser (user agent), referrer, or any tracking identifier. The membership applications and contact messages contain only the fields listed above (checked by an end-to-end test).

### Who can see submissions

- Only CMS accounts with the role **board** or **admin**. Editors (role "editor") cannot see them, neither in the CMS nor through the API.
- Not readable or writable through the public API (checked by end-to-end tests).
- Membership applications can only be deleted by administrators; contact messages also by the board.

### Retention (decided by the association: six months)

A scheduled job runs every night at 03:00 (server time) and deletes:

| What | When |
|---|---|
| Contact messages | six months after they arrived |
| Rejected membership applications | six months after the decision (decision date is recorded automatically when the status changes) |
| Rate-limit counters | as soon as they expire (at most one day) |

**Not deleted automatically:** accepted applications (they become member records; their retention follows the association's membership administration) and applications still marked "received" (waiting for a decision). **To decide:** whether accepted applications should be moved out of the website's database into the association's member administration and deleted here.

Backups of the database (Phase 6) contain submissions until the backup itself expires; the backup retention period is still to be decided.

### E-mail notifications

- When something arrives, an e-mail can be sent to `NOTIFY_EMAIL` (`info@yop-ye.org`). It contains **no personal data**: only "a new entry arrived" and a link to the entry in the CMS (which requires signing in). Checked by a unit test.
- Applicants and guardians receive **no automatic e-mails** from the website. The association replies personally.
- Sending requires an SMTP server (`SMTP_*` settings). `[PLACEHOLDER: e-mail provider]`. Without SMTP settings nothing is sent.

### Spam protection without third parties

- **No reCAPTCHA** or other external service.
- A hidden **honeypot** field (invisible, skipped by keyboard and screen readers).
- A **signed timestamp** in the form: submissions faster than 3 seconds or older than 24 hours are not accepted.
- **Rate limiting:** at most 5 submissions per 10 minutes and 20 per day per form and address; sign-in to the CMS at most 20 attempts per 10 minutes and 100 per day per address. The address is not stored: the counter's key is an HMAC of the address with a random secret that exists only in the server's memory and is replaced every day, so a stored key cannot be traced back to an address. Counters expire after at most one day and are deleted.

## CMS (editors only)

| Topic | Fact |
|---|---|
| Cookie | One cookie, `payload-token`, set **only after an editor signs in** at `/admin`: HttpOnly, Secure (in production), SameSite=Strict, valid for 2 hours |
| Accounts | Name, e-mail, role, password hash. No public sign-up: accounts are created by an administrator or on the server (`npm run create-admin`) |
| Sign-in protection | Account locked for 15 minutes after 5 wrong passwords; per-address limit (see above); passwords of at least 12 characters |
| Password reset | By e-mail (requires SMTP). Without SMTP settings, no e-mail is sent and nothing is written to the logs |
| Account pictures | A neutral icon. Payload's default (Gravatar, which would send a hash of the e-mail address to a third party) is switched off |
| Two-factor authentication | Not built in (see plan §23 for the options) |

## Security headers

Sent on every response (pages, API, CMS, files):

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` (no `preload` yet: hard to undo) |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| X-Robots-Tag (CMS only) | `noindex, nofollow` |

`'unsafe-inline'` for scripts is required by Next.js for pages served from the cache (plan §11). There are no third-party scripts and no user-supplied HTML.
