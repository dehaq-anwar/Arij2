# Privacy notes (technical facts)

Status: Phase 5, 2026-10-19; Control Center CC-0 and CC-1, 2026-10-20.

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

- Only accounts with the roles **super administrator**, **board administrator** or **membership manager** (CC-0, docs/CONTROL-CENTER.md §4). Content editors, technical administrators and auditors cannot see them, neither in the admin nor through the API (checked by end-to-end tests).
- Not readable or writable through the public API (checked by end-to-end tests). Since CC-0 the API exists only on the Control Center's host.
- Membership applications can only be deleted by super administrators; contact messages also by board administrators and membership managers.
- Every creation, change and deletion of a submission is written to the audit log with its id and, for status changes, the old and new status. No names, addresses or message contents go into the audit log.

### Retention (decided by the association: six months)

A scheduled job runs every night at 03:00 (server time) and deletes:

| What | When |
|---|---|
| Contact messages | six months after they arrived |
| Rejected membership applications | six months after the decision (decision date is recorded automatically when the status changes) |
| Rate-limit counters | as soon as they expire (at most one day) |

**Not deleted automatically:** accepted applications (since CC-1 they also have an entry in the members register, see below) and applications still open ("received" or "in review", waiting for a decision). **To decide (decision 12):** whether accepted applications should be reduced or deleted once the register entry exists; until then the data exists twice.

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

## Members register and case handling (CC-1)

| Topic | Fact |
|---|---|
| Members register | Separate from the applications, with its own permissions (super administrators, board administrators, membership managers; technical administrators, content editors and auditors have no access, checked by end-to-end tests). Fields: first and last name, e-mail, address, type of membership, under 18 when admitted (yes/no) and, only then, the guardian's name, e-mail and consent date — exactly the application's fields — plus membership status (active/ended), member since, ended on, and whether the entry came from an online application or was entered by hand. **No new personal fields.** |
| How entries are created | Automatically when an application is accepted, or by hand for people who joined before the website existed |
| Retention | **No automatic deletion.** The data are kept while the membership lasts. When it ends, the entry is due for review (CC-2): a person decides to keep everything or only a minimal record (name, type, dates, link to the application; the e-mail, address and the guardian's contact data are removed, the guardian's consent date stays as proof) until a date, for a stated reason (legal, accounting, proof, other); at that date it is due again. Removing data needs a fresh code. Deleting an entry needs a super administrator and a fresh code; other super administrators are notified |
| Case history | Per application and member: who changed what and when (stage from → to, consent date recorded, assignment, follow-up date, register entry created, membership ended). Values are stages, dates and account names, never the person's data. Written by the server only; deleted together with the application or member |
| Assignment and follow-up | Applications and contact messages can be assigned to a person of the association; applications can get a follow-up date |
| Exports | Only with a **processing purpose approved by the association** (dataset, a legal basis of Art. 6(1) GDPR that fits it, a justification, the columns it may export, the reference of the decision), only those columns, with the concrete occasion, an explicit confirmation and a fresh code. None is approved yet, so no export is possible. The file is created on request and sent to the person; it is **not stored** on the server. Every export is recorded in the **export register**: person, time, dataset, purpose, legal basis as worded at that moment, column names, number of rows, occasion — no personal data of members or applicants (a search text, which could be a name, is recorded only as "search: yes"). The register cannot be changed or deleted (database trigger) and is kept as long as the audit log. Super administrators, board administrators and auditors see all exports and are notified of each; everyone else who may export sees their own |
| In-app notifications | Per account: kind (e.g. "new membership application"), a reference (type and number of the record), a link, time, read yes/no. **No names or other personal data.** Read ones are deleted after 30 days, unread ones after 90 days (nightly job); security events are also in the audit log, kept for its period |

