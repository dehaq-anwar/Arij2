# Youth of Peace — Administration & Control Center

**Status:** approved 2026-10-20 (option A, phases CC-0 to CC-5 with conditions). CC-0 and CC-1
are implemented (sections 14 and 15); CC-2 and later wait for the association's approval. Plan
date: 2026-10-19.
**Arabic version:** [CONTROL-CENTER.ar.md](CONTROL-CENTER.ar.md)
**Visual design (interactive):** [control-center/mockups.html](control-center/mockups.html). Open the
file in a browser. It needs no network access: fonts and logo are embedded. Useful addresses:
`mockups.html#dash`, `#content`, `#members`, `#infra`, `#email`, `#analytics`, `#security`,
`#arch`; add `?theme=dark`, `?lang=ar` or `?lang=en`, `?modal=mfa`, `?modal=cmd`.
Every number, name and entry in the mockup is sample data, and the mockup says so in a banner.
The finished version shows real data only.

---

## 0. Summary and recommendation

**Recommendation (option A):** build the Control Center **inside the existing Payload admin**: same
application, same sign-in and one permission model. Add a **small, separate operations agent**
for the server, and use **proven tools** for what they do well: Caddy for TLS, restic for
backups, docker-socket-proxy to narrow Docker access, and an external uptime monitor. No
cPanel/Plesk-style panel, no second CMS, no terminal, no file manager.

Why:

1. Payload 3.90.2 already provides most content features the request lists: drafts, versions,
   scheduled publishing, live preview, custom views, a job queue, upload handling and an admin UI
   in German, English and Arabic with right-to-left support. Building a second admin interface
   next to it would duplicate all of this and its security model.
2. The hosting panels studied (cPanel, Plesk, CloudPanel) are built for shared PHP/MySQL hosting
   with many customer accounts. They bring a mail server, a file manager and shell access, which
   the request explicitly excludes. They do not know our content, our association data or our
   roles.
3. A separate agent keeps server control **outside the web application**. If a content editor's
   account is compromised, that account has no path to the server. If the web application itself
   is compromised, the attacker can only trigger a short, fixed list of actions, not run commands.

What the Control Center will **not** do, by design: open a terminal, browse or edit server files,
run arbitrary Docker commands, edit firewall rules, install system updates (the host does this
itself with unattended upgrades), run its own mail server, or reveal secrets.

---

## 1. Technical audit (step 1)

### 1.1 What exists today

| Area | Current state |
|---|---|
| Stack | Next.js 16.3.8, React 19.3, Payload 3.90.2, PostgreSQL 18.6, S3-compatible media storage (SeaweedFS in development; production provider still open) |
| Content | Collections: projects, news, focus areas, team members, partners, statistics, media. Globals per page: home, about, support, membership, contact, legal pages, site settings |
| Drafts/versions | News and projects only (`versions: { drafts: true, maxPerDoc: 25 }`). Page globals have no drafts or versions yet |
| Association data | `membership-applications` and `contact-messages` (Phase 5), with a nightly retention job (six months, decided by the association) |
| Roles | Three: `admin`, `editor`, `board`. Board and admin see applications and messages; editors see content only |
| Sign-in | Payload password sign-in, at least 12 characters, rate-limited, no self-registration. **No second factor** (Payload core 3.90.2 does not ship one; checked in the package source) |
| Audit trail | None besides Payload's own version history for content |
| E-mail | SMTP through the official nodemailer adapter; disabled without `SMTP_HOST`; no delivery log |
| Server | `docker-compose.prod.yml` has the app and PostgreSQL only. **No Caddy, no backups, no monitoring yet** (planned for Phase 6) |
| Analytics | None (no cookies, no tracking script) |
| Security headers | CSP without external hosts, HSTS, X-Frame-Options DENY and others; tested in e2e |

### 1.2 What Payload 3.90.2 already provides (reuse, do not rebuild)

Checked against the installed package and its types:

| Capability | Payload feature | Use in the Control Center |
|---|---|---|
| Access control | Collection-, document- and field-level `access` functions | The six roles (section 4) |
| Drafts, autosave, versions, restore | `versions.drafts`, `autosave`, version history view | Every content type and page |
| Scheduled publishing | `versions.drafts.schedulePublish` (runs through the job queue) | "Plan" button in the page editor |
| Live preview | `admin.livePreview` + `@payloadcms/live-preview-react` 3.90.2 | Preview before publishing |
| Page builder | `blocks` field | Pages built only from approved design components |
| Custom screens | `admin.components.views` (incl. replacing the dashboard), `Nav`, `beforeNavLinks`, `afterNavLinks` | Dashboard, operations, e-mail, analytics screens |
| Dashboard widgets | `admin.dashboard.widgets` — **marked experimental** | Not relied on; we use a custom dashboard view instead |
| Background jobs | Jobs queue with schedules (`payload_jobs`) | Retention, metrics, analytics aggregation, e-mail checks |
| Media | Uploads with image sizes and focal point, S3 storage plugin | Media library; alt text made mandatory |
| Folders, saved filters, trash, document locking | `folders`, `queryPresets`, `trash`, `lockDocuments` | Media organisation, saved views, safe deletion, no edit conflicts |
| Sessions | Sessions stored on the user document | Session list and sign-out of other devices |
| Admin languages | `@payloadcms/translations` (de, en, ar) with RTL | Already configured |
| Official plugins (3.90.2) | SEO, redirects, search, nested docs, import/export | SEO and redirects are planned; import/export only behind purpose logging |

### 1.3 What needs development

- Six roles with a central permission map, migration of the three existing roles.
- Second factor (TOTP), recovery codes, re-confirmation ("step-up") for sensitive actions,
  new-device notices, session overview.
- Append-only audit log.
- Members register, separate from applications; status history; consent workflow; exports with
  recorded purpose.
- Dashboard and screens for operations, e-mail and analytics, reading **real** data only.
- Operations agent (new small service) and production compose with Caddy.
- Backups with automatic restore drills.
- E-mail delivery log, test sending, DNS checks (SPF, DKIM, DMARC), templates.
- Analytics from server logs without cookies.
- Page collection with blocks, events collection, navigation editing, SEO and redirects.
- Admin theming in the website's design (colours, Readex Pro, logo, light/dark, RTL).

### 1.4 What needs an external service or a decision

Hosting provider and server size, DNS provider (API access only if wanted), mail provider,
backup storage in the EU with object lock, external uptime monitoring. See section 12.

### 1.5 Findings from the audit that the plan addresses

- One `admin` role can do everything, including reading applications and changing server-relevant
  settings. The request asks for separation (technical administrators must not see member data).
- Without a second factor, one leaked password gives full access.
- Payload stores sessions on the user document; parallel sign-ins to the same account were seen to
  invalidate each other in the e2e tests (Phase 5). Session handling must be tested per device.
- The page globals have no drafts, so editors currently publish every change immediately.
- There is no backup, so there is nothing yet to restore.

---

## 2. Comparison (step 2)

Sources for cPanel, Plesk and CloudPanel are mostly vendor marketing and hosting-reseller pages,
not the vendors' current reference documentation. Treat those columns as **secondary
information**: they explain why these products do not fit, but are not a full product review.
Sources are listed at the end.

Legend: ✓ built in · ◐ partly, or through an extension · ✗ not offered · — not applicable.
For the proposed Control Center: **now** = exists today, **CC-n** = planned phase, **integration**
= through a provider's interface, **no** = deliberately not offered.