| Accepted applications | Today the application keeps its data next to the register entry. **Proposed, switched off:** move the personal data into the register and keep only the proof of the decision and consent in the application (migration plan in CONTROL-CENTER.md §16; nothing runs without the association's decision) |
| Assignment | Assigning an application or a message to a person grants no access; only the role decides who sees them. The list of people offered shows names only |

## Website content (CC-2)

| Topic | Fact |
|---|---|
| Pages, events, menu | Edited in the Control Center; only texts and images entered by the association. No free HTML, embeds or third-party widgets; links only to the website, its pages or checked addresses (https, mailto, tel) |
| Events | Date, time, place, text, image and an optional registration link chosen by the association. The calendar file (`.ics`) is generated by the website itself; no calendar, map or ticket service is contacted. A registration link leads to the site the association names (only when the visitor follows it) |
| Live preview | Drafts are shown only on the Control Center's host, to people signed in with both factors who may read content; never cached or indexed |
| Search engines and sharing | Title, description and sharing image per page; pages can be hidden from search engines and the sitemap. Open Graph data are part of the page; nothing is sent to social networks. Until launch no page is indexed |
| Redirects | Old addresses forward to new ones; no data about visitors is stored |

## Control Center (people with an account only)

| Topic | Fact |
|---|---|
| Where | Its own host (`ADMIN_URL`, planned: `verwaltung.yop-ye.org`). On the website's host `/admin` and the API answer 404 (media files excepted) |
| Cookies | `payload-token` (session, set only after signing in: HttpOnly, Secure in production, SameSite=Strict, host-only, 2 hours, renewed while active) and `yop-device` (a random value that recognises a device across sign-ins; HttpOnly, Secure, SameSite=Strict, 400 days; set only for people who sign in). Visitors of the website get neither |
| Accounts | Name, e-mail, role, optional restrictions, deactivated yes/no, password hash. No public sign-up: accounts are created by an administrator or on the server (`npm run create-admin`) |
| Sign-in | Password plus a code from an authenticator app (TOTP) for every account. The password alone creates no usable session |
| Second factor | Stored: the authenticator secret (encrypted, AES-256-GCM, key from `MFA_ENCRYPTION_KEY` or derived from `PAYLOAD_SECRET`), the time step of the last used code, a failure counter, and 10 recovery codes as keyed hashes (the codes themselves are shown once and never stored) |
| Sign-in records (`auth-sessions`) | Per sign-in: time, status, verification method, last activity (at most every 5 minutes), **browser family, operating system and device class** (e.g. "Firefox · Linux · computer"; no version numbers, no full user-agent string) and a keyed hash of the device cookie. **No IP address.** Ended records are deleted after 30 days by an hourly job (provisionally approved by the association on 2026-10-20, unless a documented security need requires longer) |
| Known devices (`trusted-devices`) | Per account and device: keyed hash of the device cookie, browser family, operating system, device class, first and last use. Used to notice sign-ins from new devices. Deleted with the account; the person can remove entries on "My security" |
| Audit log | Time, account id, name and role of the person acting, area, action, object (type, id and — for content and accounts — its title or name), result, whether a fresh code confirmed it, and small details (names of changed fields, old/new status or role, browser family and OS for sign-ins). **No IP addresses, no form or message contents.** Readable per role (super administrators and auditors all, board administrators users/content/association, technical administrators operations); everyone sees their own security events on "My security". Append-only: the database refuses changes and deletions. **Kept for 12 months** (decided 2026-10-20 as the initial setting; adjustable on the server with `AUDIT_RETENTION_MONTHS`; its legal adequacy is to be reviewed before production): a nightly job deletes older entries — the only deletion the database allows, and only for entries older than the period. Each purge is itself logged |
| Security e-mails | To the account itself: second factor set up, sign-in from a new device (browser family and OS), recovery code used, second factor reset by an administrator, password changed. Time and link only; no address or location. Require SMTP |
| Sign-in protection | Account locked for 15 minutes after 5 wrong passwords; second factor locked for 15 minutes after 10 wrong codes; 5 wrong codes end a sign-in attempt; per-address limits (see above) for passwords and codes; passwords of at least 12 characters |
| Password reset | By e-mail with a link to the Control Center's host (requires SMTP). After the new password, the second factor is still required |
| Account pictures | A neutral icon. Payload's default (Gravatar, which would send a hash of the e-mail address to a third party) is switched off |

## Server operations (CC-3)

| Topic | Fact |
|---|---|
| Access logs (Caddy) | One JSON line per request to the website and to the Control Center: time, method, host, path **without query string**, status, size, duration, referring page, browser string, and the visitor's IP address **shortened** to /24 (IPv4) or /48 (IPv6). Not written: full IP addresses, ports, cookies, `Authorization`, forwarded addresses, response headers. Files rotate at 50 MB and are **deleted after 7 days** (proposal, decision 7). They stay on the server; the operations agent reads them only to count (CC-4) |
| Host samples | CPU, memory, load and disk of the server once a minute, database size; kept 30 days. No personal data |
| Backups | Contain the whole database (including applications, members, messages and accounts) and the media files, **encrypted** with restic (password in the agent's environment and offline with the board) on EU storage with object lock (decision 9). Proposed retention: 7 daily, 4 weekly, 6 monthly: **data deleted in the live database remain in backups until the backups expire** (up to about six months). Restore drills restore into a separate test database, compare counts and delete it at once |
| Backup, drill and restart history | Time, kind, result, counts, sizes, durations, snapshot ids, error text (masked); kept 12 months. No personal data |
| Service logs in the Control Center | Shown only to roles with `operations.read`, loaded on request, masked before they leave the agent (e-mail addresses shortened, IP addresses shortened, tokens, passwords, cookies and keys replaced). Each view is in the audit log. The logs themselves stay in Docker on the server (Docker's default rotation) |
| E-mail delivery log | Per e-mail: time, template (e.g. "new application"), recipient **shortened** (`i***@yop-ye.org`), result, error code, duration. No subject, no content. Kept 90 days (proposal). Readable with `email.manage` |
| Technical warnings | To people with `operations.act` in the Control Center, and by e-mail to the technical address if set: what (service, host, time) and a link. No personal data |

## Security headers

Sent on every response (pages, API, CMS, files):

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` |
| Strict-Transport-Security | `max-age=31536000; includeSubDomains` (no `preload` yet: hard to undo) |
| X-Frame-Options | `DENY` (the live preview of drafts: `SAMEORIGIN`, framed only by the Control Center on its own host) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` |
| Cross-Origin-Opener-Policy | `same-origin` |
| X-Robots-Tag (CMS only) | `noindex, nofollow` |

`'unsafe-inline'` for scripts is required by Next.js for pages served from the cache (plan §11). There are no third-party scripts and no user-supplied HTML.