| Requirement | cPanel | Plesk | CloudPanel | Proposed Control Center |
|---|---|---|---|---|
| Edit website content in 3 languages, drafts, preview, scheduling, versions | ✗ | ✗ | ✗ | now (partly) → CC-2 |
| Page builder limited to the site's design components | ✗ | ◐ (site builders, not ours) | ✗ | CC-2 |
| Membership applications, members register, consent workflow | ✗ | ✗ | ✗ | now (applications) → CC-1 |
| Roles for board, editors, membership, technology, audit | ◐ (hosting accounts) | ◐ (hosting roles) | ◐ | CC-0 |
| Second factor for sign-in | ✓ (secondary source) | ✓ | ◐ (unverified) | CC-0 |
| Audit log of administrative actions | ◐ | ◐ | ◐ | CC-0 |
| Node.js application hosting | ◐ (Application Manager, secondary source) | ◐ (extension) | ✓ | — (Docker Compose) |
| PostgreSQL | ◐ (phpPgAdmin, secondary source) | ◐ | ✗ (docs point to MySQL) | now; monitoring CC-3 |
| Automatic TLS certificates | ✓ (AutoSSL) | ✓ (Let's Encrypt) | ✓ | CC-3 (Caddy, automatic) |
| Service status and resource charts | ◐ | ◐ | ◐ | CC-3 |
| Backups with tested restore | ◐ (backup; restore tests not shown) | ◐ | ◐ | CC-3, with weekly automatic restore drills |
| Logs | ◐ | ◐ | ◐ | CC-3, masked, read-only |
| DNS editing | ✓ (own DNS server) | ✓ | ✗ | integration (only with provider API) or read-only checks |
| Mail server, mailboxes, webmail | ✓ | ✓ | ◐ | **no** own server; link to provider; integration only if the provider has a safe API |
| SPF/DKIM/DMARC checks | ◐ | ◐ | ✗ | CC-4 |
| Privacy-friendly visitor statistics | ◐ (AWStats etc. from logs) | ◐ | ✗ | CC-4 (aggregated, no IP stored) |
| File manager | ✓ | ✓ | ✓ | **no** (excluded by the request) |
| Web terminal | ✓ (in some setups) | ✓ (extension) | ✗ | **no** (excluded by the request) |
| Needs root and its own web server stack | yes | yes | yes | no |

**Result:** none of the panels covers the association-specific half (content model, members,
roles that separate personal data from technology), and all of them add powerful tools the request
rules out. What they do well — automatic certificates, backups, status pages — we take from
smaller, single-purpose tools (Caddy, restic, an uptime monitor) and show in one interface.

---

## 3. Architecture (step 3)

### 3.1 Three separate areas

```
                         ┌──────────── Server (EU), Docker Compose ─────────────┐
 Visitors ──HTTPS──► Caddy ──► App: Next.js + Payload                           │
 Association ─HTTPS─►  │        ① Content     (pages, news, projects, media)    │
 (accounts with 2FA)   │        ② Association (applications, members, messages) │
                       │        ③ Operations  (only requests to the agent)      │
                       │            │ signed requests, fixed action list        │
                       │            ▼                                           │
                       │        Operations agent ──► docker-socket-proxy        │
                       │        (backup keys,          (status, logs, restart   │
                       │         DNS token)             of named services)      │
                       └──────────────────────────────────────────────────────┘
   App ──► PostgreSQL (internal only), S3 media (EU), SMTP provider
   Agent ──► backup storage (EU, object lock), DNS provider API (optional)
```

The same picture is in the mockup under `#arch`.

1. **Content** — Payload collections and globals. Editors work only here.
2. **Association data** — applications, members register, contact messages, consents. Separate
   collections with their own access rules; visible only to the board, membership management and
   super administrators; every export recorded.
3. **Operations** — the web application never gets the Docker socket, host files or backup keys.
   It sends a signed request (HMAC with a shared secret, timestamp, one-time ID against replay)
   to the agent on an internal network. The agent accepts only the actions on its fixed list and
   checks parameters (for example, only the service names `app` and `caddy` may be restarted).

### 3.2 Operations agent

- Small Node.js service without a web framework (Node's own `http`), its own container, no port
  published to the internet, read-only file system, non-root user.
- Talks to Docker **only** through `tecnativa/docker-socket-proxy` (pinned by image digest). The
  proxy's README states that `POST` and `ALLOW_RESTARTS` are off by default and that its port must
  never be public. We enable only container listing, logs and restarts. **Limitation:** the proxy
  allows API sections, not individual containers, so the agent enforces the container list itself.
- Reads host CPU, memory and disk from a read-only mount of `/proc` and the data volume, every
  minute; stores aggregated values in the database (kept 30 days).
- Runs restic for backups and restore drills; holds the backup password and, if wanted, a DNS API
  token. These secrets exist only in the agent's environment.
- Answers every action with a result that the app writes to the audit log; the agent also keeps
  its own log.

**Planned action list (complete):** read status · read logs (last N lines, masked) · restart
`app` or `caddy` · start backup · start restore drill (into a separate test database) · list
snapshots · check certificate · read DNS records · run an allow-listed job now. Production restore
only if decision 10 allows it (section 12).

### 3.3 Sign-in and sensitive actions

- **Second factor for every account:** TOTP (authenticator app) with `otpauth` 9.5.2 (MIT),
  10 one-time recovery codes stored hashed. Passkeys (`@simplewebauthn/server` 14.0.3) can follow
  later. Phase 5 evaluated the community plugin `payload-totp` 3.0.6 and did not add it (one
  maintainer, hooks into the sign-in path). This plan instead keeps the sign-in code in this
  repository, small and fully tested, and uses `otpauth` only for the code calculation. This
  answers the open two-factor decision from Phase 5 (PLAN §23), if you approve it.
- **Step-up:** sensitive actions require a fresh code (valid 5 minutes) and, for destructive ones,
  typing the object's name: role changes, exports of personal data, deleting applications or
  members, restarting services, restores, changing e-mail settings, resetting someone's 2FA.
- **Sessions:** list of own sessions (device class, browser family, start, last activity), sign-out
  of single sessions or all others. Browser family from a small built-in check, not `ua-parser-js`
  (AGPL licence).
- **New-device notice:** an e-mail to the account when a sign-in comes from a device not seen
  before (random device cookie for signed-in administrators only).
- **Lost second factor:** another super administrator resets it with step-up; logged.
- Optional: separate admin hostname (for example `verwaltung.yop-ye.org`) so that admin cookies
  never travel to the public site and access rules can differ (decision 3).

### 3.4 Audit log

- Own collection, readable by super administrators and auditors, by board administrators and
  technical administrators for their area only; nobody can edit or delete entries through Payload.
- In PostgreSQL a trigger rejects `UPDATE` and `DELETE` on the table; only the retention job may
  remove entries older than the agreed period, through a dedicated database function.
- Entry: time, account, role, action, object, result, whether step-up was used, request ID.
  No content of forms or messages. IP address handling is decision 11.

### 3.5 Secrets

- Secrets stay in server environment variables (as today). The browser never receives them; the
  interface shows only "set / not set" and the result of the last check.
- SMTP host, port and sender can be edited in the interface; the password stays in the
  environment (decision 16 if the association wants it editable — then encrypted with a key that
  only exists in the environment).

### 3.6 Where each dashboard number comes from

| Shown | Real source |
|---|---|
| Website up, uptime | External uptime monitor (decision 8); without it the tile says "not set up" |
| Database health, size | `pg_database_size`, `pg_stat_activity` through a read-only database role |
| CPU, memory, disk | Agent samples, 1-minute resolution, 30 days |
| Last backup, restore drill | restic snapshot list and the drill results stored by the agent |
| SSL expiry | Agent checks the certificate Caddy actually serves |
| Release | Version and commit baked into the image at build time, image digest from the agent |
| Visits, top pages, languages, referrers, 404/500 | Aggregated Caddy access logs (section 7) |
| Applications, messages | Payload collections |
| Content changes | Payload versions and the audit log |
| Security notices | Audit log (failed sign-ins, new devices, role changes) |
| E-mail delivery | Delivery log (section 6) |

If a source is not configured, the tile says so ("not set up", "no data yet"). There are no
placeholder numbers in the finished product.

---

## 4. Roles and permissions

Each person has exactly one base role. A role can be **narrowed** for a person (for example, a
board administrator without export rights) but never extended beyond its base role. The
permission map lives in one file in code; access functions and tests are generated from it.

| Area | Super Admin | Board Admin | Content Editor | Membership Manager | Technical Admin | Read-only Auditor |
|---|---|---|---|---|---|---|
| Content (pages, news, projects, events, media, navigation, SEO) | full | read | full | — | — | read |
| Publish / schedule content | full | — | full | — | — | — |
| Membership applications, members register | full | full | — | full | — | — |
| Contact messages | full | full | — | full | — | — |
| Export of personal data (purpose required, step-up) | limited | limited | — | limited | — | — |
| Services, logs, backups (read) | full | read | — | — | full | read |
| Restart services, restore drills | full | — | — | — | full | — |
| Production restore | decision 10 | — | — | — | decision 10 | — |
| E-mail settings, test sending | full | — | — | — | full | — |
| Users and roles | full | limited (invite and deactivate content and membership roles) | — | — | — | read |
| Audit log | full | read (own areas) | — | — | read (operations) | read |

Key rules from the request:

- The technical administrator **does not** see applications, members or messages, and logs shown
  to them are masked.
- A content editor can neither reach operations nor personal data. The server-side checks do not
  depend on hiding menu items.
- At least two super administrators (so that a lost second factor can be reset).

Migration: `admin` → Super Administrator, `board` → Board Administrator, `editor` → Content
Editor. Who receives which role is decision 13.

---

## 5. Membership and contact management

- **Applications** stay as they are (Phase 5) and get a pipeline view (received → in review →
  parental consent pending → decided), search, filters, saved views and an append-only status
  history (who, when, from → to).
- **Parental consent:** acceptance is blocked until the consent date is recorded (already enforced
  on the server since Phase 5); the screen makes this visible and reminds the board.
- **Members register** (new collection, separate from applications): created when an application
  is accepted, with only the fields the association names (decision 12). Applications and register
  have separate permissions and separate exports.
- **Contact messages:** status (new, answered, closed), assignment, retention countdown.
- **Exports:** CSV of selected fields only, after entering the purpose; the legal basis is chosen
  from a list the association provides; step-up; every export in the audit log.
- **Retention:** the existing six-month rule and the nightly job stay unchanged; the interface only
  shows what will be deleted when. Rules for the members register and for accepted applications
  come from the association (decision 12). I will not change any retention rule myself.

---

## 6. E-mail

- **Settings:** host, port, sender; password status only (section 3.5).
- **Test e-mail:** sent only to the signed-in person's own address, through the real transport;
  result and error code shown and logged.
- **Delivery log:** time, template, recipient shortened (`i***@yop-ye.org`), status, error code.
  No subject lines with personal data, no message bodies. Kept 90 days (proposal).
- **Domain checks:** real DNS lookups from the server (`node:dns`) for MX, SPF, DMARC and the DKIM
  selector the mail provider names; with plain-language advice. Editing DNS records is only
  possible if the DNS provider offers an API and the association wants it (decision 4).
- **Templates:** new application, new message, password reset, technical warning; in German,
  English and Arabic, with preview; they contain links, not form contents (as today).
- **Alerts:** failed deliveries notify the technical address.
- **Mailboxes and webmail** stay with the mail provider; the interface links there. No own mail
  server.

---

## 7. Analytics without cookies

- **Source:** Caddy's JSON access logs. An hourly job aggregates them into counts per path,
  language version, referrer domain (without path) and status code, and separates obvious bots.
  IP addresses and full user-agent strings are **not stored**; raw logs are deleted after a short
  period (proposal: 7 days, decision 7).
- **Shown:** visits and page views over time, top pages, languages, referrers, 404 pages (with a
  "create redirect" button), 500 errors (link to logs), sitemap status, uptime.
- **Speed:** laboratory measurements (Lighthouse) as part of the checks. Real-user measurement with
  `web-vitals` 6.2.2 only if the association agrees and updates its privacy policy (decision 7).
- **Uptime:** an external monitor, because a server cannot report its own outage (decision 8).

Privacy policy changes are the association's text; I only list what the processing is.

---

## 8. Backups and restore

- **What:** a nightly PostgreSQL dump and the media bucket, encrypted by restic, to EU storage with
  object lock, so that backups cannot be deleted or altered from the server for a set period.
- **Retention:** proposal 7 daily, 4 weekly, 6 monthly (decision 9; it also affects how long
  deleted personal data survives in backups).
- **Restore drill, weekly and automatic:** newest snapshot → fresh test database → migrations check
  → row counts → application health check → result in the dashboard; failure raises an alert.
  CI runs the same drill against a test database on every change to the backup code.
- **Production restore:** decision 10. Proposal: super administrator or technical administrator,
  step-up, typed confirmation, the agent first takes a safety snapshot, and the website shows a
  maintenance page during the restore.
- **Keys:** repository password in the agent's environment plus an offline copy held by the board
  (decision 9).

---

## 9. Design system (step 4: mockups)

- **Shell:** Payload admin with our own navigation component, dashboard view and theme (CSS
  variables mapped onto Payload's admin variables). Brand colours from the website (accent
  `#0d6867` light, `#6fd6cf` dark), Readex Pro self-hosted, logo. Light and dark, right-to-left for
  Arabic.
- **Patterns:** collapsible sidebar grouped by Overview / Content / Association / Operations /
  Insights / Security; command palette (Ctrl K) and keyboard shortcuts; bell with in-app notices;
  clear empty, loading, error and success states; dangerous actions in dialogs that explain the
  effect.
- **Charts:** plain SVG components, no chart library. Single-series charts in teal; categorical
  colours validated for colour-vision deficiency and contrast (light `#009d96`, `#6250d6`,
  `#eb6834`; dark `#12a8a1`, `#9085e9`, `#d95926`). Status colours are reserved and always
  appear with an icon and a word. Every chart has a hover tooltip and a table alternative.
- **Accessibility:** WCAG 2.2 AA; automated axe checks on admin screens in e2e; target size,
  focus order and reduced motion are checked.
- **Dependencies:** no Tailwind/shadcn/Motion in the admin; Payload's own components plus CSS.

The mockup shows: dashboard, page editor with blocks and live preview, application pipeline with
detail drawer, services and status, e-mail, analytics, users and roles with permission matrix,
architecture, the step-up dialog and the command palette, in light and dark, desktop and phone.
All screens are in German; the shell, dashboard and applications screen are also in English and
Arabic (right-to-left).

---

## 10. Implementation plan (after approval)

Each phase ends with verification (build, lint, type check, unit and e2e tests, screenshots) and a
stop for your review, as in the previous phases.

| Phase | Content | Size |
|---|---|---|
| **CC-0 Foundations** | Six roles + permission map + migration of existing accounts; TOTP, recovery codes, step-up; sessions screen; new-device notice; audit log with database trigger; admin theme, navigation, dashboard frame | L |
| **CC-1 Dashboard and association data** | Dashboard with real sources (content, applications, messages, security notices); members register; status history; consent workflow; exports with purpose; contact-message workflow; in-app notices | L |
| **CC-2 Content** | Page collection with blocks from the design system; migration of the page globals' content; drafts and scheduling for all pages; live preview; version restore; navigation editing; events collection; SEO and redirects plugins; media rules (alt text, focal point, sizes) | XL |
| **CC-3 Operations** | Production compose with Caddy; operations agent; socket proxy; metrics; masked logs; certificate checks; restic backups; automatic restore drills; job overview; database monitoring; release information | XL |
| **CC-4 E-mail and analytics** | Delivery log; test sending; DNS checks; templates; alerts; log aggregation; 404/500 views; uptime integration; optional web vitals | M |
| **CC-5 Hardening and documentation** | Security review of the whole Control Center; permission tests for every role and operation; restore drill under test; accessibility and performance audit; handbook for administrators and operations runbook in German and English | M |

Then the original Phase 6 (final audits, performance, Next.js known issues, README, deployment and
operations guide, pre-launch check).

**New dependencies** (exact versions, all older than 14 days when checked): `otpauth` 9.5.2,
`@payloadcms/plugin-seo` 3.90.2, `@payloadcms/plugin-redirects` 3.90.2,
`@payloadcms/live-preview-react` 3.90.2; container images Caddy, docker-socket-proxy and restic
pinned by digest at implementation time; optional later: `web-vitals` 6.2.2,
`@simplewebauthn/server` 14.0.3 / `@simplewebauthn/browser` 14.0.0. Versions are re-checked
against the 14-day rule when they are installed.

---

## 11. Tests and acceptance criteria

| Criterion from the request | How it is proven |
|---|---|
| Real data, no fake functions | Dashboard tiles tested against seeded database states, including "not set up"; the sample-data banner exists only in the mockup file; a test fails if a screen renders a hard-coded number |
| Full content management | e2e: create, edit, schedule, preview, publish, restore a version, in three languages |
| Service monitoring | Agent tests with a test Docker setup; dashboard shows status changes |
| Tested permissions | Generated tests for every role × collection × operation, plus e2e per role; editor and technical-admin escape attempts must fail |
| Backups with real restore | Restore drill in CI (dump → restore → migrations → counts); weekly drill in production with visible result |
| Professional, responsive design | Screenshots light/dark/RTL/phone of every screen; axe without violations |
| Sensitive operations confirmed | e2e: without a fresh code the server refuses; every such action appears in the audit log |
| No regression | Existing 153 e2e tests, unit tests, contrast, dependency-age and audit checks stay green |
| Risks documented | Section 13, updated after each phase |

---

## 12. Decisions needed from the association

1. **Architecture:** option A (recommended, section 0), B (separate admin application next to
   Payload: more freedom in design, but a second sign-in, permission model and attack surface), or
   C (adopt an existing panel or self-hosted PaaS for the server part: less to build, but root-level
   power in a second interface and no knowledge of our data).
2. **Hosting:** provider (EU), server size; self-run PostgreSQL in Docker or a managed EU database
   (a managed database would replace part of the backup work with the provider's point-in-time
   recovery).
3. **Admin address:** a separate hostname such as `verwaltung.yop-ye.org` (recommended) or
   `/admin` on the main domain.
4. **DNS:** which provider; read-only checks only (recommended) or editing through its API.
5. **E-mail:** mail provider; sender address; DKIM selector. Notifications currently go to
   `info@yop-ye.org` (Phase 5); say if applications should go to a separate board address.
6. **Second factor:** TOTP for everyone (recommended), passkeys later; who holds super
   administrator roles (at least two people).
7. **Analytics:** server-log statistics only (recommended) or also real-user speed measurement;
   how long raw access logs are kept (proposal 7 days); the privacy policy update is the
   association's text.
8. **Uptime monitoring:** which external service (EU), or none.
9. **Backups:** storage provider with object lock (EU); retention scheme; who keeps the offline key
   copy.
10. **Production restore from the web interface:** yes (with step-up, typed confirmation and a
    safety snapshot) or no (written runbook on the server only).
11. **Audit log:** retention period; IP addresses not stored, shortened, or stored.
12. **Members register:** which fields; legal basis; retention after a membership ends; what
    happens to accepted applications after the register entry exists.
13. **People and roles:** who gets which role.
14. **Pages:** which pages become freely composable from blocks; legal pages stay fixed.
15. **Video:** no video, small self-hosted files, or external embeds with consent.
16. **SMTP password:** only on the server (recommended) or editable in the interface (encrypted).
17. **Notifications:** which addresses receive new-application, message and technical alerts.

I will not change the association's statutes, legal texts or retention rules; where the plan needs
them, it asks.

---

## 13. Risks and limitations

| Risk | Effect | Mitigation |
|---|---|---|
| Compromised web application (code execution) | Attacker can trigger the agent's fixed actions (restart, backup, drill) | No shell or file actions exist; agent rate limits; every action alerts the technical address; production restore needs decision 10 and step-up |
| Compromised content editor account | Content changes | No access to personal data or operations (server-side checks); second factor; versions allow restore; audit log |
| Docker access | The socket proxy filters API sections, not containers | Agent enforces the container list; proxy on an internal network only, never published |
| Monitoring on the same server | An outage cannot report itself | External uptime monitor (decision 8) |
| Payload dashboard widgets are experimental | API may change | Custom dashboard view (stable extension point) instead |
| Sessions stored on the user document | Parallel sign-ins can interfere | Tested per device in CC-0; issue reported upstream if confirmed |
| Volunteer maintenance | Features nobody maintains become risks | Small scope; every screen documented; restore drills automated |
| Backups contain deleted personal data until they expire | Retention longer than in the live database | Retention scheme decided by the association and documented in the privacy notes |
| Secondary sources in the comparison | Panel feature list may be incomplete | Comparison used only to rule panels out; no feature of ours depends on it |

## 14. CC-0 implementation notes (2026-10-20)

### Decisions by the association (2026-10-20)

- Option A, with a separate, narrowly scoped operations agent (CC-3).
- Two-factor sign-in for **every** admin account with an authenticator app (Google Authenticator,
  Microsoft Authenticator or similar), secure recovery codes, no way around it through the API or
  old sessions, and a thorough review of the `otpauth` usage.
- At least two super administrators supported; **no real accounts are created** and nobody gets
  permissions before the association names them. The association's own account becomes the main
  super administrator, with a secure way to recover access.
- The six roles, least privilege, strict separation of the technical administrator from membership
  data and messages, tested in the interface, on the server and through the API. **No test
  accounts with admin rights in production.**
- Admin address `verwaltung.yop-ye.org`, with protection on the server side, not only a hidden
  address; checked against sessions, preview and sign-in.
- Restoring the production database from the web interface is **not allowed** until the
  association explicitly approves it with its safeguards (decision 10 stays open).
- Only CC-0 now; CC-1 and later after approval.

### What CC-0 contains

| Part | Implementation |
|---|---|
| Permission map | `src/cms/access/permissions.ts`: six roles, 15 permissions, narrowing restrictions per person, audit areas per role. Every collection, global, field rule, the navigation, the dashboard and the endpoints read it. Migration of existing accounts: `admin` → super administrator, `board` → board administrator, `editor` → content editor |
| Account rules | `src/cms/collections/Users.ts`: board administrators manage only content editors and membership managers; nobody changes their own role, restrictions or deactivation or deletes their own account; passwords of other accounts are never set by someone else; the last active super administrator cannot be demoted, deactivated or deleted; deactivation ends all sessions at once |
| Two-factor sign-in | After the password, Payload creates a session; a hook (`afterLogin`) immediately takes it out of the account's list of valid sessions and records it as *pending* (`auth-sessions`). Payload checks every token against that list, so the token is accepted nowhere — admin, REST API, server functions — until the code is given (`/api/users/mfa/verify`). The same hook runs after a password reset. Second line of defence: every permission check also requires our own record of a completed sign-in (`session-state.ts`), younger than 12 hours |
| Closed bypasses | GraphQL is off; API keys are not enabled; auto-login is not configured; the first-user endpoint stays closed; the migration ended every session that existed before (tested on a database with old roles and sessions); pending sign-ins expire after 10 minutes and after 5 wrong codes |
| Codes | TOTP, SHA-1, 6 digits, 30 s, ±1 step. The code is accepted only once (compare-and-set in the database, also against two parallel requests). 10 wrong codes in 15 minutes lock the second factor for 15 minutes; codes and sign-ins are also limited per (hashed) address |
| Recovery codes | 10 per account, 50 random bits each (Crockford base32, `XXXXX-XXXXX`), stored only as keyed hashes; shown once at set-up; each works once; new ones replace all old ones (needs a fresh code). Using one sends an e-mail notice |
| Secrets | Authenticator secrets encrypted with AES-256-GCM, bound to the account; key from `MFA_ENCRYPTION_KEY` (HKDF), otherwise derived from `PAYLOAD_SECRET` |
| Step-up | Role, restrictions, deactivation, e-mail and password changes, new accounts, deletions, new recovery codes, and resetting another person's second factor need a code from the last 5 minutes; refused otherwise, with a message saying so. Logged with "confirmed with code" |
| Sessions and devices | "My security" (`/admin/security`): active sessions (browser family, OS, start, last activity), sign out one or all others, known devices, own security events, recovery codes. A sign-in from a device not seen before is reported to the account by e-mail |
| Recovering access | (1) a recovery code; (2) another super administrator resets the second factor in the account's sidebar (step-up, logged, e-mail to the person); (3) on the server, `npm run reset-mfa -- <email>` (needs server access; logged). First account: `npm run create-admin -- <email> "<name>"`, then sign in at once and set up the app |
| Audit log | Collection `audit-log`, written by the server only; areas security, users, content, association, operations; readable per role. A database trigger refuses `UPDATE`, `DELETE` and `TRUNCATE` (tested in the fixtures and by hand). Limitation: someone with the database owner's password could drop the trigger; off-server backups with object lock (CC-3) cover that case |
| Admin host | `src/proxy.ts` + `src/lib/admin-host.ts`: with `ADMIN_URL` set, `/admin` and `/api` exist only on that host; the website's host answers 404 (only media files are served there). Cookies are host-only, so the admin session never reaches the website. Optional `ADMIN_GATE_SECRET`: the reverse proxy proves with a header that a request came through its admin site block (where an IP allowlist or other server-side protection applies, CC-3) |
| Interface | Own sign-in screen (password → code, or set-up with QR code and recovery codes), navigation grouped as in the design (always visible on desktop), dashboard with real data only (sessions, open applications, new messages, failed sign-ins, accounts without second factor, content counts, recent activity — each only for roles allowed to see it), "My security", security panel on accounts, readable audit log. Light and dark, German, English and Arabic (RTL), desktop and phone |

### Review of `otpauth` 9.5.2

Only `HOTP.generate` (the RFC 4226 calculation), the `Secret` type and the `otpauth://` address
are used; checking codes is our own code.

- The Node build computes HMAC with Node's `crypto` (no own crypto); the dynamic truncation
  matches RFC 4226 §5.3. Verified against all RFC 6238 SHA-1 reference values (unit tests).
- Finding 1: `Secret` takes an `ArrayBuffer`; a Node `Buffer`'s `.buffer` can be Node's shared
  8 KB pool, which would silently produce a different key. We always copy the bytes into an
  exact `ArrayBuffer` (unit test with a slice of a larger buffer).
- Finding 2: its own `validate` compares with `timingSafeEqual` on strings and throws for
  same-length input with non-ASCII characters (e.g. Arabic-Indic digits). We accept exactly six
  ASCII digits before comparing (unit test with such input).
- Finding 3: its `validate` stops at the first match. Ours compares all three steps in constant
  time and refuses steps at or before the last used one (replay).
- Dependency: `@noble/hashes` 2.4.0 (only used by the browser builds, not by the Node build we
  load).

### Admin host, sessions, sign-in and preview

- Sessions: checked by tests — the cookie set at sign-in on the admin host is not sent to the
  website's host; the website's host returns 404 for the admin, the API and sign-in.
- Sign-in, password reset (e-mail link now points to the admin host), notifications: checked.
- Payload's own address (`serverURL`) is now the admin host, because its admin calls the API
  there. Media URLs therefore point to the admin host; the website already turns them into
  same-origin paths, and the website's host serves `/api/media/file/…` read-only.
- Preview: there is no preview yet. For CC-2 (live preview) the website's pages must allow being
  framed by the admin host (`frame-ancestors` for the preview route only); live preview sends the
  draft into the frame by `postMessage`, so no admin cookie is needed on the website's host.

### Before going live with CC-0

1. Set `ADMIN_URL=https://verwaltung.yop-ye.org` and `MFA_ENCRYPTION_KEY`; DNS record for the
   admin host; reverse proxy for both hosts (CC-3; until then the app-level rules apply).
2. Run the migration (it ends all existing sessions).
3. `npm run create-admin -- <your e-mail> "<your name>"`, sign in at once, set up the app, keep
   the recovery codes offline.
4. When the association names the second super administrator, create that account the same way.

### Verification (2026-10-20)

- `npm run verify`: lint (ESLint, logical CSS, motion direction, contrast), types, 121 unit tests
  (38 of them for CC-0: all RFC 6238 SHA-1 reference values, replay, input with other digits,
  `Buffer` pool, encryption, recovery codes, role matrix, host rules, time zone), production
  build, package age (all ≥ 14 days: `otpauth` 46 days, `uqr` 200, `jose` 609, `@noble/hashes`
  53) and `npm audit` (two earlier, accepted advisories, unchanged).
- End-to-end (Playwright, production build, `_e2e` database): **177 of 177 passed**, 24 of them
  new for CC-0: a password-only token is accepted nowhere (REST, drafts, accounts, GraphQL,
  token refresh); the admin sends it to the code step; a password reset still needs the code;
  deactivated accounts cannot sign in; sign-in through the form with a wrong and a right code;
  first set-up with QR code and recovery codes; a recovery code works once; a code works once;
  5 wrong codes end the sign-in; signing out other sessions; the role matrix through the API;
  drafts and accounts per role; content writing per role; the technical administrator and the
  content editor see no association data; role change needs a fresh code and is logged with it;
  board administrators' limits; nobody changes their own role; the audit log cannot be changed
  or deleted; the website's host has no admin and no API; axe (WCAG 2.1 AA) on sign-in,
  dashboard and "My security" in light/German and dark/Arabic without findings; the phone menu;
  the dashboard's load time.
- Load time of the dashboard (production build, this machine, warm): first byte 360–540 ms,
  loaded 450–620 ms; the test's limit is 3 s / 6 s.
- Screenshots and a video of the real panel were taken from the production build with a separate
  database (seed content and example accounts on `example.test` only).
- Fixed while checking the screenshots: greeting and times in the association's time zone
  (Europe/Berlin) instead of the server's; the phone menu now covers the page instead of pushing
  it sideways (Payload's own layout); duplicate `banner` landmark; device column label; empty
  audit targets show a dash.

### Open points after CC-0

- Some of Payload's own screens (list and edit views) keep Payload's layout with the Control
  Center's colours and font; deeper redesign comes with the screens of CC-1 and CC-2.
- The "last super administrator" rule is covered by code review, not by an automated test (the
  test database has several super administrators per worker).
- Found through the first CI run of CC-0 (not caused by it): Next.js' image optimizer has no
  cache in this setup, because `isrFlushToDisk: false` (read-only container, Phase 4) also turns
  off its disk cache. Every image is re-encoded on every page view, and in CI one stuck
  optimization of the header logo blocked the logo on every later page until the server was
  restarted. The logo is now served as its file (10 KB, cached by the browser for a year).
  Project and news images still go through the optimizer without a cache: to decide in Phase 6
  (CC-3), e.g. a small writable cache volume or image sizes generated once by Payload.
- The security e-mails (set-up, new device, recovery code used, second factor reset, password
  changed) are written, but no automated test reads them: the tests run without SMTP, where the
  app sends nothing and logs only that an e-mail was skipped. Check them once with the
  association's mail provider before going live.

## 15. CC-1 implementation notes (2026-10-20)

### Decisions by the association (2026-10-20)

- CC-0 accepted; CC-1 approved. CC-2 only after explicit approval.
- **Audit log:** kept for **12 months** as the initial setting, adjustable later, its legal
  adequacy to be reviewed before production; protected against unauthorised change and deletion.
- **Ended sign-in records:** deleted after 30 days (provisionally approved) unless a documented
  security need requires longer.
- **Second super administrator:** to be named later; no further account is created.
- No unnecessary personal fields; no change to the admission rules or retention rules without
  asking; applications separate from the members register; sensitive exports, edits and
  deletions subject to permissions, logging and review.

### Closing the CC-0 notes

| Note | What was done |
|---|---|
| Last super administrator | Checked twice: in the application (with a transaction-wide advisory lock, so two simultaneous changes are counted one after the other) and by a database trigger (`users_keep_super_admin`, same lock) that refuses demoting, deactivating or deleting the last active super administrator — also for direct SQL. Tested end to end: two super administrators demoting, deactivating and deleting each other at the same moment (one change succeeds, the other is refused), and two database connections at the same moment |
| No way around the second factor | Tested for every collection and global the Control Center has (read, count, create, change, delete) and every custom endpoint: a super administrator's password-only token gets exactly what an anonymous visitor gets, status and content. No admin screen opens with it |
| Resetting a second factor | Tested: only super administrators (any other account) and board administrators (content editors and membership managers only), never for oneself, always with a fresh code; afterwards all sessions of the person are ended, the old app codes are useless, the next sign-in requires setting up the app, and the account has exactly the same permissions as before (compared with `/api/access`). Logged with "confirmed with code" |
| Separation of the technical administrator | Kept and extended: no applications, members, case history, exports or export register through the API, no menu entries, no export screen |
| Audit log retention | 12 months (`AUDIT_RETENTION_MONTHS`, 1–120, server setting only). A nightly job deletes older entries of the audit log and the export register; both tables stay append-only in the database, the only exception being this job, and even then the database itself refuses to delete anything younger than the period (tested in the fixtures). Each purge is logged |
| Tests not yet done | See "Tests not yet done" below |

### What CC-1 contains

| Part | Implementation |
|---|---|
| Applications as a work list | Own list view: tabs by stage with counts (all open, received, in review, consent pending, accepted, rejected, all), search by name or e-mail, filters (type, assigned to, due follow-ups), sorting, pagination; a table on the desktop, cards on a phone; filters stay in the address. "Consent pending" is derived (under 18 without a recorded consent date); the admission rule itself is unchanged |
| Case handling | New stage "in review"; assignment to a person (super, board or membership roles) and a follow-up date; buttons for the next step (start review, accept, reject, reopen) with confirmation; the case history (who, when, what, from → to) on every application, written only by the server |
| Members register | Separate collection with its own permissions (`members.read/write/delete`): created automatically when an application is accepted (same transaction), or entered by hand for earlier members. Only the application's fields — no new personal fields. Active/ended with dates; where an entry came from is set by the server. Once the register entry exists the application's decision is locked. Deleting needs `members.delete` (super administrators) and a fresh code; other super administrators are notified. **No automatic deletion** (decision 12 is the association's) |
| Export | Own screen: dataset, selection, only the chosen columns, purpose (10–300 characters) and a legal basis from the list in the settings; a fresh code; the file is created on request and never stored. CSV in UTF-8 with semicolons; spreadsheet formulas in values are neutralised. Every export goes into the **export register** (who, when, dataset, columns, row count, purpose, legal basis — no personal data, append-only like the audit log) and the audit log, and reviewers (super administrators, board administrators, auditors) are notified |
| Notifications | Bell in the header and a page: new applications and messages, assignments, due follow-ups, applications waiting too long, consent still pending, new exports (reviewers), deleted members (super administrators), sign-ins from a new device (the account itself). No personal data in them. A daily job creates the reminders; it does not repeat one while it is unread |
| Settings without code | Reminder periods and the list of legal bases for exports (super administrators; changes are logged). **The list starts empty:** which legal bases apply is the association's decision; until one is entered, exports are refused |
| Dashboard | Applications by stage with links, decisions of the last 30 days, "my tasks" (assigned to me or due), active members and admissions this year — each only for roles allowed to see it |
| Contact messages | Status "closed" and assignment added; the six-month retention is unchanged |

### Permissions added

| Permission | Super admin | Board admin | Membership manager | Content editor | Technical admin | Auditor |
|---|---|---|---|---|---|---|
| `members.read`, `members.write` | ✓ | ✓ | ✓ | — | — | — |
| `members.delete` | ✓ | — | — | — | — | — |
| `exports.review` (all exports) | ✓ | ✓ | — | — | — | ✓ |
| `settings.manage` | ✓ | — | — | — | — | — |

Everyone who may export sees their own exports. Restrictions per person apply to the new
permissions as well.

### Verification (2026-10-20)

- `npm run verify`: lint (ESLint, logical CSS, motion direction, contrast), types, 131 unit
  tests (10 of them new for CC-1: stages and their queries, search limits, CSV quoting and formula
  neutralisation, byte-order mark and line ends, export columns and their translation, purpose
  and filter cleaning, audit retention bounds, month arithmetic, the start of tomorrow in Berlin
  in summer and winter), production build, package age (all ≥ 14 days; new: `pg` and
  `@types/pg` 8.20.0, test tools only) and `npm audit` (unchanged).
- End-to-end (Playwright, production build, `_e2e` database): **197 of 197 passed**,
  20 of them new for CC-1: the application from received to review to accepted with history,
  register entry and lock; under 18 stays "consent pending" until the date is recorded; the
  application list (tabs with counts, search, filters, cards on a phone); the register entered by
  hand, ended and deleted only by a super administrator with a code; the register list per role;
  export (permission, fresh code, purpose, legal basis, safe CSV, register, audit, reviewers
  notified, register unchangeable); the export screen with the code dialog and the download;
  notifications (assignment, read, daily reminder, bell); separation of duties (technical
  administrator, content editor and auditor reach no membership data); axe on the new screens
  (light German, dark Arabic); the second factor cannot be bypassed (every collection, global and
  endpoint, every screen); resetting a second factor; the last super administrator (simultaneous
  demotion, deactivation, deletion; two database connections).
- The database rules are also checked when the test database is built: the audit log and the
  export register refuse changes and deletions, the nightly purge removes only entries older
  than the period, and the database refuses a purge of younger entries.

### Tests not yet done

| What | Why not yet | How |
|---|---|---|
| Security e-mails and new-submission e-mails through the real provider | No SMTP provider is configured yet | Once SMTP is set: set up a test account, trigger each notice (set-up, new device, recovery code, reset, password change, new application), check sender, content and that no personal data is included |
| Exported CSV in Excel and LibreOffice | No office software in the test environment | Open one export of each dataset; check umlauts, Arabic names and that values starting with "=" appear as text |
| Server-level protection of the admin host (Caddy, IP allowlist) | Comes with CC-3 | Tested with the reverse proxy in CC-3 |
| Restore of a backup including the triggers | Backups come with CC-3 | Restore drill in CC-3 must check that the append-only and super-administrator triggers exist after a restore |
| Behaviour under real load (many applications) | No production data | The lists are paginated (25) and every filter is a database query; to be checked with the first real data |

### Known limitations

- Membership managers can only assign applications to themselves: the list of other accounts
  is visible only to roles with `users.read`. Board and super administrators can assign to anyone.
- Payload's own edit screens are used for applications and members, with the case panel in the
  sidebar; their layout is Payload's.
- Accepted applications stay next to their register entry (the data exists twice). Whether they
  should be reduced or deleted after the register entry exists is part of decision 12.
- Notifications are not deleted automatically (no rule decided yet; they contain no personal data).

---

## 16. CC-2 implementation notes (2026-10-21)

### Decisions by the association (2026-10-20)

- CC-1 accepted; CC-2 approved. CC-3 only after explicit approval.
- **Exports:** a managed list of the legal bases of Art. 6(1) GDPR with explanations; choosing a
  basis is not enough — the concrete purpose must be stated and the basis must fit it; only
  authorised roles, after a fresh code, recording purpose, basis, columns, time and person.
  **Exports stay switched off in production until the association has approved its processing
  purposes and their legal bases.**
- **Members register:** separate from the applications; data are kept during the membership; when
  it ends, the entry is reviewed (what goes, what must be kept for legal, accounting or evidence
  reasons); no indefinite retention of all data. For accepted applications: a safe way to avoid
  the duplicate personal data — **proposed, not switched on** (below); no new automatic deletion
  before a migration plan and tests.
- **Notifications:** read ones deleted after 30 days, unread ones after 90 days; important
  security events stay in the audit log under its own retention.
- **CC-1 improvements:** interface language vs. content language; understandable edit screens;
  review of the assignment; CSV tested in Excel and LibreOffice before exports are used.
- **Content:** a visual block-based page builder without code, live preview, drafts and
  versions, scheduled publishing, news, projects and events, menus, SEO, sharing data and
  redirects, in German, Arabic and English, within the visual identity and responsive design.
- Statutes, legal texts and the privacy policy are not changed without approval.

### Exports: purposes and legal bases

| Part | Implementation |
|---|---|
| Legal bases | The six bases of Art. 6(1)(a)–(f) GDPR as records (title, article, wording, explanation in de/en/ar; the Arabic wording is marked as an unofficial translation). Super administrators can switch a basis off; they cannot be deleted. **The wording was written without access to EUR-Lex** (blocked in the development environment) and must be compared with the official text (https://eur-lex.europa.eu/eli/reg/2016/679/oj) before production |
| Processing purposes | Per purpose: name, description, dataset (applications or members), legal basis, justification (why the basis fits), the columns it may export. A purpose is a draft until a super administrator approves it **with a fresh code and the reference of the association's decision** (e.g. a board resolution); any change to dataset, basis, justification or columns takes the approval back. A purpose can be retired and reopened; one that was used cannot be deleted |
| Export | Only with an approved purpose, only its columns, a concrete occasion (10–300 characters), an explicit confirmation and a fresh code. The register records purpose, legal basis (as it read at that moment), columns, rows, time and person. **Without an approved purpose nothing can be exported**; the screen says so and links the purposes for super administrators. None is approved yet |
| CSV | UTF-8 with byte-order mark, separator `;` (German Excel) or `,` (choice on the screen), CRLF line ends, formula characters neutralised. Opened automatically in LibreOffice 24.2 in the tests (umlauts, Arabic names, `=` values stay text). **Excel could not be tested here** (see "Tests not yet done") |

### Members register: review after the end of a membership

| Part | Implementation |
|---|---|
| While the membership lasts | Everything is kept, as before |
| When it ends | The entry becomes "review due" (immediately, or after a number of days set in the Control Center settings, 0–365). Those who may edit the register are reminded once a day while it is due |
| Review | A person decides, recorded in the history and the audit log: **keep everything** until a date, or **keep only a minimal record** until a date (name, type, dates, the link to the application — the e-mail, address and guardian's contact data are removed; the guardian's consent date stays as proof of a valid admission). Always with a reason (legal, accounting, proof, other with a note) and a date at most 30 years ahead; at that date the entry is due for review again. Removing data needs a fresh code; super administrators are notified. An entry reduced this way cannot be reactivated (the person is entered anew) |
| Automatic deletion | **None.** Nothing is deleted without a person's decision |

### Accepted applications: proposal to avoid duplicate data (switched off)

The proposal: when an application is accepted, the register entry holds the person's data; the
application keeps only the proof of the decision and the consent (status, decision date and
person, type, declarations, under 18, the guardian's consent date, the consent record with its
wording, language, received on) and its number. Name, e-mail, address and the guardian's name and
e-mail are removed from the application. The history and the audit log are not touched; the
register entry keeps its link to the application.

**Safeguards:** applications with internal notes, without a register entry, or with more than one
are skipped and listed; each application is moved in its own database transaction and checked
afterwards (proof unchanged, register entry unchanged, nothing left) — on any difference the
transaction is rolled back; a moved application cannot get personal data back through the API;
the database refuses empty personal fields unless the application is marked as moved
(`membership_applications_person_present`, `members_contact_present`).

**Migration plan (for the association's decision):**

1. Back up the database (CC-3 backups; until then `pg_dump`).
2. Run `npm run membership:consolidate` — a report only: which applications would be moved,
   which are skipped and why, and where the application and register entry differ.
3. The board reviews the report (differences are corrected by hand in the register first).
4. Decision by the association; then set `MEMBERSHIP_CONSOLIDATION=on`.
5. Run `npm run membership:consolidate -- --apply`; each application is logged
   (`application.consolidated`) and gets the history entry "personal data moved".
6. Check the report of the run; if needed, restore the backup.
7. From then on, accepted applications are moved at the moment of acceptance.

**Tests (integration, real database):** the report changes nothing; after moving, proof fields,
register entry, history and audit log are identical and only grew; applications with notes are
skipped; a second run does nothing; data cannot come back through the API; the database refuses
empty fields otherwise; a rolled-back transaction leaves the application as it was.

### Notifications

A nightly job deletes read notifications after 30 days and unread ones after 90 days. They never
contained personal data; security events (e.g. a sign-in from a new device) are independently in
the audit log, kept for its 12 months (tested: the notification goes, the audit entry stays).

### CC-1 improvements

| Point | What was done |
|---|---|
| Language menus | Two menus: "Interface: Deutsch/English/العربية" (the Control Center's language) and Payload's menu, now labelled "Content language", shown only where content has languages (not on applications, members, messages, accounts, the audit log or the Control Center's own screens). On phones the interface menu is a globe (its words stay for screen readers), so that both menus fit the screen's width; before, the header of content screens was up to 127 px wider than a 390 px phone. Also fixed for Arabic on phones: lists stood 32 px past the screen's edge (Payload positions them for left-to-right only), and screens with a rich-text editor could be scrolled 10,000 px sideways (its hidden pop-ups are parked off screen) |
| Edit screens | Applications and members are titled "Last name, first name" (the number only, once an application's data were moved) instead of the last name alone; all field labels exist in three languages (checked by a script over every collection and global); the page builder shows a preview image per block, and its rows carry the block's name and number only (Payload's optional free name per block showed "Untitled" and was mistaken for a missing heading); dates in every edit screen as 21.10.2026 (Payload's picker showed 10/21/2026); consistent styles for the new panels |
| Assignment | Reviewed and changed: the list of people comes from the server with id and name only, so membership managers (who may not read the accounts) can assign colleagues — before, they could only assign themselves. Only people whose role, minus restrictions, can read and work on the inbox can be assigned; the server refuses anyone else for every way in. **An assignment grants no access**: who sees an application is decided by the role alone. Contact messages notify the person assigned too; the lists show names, also to roles without `users.read` |
| CSV in Excel and LibreOffice | LibreOffice: tested automatically. Excel: a sample file is supplied for a manual check (below) |

### Page builder

| Part | Implementation |
|---|---|
| Pages | A collection "Pages": title, address (`/<slug>`, the same in all languages; addresses of existing pages and of the Control Center are reserved), the blocks, search-engine and sharing settings. Drafts with autosave, versions, scheduled publishing |
| Blocks | 24 sections of the design system: page header, header with image, home stage; text, cards, image and text, guiding statement, quote, questions and answers, gallery, timeline, values, journey; night band, call to action, donations; projects, news, upcoming events, focus areas, statistics, board, partners (from the CMS); membership form, contact and form. Each with a preview image in the block menu and grouped |
| Controls | Every field has a maximum length or number of entries; choices are fixed values of the design (background light/sky blue, image at the start/end, number of entries); **no free HTML, colours, sizes or embeds**; links only to pages of the website, pages of the builder or checked addresses (https, mailto, tel — no javascript:, data: or similar, also in rich text, refused on save and not rendered); images through the media library with required alt text. Layout rules on every save: one page opening at the top, the home stage only on the home page, the forms only on their own page and exactly once there |
| Fixed pages | Home, About us, Membership, Support us, Contact are pages of the builder with fixed addresses; they cannot be deleted, their address cannot change, and their form stays. **Built once from the former page texts** on the first start of the new version (all three languages, every text unchanged — tested on a real database); the former page globals stay unchanged, hidden and read-only. The texts inside the forms (declarations, consents) moved unchanged into "Form texts", with versions |
| Unchanged website | Screenshots of the five fixed pages in three languages on desktop and phone, old build against new build on the same data: **identical** (26 of 30 without any differing pixel, the home page with 0.004–0.015 %, a sub-pixel difference at one button) |

### Publishing

| Part | Implementation |
|---|---|
| Drafts and versions | Pages, projects, news and events: drafts with autosave (every 2 s), up to 50 versions each, restorable. Legal notice, privacy policy, site settings, menu and form texts: versions (who changed what, when) |
| Scheduled publishing | Payload's "schedule publish" for pages, projects, news and events; the queue is checked every minute. **Added safeguard:** Payload does not check permissions when a publication is scheduled; here the publication runs only if the person who scheduled it still exists, is active and may edit content at that moment — otherwise it is not carried out and the refusal is logged. Each scheduled publication is in the audit log with the person who scheduled it. The dialog starts in the time zone Europe/Berlin |
| Live preview | Next to the editor, in phone, tablet and desktop sizes; it renders the latest draft exactly as the website would and follows every saved change (also autosave). Served **only on the Control Center's host**, only to people signed in with both factors who may read content; never indexed or cached; only this page may be framed, and only by the Control Center itself |

### Events, menu, search engines, redirects

| Part | Implementation |
|---|---|
| Events | Title, address, summary, start and end (Berlin time; the end cannot be before the start), place, optional registration link (checked), image, text. `/veranstaltungen` (`/en/events`, `/ar/events`): upcoming first, then past ones; event pages; a calendar file (`.ics`) per event, generated by the website — no calendar or map service. A block "Upcoming events" for any page |
| Menu | "Navigation" in the Control Center: the menu entries (to fixed pages, builder pages or addresses) and the highlighted button, per language; it starts as the usual menu. **So that it fits on one line:** at most six entries, at most 20 characters each and 60 in all; with ordinary words that fits from 1280 px wide (tested at 1440 px with the longest allowed menu). Where the menu does not fit (narrower windows from 1024 px, unusually wide words), the header shows the menu button instead of a broken line (tested at 1024 px); this also fixes the German and English menus, whose labels wrapped onto two lines at exactly 1024 px before CC-2. Legal notice and privacy policy are always in the footer and cannot be removed |
| Search engines and sharing | Per page, project, post and event: title and description for search engines, sharing image, "hide from search engines"; a live preview of the search result with character counts. The website sends Open Graph data (title, description, image 1200 × 630) and leaves hidden pages out of the sitemap. Until launch nothing is indexed (`ALLOW_INDEXING`) |
| Redirects | Old address → fixed page, builder page or another site, permanent (308) or temporary (307). Applied only where the website would otherwise answer "not found", so no existing page can be hidden; addresses of existing pages and the Control Center are refused; no loops (checked through up to ten steps). Visitors cannot list them |

### Permissions

No new permissions: pages, events, menu, form texts and redirects use `content.read` and
`content.write` (super administrators and content editors write; board administrators and auditors
read). Tested: auditor, technical administrator and membership manager cannot create pages;
membership managers get no preview; visitors cannot list redirects.

### Development notes

- A migration of CC-2 had used Payload's Local API to insert the legal bases; on a fresh database
  that breaks once later collections exist. It now uses plain SQL (same content).
- New dependency (exact, older than 14 days): `@payloadcms/live-preview-react` 3.90.2 (with
  `@payloadcms/live-preview` 3.90.2), from Payload itself.
- `scripts/block-thumbnails.mjs` draws the block previews (`public/admin/blocks`).

### Tests not yet done

| What | Why not yet | How |
|---|---|---|
| CSV in Microsoft Excel | No Excel in the test environment | Open the sample files (`;` and `,`) in Excel (Windows and Mac): umlauts and Arabic names readable, one column per field, values starting with `=`, `+`, `-`, `@` shown as text, not run |
| Wording of the legal bases | EUR-Lex not reachable from the development environment | Compare the six texts with the official German and English wording; the Arabic one is marked unofficial |
| Approved processing purposes | The association's decision | Enter the purposes, have them approved by a super administrator with the decision reference; until then exports are impossible |
| Scheduled publishing through the admin's date picker | Covered on the server (integration tests run the job queue); the picker itself is Payload's | Schedule one page in the Control Center and check it appears at the time |
| Security and notification e-mails, admin host protection, backups | As in CC-1 (SMTP, CC-3) | As in §15 |

### Known limitations

- Redirects apply to addresses without a file ending (e.g. not `/alt.html`); those answer 404.
  On the first, uncached answer of a redirect Next.js sends its `Location` header twice (the same
  address); browsers and search engines follow it, later answers have it once.
- Links inside the live preview lead to the website's host, which may not be framed; the preview
  is for looking, not for clicking through.
- Drafts are saved without the layout rules (Payload checks drafts only on publishing); the rules
  apply when a page is published.
- A language without its own text shows the German one (as before), without a notice on builder
  pages.
- The default menu does not contain "Events"; editors add it when the first events exist.
- Payload's scheduling dialog names the choice of languages "All" in every interface language
  (fixed text in Payload 3.90.2).
- Whether the menu fits is measured in the browser after the page has loaded. Without
  JavaScript the full menu stays; in a narrow desktop window a long menu then reaches into the
  highlighted button. With JavaScript, such a window switches to the menu button right after
  loading (a short visible change, only where the menu does not fit).
- The former page globals stay in the database as the record of the old texts; removing them is
  a later decision.

---

## Sources

Payload: installed package `payload` 3.90.2 (types and source in `node_modules`), documentation
https://payloadcms.com/docs/configuration/overview.

docker-socket-proxy: https://github.com/Tecnativa/docker-socket-proxy (README: access sections,
`POST` and `ALLOW_RESTARTS` revoked by default, "Never expose this container's port to a public
network").

cPanel (secondary): https://docs.cpanel.net/cpanel/databases/,
https://www.namecheap.com/support/knowledgebase/article/9797/29/cpanel-control-panel-overview/,
https://support.exabytes.com.my/en/support/solutions/articles/14000131600-node-js-for-cpanel.

Plesk (secondary, reseller pages): https://layerstack.com/plesk,
https://www.easyspace.com/dedicated-servers/plesk-obsidian,
https://www.valebyte.com/en/blog/plesk-vps-hosting-best-plans-and-setup-in-2026/,
https://stackharbor.com/en/knowledge-base/plesk-obsidian-ubuntu-2204-deploy/.

CloudPanel: https://www.cloudpanel.io/docs/v2/introduction/,
https://www.cloudpanel.io/docs/v1/admin-area/database-servers,
https://www.cloudpanel.io/blog/cloudpanel-review.

npm registry (versions, publish dates, licences) checked on 2026-10-19 for `otpauth`,
`@simplewebauthn/server`, `@simplewebauthn/browser`, `web-vitals`, the Payload plugins and
`ua-parser-js` (not used: AGPL-3.0).
