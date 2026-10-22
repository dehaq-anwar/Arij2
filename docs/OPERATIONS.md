# Youth of Peace — Operations guide

**Deutsche Fassung:** [OPERATIONS.de.md](OPERATIONS.de.md)

**Status:** draft, 2026-10-22, written against the code of CC-0 to CC-5
([CONTROL-CENTER.md](CONTROL-CENTER.md) §14–§19). **Nothing in this guide has been run on a real
server yet.** There is no server (decision 2), and CC-3 was built and tested locally and in CI
only (CONTROL-CENTER.md §17). Try every procedure on a test server before relying on it.

**Conventions**

- `[PLACEHOLDER: …]` marks a decision or a value that is still missing.
- Commands run on the server, in the repository folder, as a user that may use Docker.
- `<angle brackets>` are values you fill in. Secrets are never written into this guide.
- **Approval needed** marks actions that change or delete production data. They need the
  association's explicit approval first (CONTROL-CENTER.md §17, first paragraph: no restore or
  deletion with effect without its explicit approval).

**Contents**

1. Overview
2. Server requirements
3. First deployment
4. E-mail
5. Backups and restore drills
6. Restore
7. Updates
8. Monitoring and alerts
9. Data protection facts for operations
10. Troubleshooting
11. Pre-launch checklist

---

## 1. Overview

### 1.1 Services

Production is one Docker Compose project named `yop` (`docker-compose.prod.yml`) with five
services, plus `tools` for server commands (profile `tools`, started only for one command,
§3.6). Only Caddy publishes ports.

| Service | Image | What it does | Published ports |
|---|---|---|---|
| `caddy` | `caddy:2.11.7-alpine`, pinned by digest | TLS certificates, HTTP → HTTPS, the website host and the Control Center host, `www` redirect, admin gate, access logs | `80/tcp`, `443/tcp`, `443/udp` |
| `app` | `yop-website:<APP_VERSION>`, built from `docker/Dockerfile` | Website and Control Center (Next.js 16.4.2, Payload 3.91.0), port 3000 inside Docker | none |
| `postgres` | `postgres:18.6-alpine3.24`, pinned by digest | Database | none |
| `ops-agent` | `yop-ops-agent:<APP_VERSION>`, built from `ops-agent/Dockerfile` | Backups, restore drills, status, masked logs, restarts of `app` and `caddy`, certificate checks, visitor counts; port 4100 inside Docker; signed requests from the app only | none |
| `socket-proxy` | `tecnativa/docker-socket-proxy:v0.5.0`, pinned by digest | Docker API for the agent only, limited to the agent's exact calls (`docker/socket-proxy/haproxy.cfg.template`) | none |

Hardening in the compose file: read-only root file system for `caddy`, `app`, `ops-agent` and
`socket-proxy` (`/tmp` in memory); all Linux capabilities dropped for `caddy` (except binding
ports below 1024), `app` and `ops-agent`; `no-new-privileges` for all five. The app runs as user
`nextjs` (uid 1001), the agent as `agent` (uid 1000).

The agent's image also contains the tools it runs: restic 0.19.1, rclone 1.75.1 and the
PostgreSQL 18.6 client tools (`pg_dump`, `pg_restore`, `psql`) (`ops-agent/Dockerfile`).

### 1.2 Networks and volumes

| Network | Internal | Members | Used for |
|---|---|---|---|
| `web` | no | caddy, app, ops-agent | Caddy → app; the agent checks certificates at `caddy:443` |
| `egress` | no | app, ops-agent | Outbound: media bucket and mail server (app); backup storage and media bucket (agent) |
| `db` | yes | postgres, app, ops-agent | Database |
| `ops` | yes | app, ops-agent | App → agent (`http://ops-agent:4100`) |
| `docker` | yes | ops-agent, socket-proxy | Agent → Docker API (`http://socket-proxy:2375`) |

| Volume | Content |
|---|---|
| `pgdata` | PostgreSQL data (`/var/lib/postgresql`) |
| `nextcache` | The app's `/app/.next/cache` |
| `caddy_data` | Caddy's certificates and keys |
| `caddy_config` | Caddy's configuration state |
| `caddy_logs` | Access logs; mounted read-only into the agent |
| `agent_data` | The agent's state (`state.json`: history of backups, drills and restarts, and what each backup contained), the restic cache, and a full local mirror of the media bucket (`media-mirror`) |

### 1.3 The two hosts and the admin gate

- `SITE_HOST` is the website, `ADMIN_HOST` the Control Center. Compose turns them into the app's
  `SERVER_URL=https://<SITE_HOST>` and `ADMIN_URL=https://<ADMIN_HOST>`.
- The association chose `verwaltung.yop-ye.org` as the Control Center's address (CONTROL-CENTER.md
  §14). `SITE_HOST`: `[PLACEHOLDER: website host name]`.

How Caddy (`docker/caddy/Caddyfile`) and the app (`src/lib/admin-host.ts`) handle a request:

1. **`www.<SITE_HOST>`:** permanent redirect to `https://<SITE_HOST>` with the same path.
2. **`<SITE_HOST>`:** Caddy removes any `X-Admin-Gate` header the visitor sent
   (`header_up -X-Admin-Gate`, Caddyfile line 62) and passes the request to the app. The app
   answers 404 for `/admin`, the live preview and `/api`. The only exception is `GET`/`HEAD` on
   `/api/media/file/…` (the website's images and files).
3. **`<ADMIN_HOST>`:**
   1. Caddy checks the visitor's address against `ADMIN_ALLOW_IPS`
      (`@outside not remote_ip …`, line 77). Outside the list, Caddy answers 404 (line 78).
   2. Otherwise Caddy sets `X-Admin-Gate: <ADMIN_GATE_SECRET>` (line 81). This replaces any value
      the visitor sent.
   3. The app compares the header with its own `ADMIN_GATE_SECRET`. Missing or wrong: 404. Correct:
      `/admin`, `/api` and `/_next/` are the Control Center, the live preview is served, `/`
      redirects to `/admin`, and any other path redirects to the website host.

Further facts:

- `ADMIN_ALLOW_IPS` is a space-separated list of networks (example from `.env.example`:
  `203.0.113.0/24`). Empty or unset means `0.0.0.0/0 ::/0`, i.e. everyone. Sign-in with two
  factors applies either way.
- The gate header is deleted from the access logs by the log filter.
- Caddy runs without its admin API (`admin off`, Caddyfile line 7). A change to the Caddyfile or
  to Caddy's environment needs a restart of the `caddy` container.
- All three hosts send `Strict-Transport-Security: max-age=31536000` (the `(https_only)` snippet in
  the Caddyfile): for a year after the last visit, browsers use HTTPS only for them, also when
  someone types `http://`. Other subdomains of the domain are not included (no
  `includeSubDomains`). Tested in `tests/integration/caddy.test.ts`.
- Clients connecting over IPv6 can break the allowlist. See §2.1.

---

## 2. Server requirements

| Requirement | Details |
|---|---|
| Server | `[PLACEHOLDER: hosting provider, EU location and server size — decision 2]` |
| Docker | Docker Engine with Docker Compose v2 (`docker compose`). The compose file uses the Compose Specification (top-level `name:`). `docker/Dockerfile` uses BuildKit features (`# syntax=docker/dockerfile:1`, `RUN --mount=type=secret`). `[PLACEHOLDER: minimum Docker Engine and Compose versions — the repository states none]` |
| Docker socket | `/var/run/docker.sock` on the host; mounted into `socket-proxy` only |
| DNS | Records for `<SITE_HOST>`, `www.<SITE_HOST>` and `<ADMIN_HOST>` pointing at the server. Caddy requests certificates for these site addresses. `[PLACEHOLDER: DNS provider — decision 4]` |
| Inbound ports | `80/tcp` and `443/tcp` reachable from the internet. Compose also publishes `443/udp` |
| Outbound | Caddy: the certificate authority. App: media bucket, mail server. Agent: backup storage, media bucket. Building the images: npm registry and image registries (`npm ci` and the base images in the Dockerfiles) |
| Disk | Database (`pgdata`); a full copy of the media bucket in `agent_data` (the agent mirrors the bucket before backing it up); the restic cache; a temporary second copy of the database during every restore drill (restored on the same PostgreSQL server); access logs of up to 7 days. The Control Center warns at 90 % disk use. `[PLACEHOLDER: disk size]` |
| Host administration | `[PLACEHOLDER: server access (who, how), firewall, automatic security updates]`. CONTROL-CENTER.md §0 states that the host installs system updates itself (unattended upgrades); the host setup is not part of this repository |
| External uptime monitor | `[PLACEHOLDER: service or none — decision 8]`. Without it, an outage of the whole server is noticed only by people (CONTROL-CENTER.md §17) |

### 2.1 IPv6

1. **Socket proxy.** Compose sets `DISABLE_IPV6: '1'` for `socket-proxy`
   (service `socket-proxy` in `docker-compose.prod.yml`). Reason, from the compose comment: the internal network has
   no IPv6, and listening on `[::]` stopped the proxy from starting (found by the integration test,
   CONTROL-CENTER.md §17). Keep this setting. If IPv6 is ever enabled on the `docker` network,
   review it.
2. **Visitors over IPv6.** The Docker networks in this compose file have no IPv6. If the server
   is reachable over IPv6 (AAAA records), such clients reach Caddy through Docker's userland proxy
   and appear with the proxy's address. The allowlist (`ADMIN_ALLOW_IPS`) and the app's rate
   limits then see one address for all of them (CONTROL-CENTER.md §17, Known limitations). The
   remedies named there: enable IPv6 for the Docker network, or disable Docker's userland proxy.
   `[PLACEHOLDER: chosen remedy and exact steps for the server's Docker version — not tested in this project]`

---

## 3. First deployment

### 3.1 Get the code onto the server

`[PLACEHOLDER: how a release reaches the server, e.g. a checkout of a git tag — not decided]`

### 3.2 Create `.env`

```bash
cp .env.example .env
chmod 600 .env
```

Fill in the variables below. Never commit `.env`. Generate every secret separately.

Compose passes to each container only what it uses: the app does not get the backup password or
the backup storage keys (`docker-compose.prod.yml`, comment at the `app` service).

**Required:** compose refuses to start without it (`${…:?set in .env}`).
**Practically required:** compose starts, but a feature does not work without it.

| Variable | Purpose | Required | Value |
|---|---|---|---|
| `SITE_HOST` | Website host name, without `https://` | Required | `[PLACEHOLDER: website host name]` |
| `ADMIN_HOST` | Control Center host name, without `https://` | Required | `verwaltung.yop-ye.org` (CONTROL-CENTER.md §14) |
| `ACME_EMAIL` | Contact address for the certificate authority (expiry warnings) | Required | `[PLACEHOLDER: contact address]` |
| `ADMIN_GATE_SECRET` | Proves to the app that a request came through Caddy's admin host block (§1.3) | Required (compose); `.env.example` calls it optional, which applies only without Caddy | `<generate: openssl rand -hex 32>` |
| `ADMIN_ALLOW_IPS` | Networks allowed to open the Control Center, space-separated | Optional; empty = everyone | `[PLACEHOLDER: allowlist or none]` |
| `ALLOW_INDEXING` | Lets search engines index the website | Optional; default `false` | `false` until launch; `true` only at launch |
| `PAYLOAD_SECRET` | Payload's secret | Required | At least 32 random bytes: `<generate: openssl rand -hex 32>` |
| `MFA_ENCRYPTION_KEY` | Encrypts the authenticator secrets of the two-factor sign-in | Optional; set it before going live (CONTROL-CENTER.md §14) | `<generate: openssl rand -hex 32>`. If empty, a key is derived from `PAYLOAD_SECRET`. Changing it (or `PAYLOAD_SECRET` while it is empty) later means every account sets up its authenticator app again |
| `POSTGRES_USER` | Database user | Required | `yop` (as in `.env.example`) |
| `POSTGRES_DB` | Database name | Required | `yop` (as in `.env.example`) |
| `POSTGRES_PASSWORD` | Database password | Required | `<generate: openssl rand -hex 32>`. Use hex characters only: compose puts the password into connection URLs without escaping (lines 56 and 137), so characters such as `@`, `/`, `:` or `%` would break them |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | Media storage (S3-compatible, EU region). Also read by the agent to back up the media | Practically required: without `S3_BUCKET` uploads go to a local `MEDIA_DIR`, which this setup does not provide, and the agent's media backup fails with "S3_BUCKET is not set" | `[PLACEHOLDER: media storage provider, EU region, endpoint, bucket, path style]`; access keys from the provider |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Mail server (see §4) | Optional; without a mail server nothing is sent | `[PLACEHOLDER: mail provider and sender — decision 5]`; port default `587` |
| `NOTIFY_EMAIL` | Receives "new application / new message" notifications (no personal data in them) | Optional | `.env.example`: `info@yop-ye.org` (decision 17 open) |
| `MAIL_ALLOW_INTERNAL_HOSTS` | `true` allows a mail relay inside the server's network when entered in the Control Center (§4) | Optional | Empty |
| `AUDIT_RETENTION_MONTHS` | Months the audit log and the export register are kept (1–120) | Optional; empty = 12 (decided 2026-10-20) | Empty |
| `MEMBERSHIP_CONSOLIDATION` | `on` moves personal data of accepted applications into the members register | Optional | `off` until the association decides (decision 12) |
| `APP_VERSION`, `APP_COMMIT` | Release shown in the Control Center; build arguments; `APP_VERSION` also tags both images | Optional; empty = `latest` / `unknown` | Set by the deployment, e.g. the git tag and the commit |
| `OPS_AGENT_SECRET` | Signs every request between app and agent | Required. At least 32 characters: shorter, the agent does not start and the Control Center shows "not set up" (`ops-agent/src/config.ts`, `src/cms/operations/agent.ts`) | `<generate: openssl rand -hex 32>` (64 characters) |
| `RESTIC_REPOSITORY` | restic repository on the backup storage | Practically required; empty = backups not set up | `[PLACEHOLDER: backup storage with object lock, EU — decision 9]`; form as in `.env.example`: `s3:https://<endpoint>/<bucket>` |
| `RESTIC_PASSWORD` | Encrypts the backups | Practically required | `<generate: openssl rand -hex 32>`. Keep a copy offline with the board: without it no backup can be read. `[PLACEHOLDER: who keeps the offline copy — decision 9]` |
| `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY` | Credentials for the backup storage; given to the agent as `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Practically required | From the provider: a key that can write but not delete, where the provider supports it |
| `BACKUP_TIME`, `DRILL_DAY`, `DRILL_TIME` | Nightly backup and weekly restore drill, local time Europe/Berlin | Optional | `02:30`, `sun`, `04:00`. Format `HH:MM` (24 h) and `sun`…`sat`; invalid values fall back to these defaults |
| `BACKUP_KEEP_DAILY`, `BACKUP_KEEP_WEEKLY`, `BACKUP_KEEP_MONTHLY` | Snapshots kept after each backup (§5.3) | Optional | `7`, `4`, `6` (proposal until decision 9); empty = these values |
| `LOG_LEVEL` | App log level (`trace` … `fatal`) | Optional | `info` |

**Not used in production.** `SERVER_URL`, `ADMIN_URL`, `DATABASE_URL`, `OPS_AGENT_URL` and
`NEXT_TELEMETRY_DISABLED` in `.env` are for development. Compose sets these values for the
containers itself (`docker-compose.prod.yml` lines 56–58, 63, 81).

### 3.3 Check the configuration

```bash
docker compose -f docker-compose.prod.yml --env-file .env config --quiet
```

No output means the file is valid. A missing required variable stops the check with
"set in .env". CI runs the same check with example values (`.github/workflows/ci.yml`, step
"Production configuration").

Without `--quiet` the command prints the whole configuration, including every secret. Do not
paste that output anywhere.

### 3.4 Build and start

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --env-file .env ps
```

- This builds `yop-website:<APP_VERSION>` and `yop-ops-agent:<APP_VERSION>`, pulls the three
  pinned images and starts all services. The build needs no secrets.
- `app` and `ops-agent` start once PostgreSQL reports healthy.
- `postgres`, `app` and `ops-agent` have health checks and should show `healthy`. `caddy` and
  `socket-proxy` have none and should show `running`.

### 3.5 Database migrations

Migrations run by themselves. `src/payload.config.ts` (line 263) passes the committed migrations
as `prodMigrations`, and Payload applies pending ones when it connects to the database with
`NODE_ENV=production` (set in the image). docs/development.md: "The production container applies
pending migrations by itself on first start." There is no `push` of the schema in any
environment.

Follow the start in the app's log:

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs -f app
```

Check the newest applied migration (the query the backup uses, `ops-agent/src/backup.ts`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec postgres \
  sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select name from payload_migrations order by id desc limit 1;"'
```

The name should correspond to the newest file in `src/migrations/`.

Note: the CC-0 migration ends every session that existed before it (CONTROL-CENTER.md §14). This
matters only for a database that already had accounts.

### 3.6 Create the first super administrator

The CMS has no open sign-up, also not for the first account. The first super administrator is
created on the server with `scripts/create-admin.ts`, run by the `tools` service of the compose
file. The running website image cannot do it: it contains only the compiled server, not the
source and Payload's command-line tool. `tools` is a separate image built from the same
Dockerfile (target `tools`) with the source and all dependencies. It has the profile `tools`, so
`up` never starts it; it runs only for one command and is removed afterwards (`--rm`).

```bash
docker compose -f docker-compose.prod.yml --env-file .env --profile tools run --rm tools \
  npm run create-admin -- <email> "<name>"
```

- The first run builds the `yop-website-tools` image (a few minutes).
- On an empty database the command applies the migrations itself before it creates the account,
  so it also works before the app has started once.
- The password comes from `ADMIN_PASSWORD` if set (at least 12 characters; pass it with
  `-e ADMIN_PASSWORD=…` after `run`). Otherwise a random password is printed once. Treat that
  output as a secret.
- An address that already has an account is refused.
- Whose account: the association's own account becomes the main super administrator. No real
  accounts are created before the association names them, and there are no test accounts with
  admin rights in production (CONTROL-CENTER.md §14).
  `[PLACEHOLDER: e-mail address and name for the first super administrator account — named by the association]`

Tested on an empty database with the production compose file (locally, and in CI on every
commit: job "production" in `.github/workflows/ci.yml`): the account is created with the role
super administrator, a second account with the same address is refused, and `reset-mfa`
(§3.9) works the same way. Not yet run on the real server.

### 3.6a Initial content (once)

A new database has the fixed pages (built from the page texts when the app starts) but no other
content. `npm run seed` fills in the initial content: the page texts in three languages, four
focus areas and five project slots with abstract placeholder images, all as placeholders
(`[PLACEHOLDER: …]`) or marked drafts. It never overwrites content that exists.

```bash
docker compose -f docker-compose.prod.yml --env-file .env --profile tools run --rm tools \
  npm run seed
docker compose -f docker-compose.prod.yml --env-file .env restart app
```

- Only with the media storage set up (`S3_*`, §3.2): the placeholder images are uploaded there.
- Restart the app afterwards: pages it has already rendered keep the empty state until then.
- Never `npm run seed -- force` on the real database: it resets the seeded texts.
- Tested with the tools image against an empty database and S3-compatible storage (locally):
  the texts, focus areas, project slots with their images and the fixed pages were created.

### 3.7 Set up two-factor sign-in at once

1. Open `https://<ADMIN_HOST>/admin` (the command prints this address).
2. Sign in with the e-mail address and the password.
3. Set up the authenticator app (Google Authenticator, Microsoft Authenticator or similar) with
   the QR code. The account can do nothing else before this step.
4. Keep the 10 recovery codes offline. They are shown only once.
   `[PLACEHOLDER: where the association keeps recovery codes]`
5. Change the initial password (create-admin header: "Change the password afterwards").

"My security" (`/admin/security`) shows sessions, known devices and the recovery codes.

### 3.8 Second super administrator

- At least two super administrators are needed, so that one can reset the other's second factor
  (CONTROL-CENTER.md §4, §3.3).
- The association names this person later (§15). Create the account the same way as the first
  (§14, "Before going live with CC-0", item 4), then §3.7 for that person.
  `[PLACEHOLDER: second super administrator — decision 13]`
- All other accounts are created by administrators in the Control Center (docs/development.md).

### 3.9 Other server commands

All three run through the `tools` service like `create-admin` (§3.6):
`docker compose -f docker-compose.prod.yml --env-file .env --profile tools run --rm tools npm run <command>`.

| Command | What it does | When |
|---|---|---|
| `npm run reset-mfa -- <email>` | Resets one account's second factor and ends all its sessions. Logged in the audit log; the account gets an e-mail | Emergency only: the person lost both phone and recovery codes, and no other super administrator can reset it in the Control Center (`scripts/reset-mfa.ts`) |
| `npm run membership:consolidate` | Report only: which accepted applications would be moved. Changes nothing | Before decision 12 |
| `npm run membership:consolidate -- --apply` | Moves the personal data of accepted applications into the members register | **Approval needed.** Only after the association approved the proposal, after a backup, and with `MEMBERSHIP_CONSOLIDATION=on`. Migration plan: CONTROL-CENTER.md §16 |

### 3.10 Checks after the first start

From CONTROL-CENTER.md §17, "Not tested on a real server":

1. `https://<SITE_HOST>` shows the website. `https://<SITE_HOST>/admin` answers 404.
2. `https://<ADMIN_HOST>/admin` shows the sign-in. If `ADMIN_ALLOW_IPS` is set, an address
   outside it gets 404.
3. Operations → Domains & TLS: both certificates are trusted.
4. Operations → Services & status: five services running. Compare CPU, memory and disk once with
   `free` and `df` on the server.
5. Operations → Backups: "Back up now", then "Test a restore" (after §5 is set up).
6. Operations → E-mail: "Test e-mail to me" (after §4 is set up).

---

## 4. E-mail

Settings come from two places:

| Where | What | Who |
|---|---|---|
| `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `NOTIFY_EMAIL` | Server settings | People with server access |
| Control Center: Operations → E-mail → "Edit settings" | Mail server, port, user name, sender address and name, address for new applications and messages, **technical address for warnings**, domain and DKIM selector for the checks | Permission `email.manage` (super administrator, technical administrator); saving needs a code from the last five minutes and is in the audit log |

Rules (`src/cms/mail/settings.ts`, `src/cms/email.ts`):

- Empty fields in the Control Center use the server settings. An installation configured only in
  `.env` keeps working.
- The mail server **password is only ever read from `SMTP_PASSWORD`** on the server (decision 16
  as recommended). The screen shows "set on the server" or "not set". After changing `.env`, run
  `docker compose -f docker-compose.prod.yml --env-file .env up -d` so the app gets the new value.
- E-mail is sent only when a mail server and a sender address are set. Otherwise nothing is sent,
  the app logs "E-mail not sent: no mail server configured", and the delivery log records
  "not sent".
- Port 465 uses TLS from the start. Every other port must upgrade with STARTTLS.
- The technical address exists only in the Control Center settings, not in `.env`. Without it,
  warnings appear only in the bell (§8.2).
- **`MAIL_ALLOW_INTERNAL_HOSTS`** (`src/cms/mail/host-policy.ts`): a mail server entered **in the
  Control Center** is used only on ports 25, 465, 587 or 2525, and only if every address its name
  resolves to is on the internet (not this machine, not a private, link-local, shared or reserved
  network). Otherwise sending fails with `PORT_NOT_ALLOWED`, `HOST_NOT_ALLOWED` or
  `HOST_NOT_FOUND`. `MAIL_ALLOW_INTERNAL_HOSTS=true` also allows a relay inside the server's
  network there. `SMTP_HOST` from `.env` is always used as it is, without this check.

The E-mail screen (`/admin/email`) shows the server in use and its source, deliveries of the last
30 days, the delivery log (shortened recipient, no subject or content, kept 90 days), the domain's
MX, SPF, DKIM and DMARC records (looked up from the server), and the templates. "Test e-mail to me"
sends through the real transport to the signed-in person's own address only, at most five per
hour. A failed delivery warns everyone with `email.manage` in the bell, once a day; it is not
reported by e-mail.

`[PLACEHOLDER: mail provider, sender address, DKIM selector — decision 5]`

---

## 5. Backups and restore drills

The operations agent runs backups and restore drills on its own schedule, independent of the
website: they run even when the app is down (`ops-agent/src/scheduler.ts`).

### 5.1 What is backed up

| Part | How (`ops-agent/src/backup.ts`) | restic tags |
|---|---|---|
| Database | `pg_dump` in custom format, streamed into restic as `/database.dump`. The row count of every table, the database triggers and the newest migration are taken in the same database snapshot and stored in the agent's state, so the drill can compare | `yop`, `db` |
| Media | `rclone sync` of the media bucket into `/var/lib/agent/media-mirror`, then `restic backup` of that folder | `yop`, `media` |

Everything goes into one encrypted restic repository, host name `yop`.

**Not backed up:** `.env` (the secrets), `caddy_data` (certificates), `agent_data` (the agent's
history and backup records; without them the drill compares structure only), the access logs.
`[PLACEHOLDER: where a copy of the server's .env is kept, and by whom]`

### 5.2 Schedule

| Task | Default | Variable |
|---|---|---|
| Backup | Daily 02:30 | `BACKUP_TIME` |
| Restore drill | Sundays 04:00 | `DRILL_DAY`, `DRILL_TIME` |

- Times are local time Europe/Berlin (agent default `TIME_ZONE`; compose does not set it).
- The scheduler checks twice a minute. A task runs once on its day and minute. It does not run in
  the minute the agent started.
- Only one backup or drill runs at a time. A scheduled task that finds one running is skipped.
- When the agent stops during a backup, the backup is not resumed; the next night's run takes
  over (`ops-agent/src/main.ts`).

### 5.3 Retention

- After each backup the agent runs `restic forget --prune` with **7 daily, 4 weekly, 6 monthly**
  (defaults in `ops-agent/src/config.ts`; a proposal, decision 9 open).
- With object lock, locked data cannot be removed yet. The history then shows
  "retention: not applied: …". The backup itself still counts.
- The numbers are set in `.env` with `BACKUP_KEEP_DAILY`, `BACKUP_KEEP_WEEKLY` and
  `BACKUP_KEEP_MONTHLY` (whole numbers up to 1000). An empty or invalid value means the proposal
  above, never "keep none". Changing them is decision 9; after a change run `up -d` so the agent
  gets the new values.
- Deleted personal data stays in backups until they expire (up to about six months with this
  scheme; docs/privacy-notes.md).

### 5.4 The restic repository

- Settings: `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `BACKUP_S3_ACCESS_KEY_ID`,
  `BACKUP_S3_SECRET_ACCESS_KEY` (§3.2). Backups count as set up when the repository and the
  password are set.
- **No manual `restic init` is needed.** The first backup checks the repository and creates it
  if it does not exist yet (`ensureRepository` in `backup.ts`). Any other error is reported.
- The storage itself is set up at the provider:
  `[PLACEHOLDER: bucket with object lock, lock period and access key at the backup provider — decision 9]`
- The password must exist offline with the board (decision 9). Without it no backup can be read.

### 5.5 Running a backup or a drill by hand

**In the Control Center (normal way).** Operations → Backups → "Back up now" or "Test a restore".

- Needs `operations.act` (super administrator, technical administrator) and a code from the last
  five minutes.
- At most 4 manual backups or drills per hour, one at a time. The result appears in the history
  after a few minutes.
- The button's drill reads back 5 % of the repository's data (`restic check --read-data-subset=5%`).

**On the server (command line).** Same code as the service (`ops-agent/src/cli.ts`):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts backup
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts drill
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts verify   # backup, then drill
```

- Prints one JSON line per result (counts, never data). Exit code 1 when a result is not ok.
- The command-line drill reads back **the whole repository** (`--read-data-subset=100%`,
  `cli.ts` line 30). This can take long.
- Caution, from the code: the command runs in its own process. The running service does not see
  it. It does not apply the service's "one at a time" rule, and its result does not appear in the
  Control Center. The service keeps its state in memory and rewrites `state.json` at its next
  event, which drops what the command recorded there (`ops-agent/src/state.ts`). The snapshot in
  the repository stays. Use the Control Center when it is available, and do not start the command
  while a backup or drill is running.

List the stored snapshots (Control Center: Backups → "Stored snapshots"):

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent \
  restic snapshots --host yop --tag yop
```

### 5.6 What the restore drill checks

`ops-agent/src/drill.ts`, weekly and on request:

1. Takes the newest database snapshot.
2. Drops and creates the separate database `restore_drill` on the same PostgreSQL server.
3. Restores: `restic dump <snapshot> /database.dump | pg_restore --no-owner --no-acl --exit-on-error`.
4. Compares every table's exact row count, the newest migration and the database triggers with
   what the backup recorded. Without a record (e.g. after losing `agent_data`) it checks the
   structure only: tables exist, and the five protective triggers `audit_log_no_truncate`,
   `audit_log_no_update_or_delete`, `exports_no_truncate`, `exports_no_update_or_delete`,
   `users_keep_super_admin`.
5. Lists the newest media snapshot and counts its files.
6. Reads back part of the repository (`restic check`).
7. Drops `restore_drill`, so no second copy of personal data stays on the server.

The drill does not restore media files and does not touch the live database.

---

## 6. Restore

> **Approval needed.** Restoring the live database replaces the association's data with an older
> state. It needs the association's explicit approval. The Control Center deliberately has no
> restore button: decision 10 is open (CONTROL-CENTER.md §8, §14, §17).
>
> **Draft. Not rehearsed.** This procedure has not been run, neither on a test server nor in
> production. It **must be rehearsed on a test server before it is relied on**. It is not a
> routine task.

### 6.1 What the code already verifies

Every restore drill restores the newest database backup into a separate database with
`restic dump … | pg_restore --no-owner --no-acl --exit-on-error` and checks it (§5.6). That part
is exercised weekly and in CI (`tests/integration/backup-drill.test.ts`, with a local repository
and media from a folder).

**Not covered by the code:** restoring an older snapshot, switching the app to restored data,
restoring media files, a maintenance page during the restore, backups on real S3 storage
(CONTROL-CENTER.md §17).

### 6.2 Decisions needed before this procedure can be used

- `[PLACEHOLDER: who may approve a production restore, and how the approval is recorded — decision 10]`
- `[PLACEHOLDER: switch-over method from the live database to the restored one, decided and rehearsed]`
- `[PLACEHOLDER: maintenance page during the restore — proposed in CONTROL-CENTER.md §8, not implemented]`
- `[PLACEHOLDER: how long the replaced database is kept, and who deletes it]`
- `[PLACEHOLDER: how deletions made after the snapshot, e.g. on a person's request, are repeated after a restore]`
- `[PLACEHOLDER: media restore procedure — the code backs up and counts media files but never restores them]`

### 6.3 Draft procedure (database)

1. Get the approval (§6.2). Note the reason and the snapshot to restore.
2. Check that the last restore drill succeeded (Operations → Backups).
3. Stop the app, so nothing is written any more. The website and the Control Center are then
   unavailable.

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env stop app
   ```

4. Take a safety backup of the current state with the command line (the Control Center is down;
   see the caution in §5.5):

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent node src/cli.ts backup
   ```

5. Open a shell in the agent's container. It has restic, `psql`, `pg_restore` and the repository
   settings in its environment:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env exec ops-agent sh
   ```

6. Inside that shell, find the snapshot and restore it into a **new** database. Use lowercase
   letters, digits and `_` for its name. Never use `restore_drill` (the next drill drops it) and
   never the live database's name.

   ```sh
   export RESTIC_CACHE_DIR=/var/lib/agent/restic-cache
   restic snapshots --host yop --tag yop,db
   BASE="${BACKUP_DATABASE_URL%/*}"     # connection without the database name
   psql "$BASE/postgres" -v ON_ERROR_STOP=1 -c 'create database "<new_database>";'
   restic dump <snapshot-id> /database.dump \
     | pg_restore --no-owner --no-acl --exit-on-error --dbname "$BASE/<new_database>"
   ```

   Both commands must end without an error message.

7. Check the restored database:

   ```sh
   psql "$BASE/<new_database>" -At -c "select tgname from pg_trigger where not tgisinternal;"
   psql "$BASE/<new_database>" -At -c "select name from payload_migrations order by id desc limit 1;"
   psql "$BASE/<new_database>" -At -c "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';"
   ```

   - The five protective triggers from §5.6 must be in the list.
   - The table count should match the backup's entry in the Control Center history
     ("Database … (N tables)").

8. Switch the app to the restored database.
   `[PLACEHOLDER: switch-over method, decided and rehearsed]`
   Fact from the compose file that a decision can use: the app, the agent and the tools service
   all build their connection from `POSTGRES_DB`. Pointing `POSTGRES_DB` at the restored database
   and recreating the containers would switch them all and leave the old database in place. This has
   not been tried; the `postgres` container would be recreated too.
9. Start everything. Pending migrations newer than the backup run at start (§3.5).

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env up -d
   ```

10. Check the website, the sign-in and Operations → Services & status. Then "Back up now", so the
    restored state has a backup the drill can compare.
11. Media: `[PLACEHOLDER: media restore procedure]`.
12. The replaced database stays until it is deleted by decision (§6.2). **Approval needed** for
    the deletion: it holds personal data.

What a restore also brings back, from the data model: the audit log is in the database, so entries
written after the snapshot are gone. Data deleted after the snapshot (by the retention jobs or by
people) comes back; the nightly retention jobs delete what is overdue again.

---

## 7. Updates

### 7.1 Deploying a new version

1. Read the release's implementation notes (CONTROL-CENTER.md) for new settings and
   "before going live" items.
2. Operations → Backups → "Back up now". Wait for a successful result.
3. Get the new code onto the server (§3.1).
4. Set `APP_VERSION` and `APP_COMMIT` in `.env` (e.g. the git tag and the commit). They are build
   arguments: the release appears in the Control Center (Operations → Services & status), and
   `APP_VERSION` tags both images.
5. Check and deploy:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env config --quiet
   docker compose -f docker-compose.prod.yml --env-file .env up -d --build
   ```

6. Migrations run at start (§3.5). Follow `logs -f app`.
7. Check the website, the Control Center and the release shown under Operations.

Avoid deploying during a backup or drill (default 02:30 daily, Sundays 04:00): rebuilding
recreates `ops-agent`, and an interrupted backup is not resumed (§5.2).

### 7.2 Migrations

- Pending migrations are applied when the app starts. Nothing is run by hand in production.
- Schema changes always come as committed migrations (`src/migrations/`, docs/development.md).

### 7.3 Rollback

- **Database: forward-only.** The files in `src/migrations/` have `down` steps, but production
  only runs `up`. Several `down` steps drop tables or cannot bring data back (for example
  `src/migrations/20261021_125807_cc2_member_review.ts`, lines 50–51). Do not run them in
  production, also not through the `tools` service; going back means a restore (§6, approval
  needed).
- **App image.** Images are tagged with `APP_VERSION`, so the previous ones stay on the server
  unless removed. Going back to the previous image is only safe if the new release added **no**
  migration (compare `src/migrations/` between the two versions).
  `[PLACEHOLDER: rollback steps for the app image, rehearsed — e.g. previous APP_VERSION and up -d without --build; not tested]`
- **If the new release migrated the database**, going back means restoring the backup taken before
  the update. That is a production restore: §6, **Approval needed**.

---

## 8. Monitoring and alerts

### 8.1 Screens in the Control Center

| Screen | Address | Shows | Permission |
|---|---|---|---|
| Operations → Services & status | `/admin/operations` | Services with state, health, start time, restarts, image; restart of `app` or `caddy`; host CPU, memory, disk (current and 24 hours); release and the agent's tool versions; database size, connections, largest tables; scheduled tasks with last run, "run now"; external uptime "not set up" | `operations.read`; restart: `operations.act`, a code and the service's name typed |
| Operations → Backups | `/admin/operations/backups` | Last backup and drill, schedule, retention, history with details and differences, stored snapshots, "Back up now", "Test a restore" | `operations.read`; buttons: `operations.act` and a code |
| Operations → Logs | `/admin/operations/logs` | Last 100–500 lines of a service, masked by the agent, searchable; every view is in the audit log | `operations.read` |
| Operations → Domains & TLS | `/admin/operations/domains` | The certificates Caddy serves, checked hourly and on request | `operations.read` |
| Operations → E-mail | `/admin/email` | §4 | `email.manage` |
| Insights → Statistics | `/admin/analytics` | Page views and visits, pages, languages, sources, 404 and server errors | `analytics.read` |
| Dashboard | `/admin` | Services running, last backup, certificates; page views; failed e-mails | per tile |

`operations.read`: super administrator, board administrator (read), technical administrator,
auditor (read). `operations.act`: super administrator, technical administrator
(CONTROL-CENTER.md §4, §17).

The job `ops-collect` collects the agent's status every five minutes, the certificates once an
hour. Restarts are limited to 3 per service in 15 minutes.

### 8.2 Alerts

From `src/cms/operations/alerts.ts`:

| Alert | When | Links to |
|---|---|---|
| Agent not answering | The agent has not answered for 15 minutes | Services & status |
| Service down | A watched service (`caddy`, `app`, `postgres`, `ops-agent`, `socket-proxy`) is not running, unhealthy, or missing while Docker is reachable | Services & status |
| Backup failed | A backup ended with an error | Backups |
| Backup overdue | Backups are set up and there has been no successful backup for 26 hours (not while a job runs) | Backups |
| Drill failed | A restore drill ended with an error or differences | Backups |
| Restart failed | A restart ended with an error | Services & status |
| Certificate | A certificate is not trusted or expires within 14 days | Domains & TLS |
| Disk full | Disk use at 90 % or more | Services & status |

Where they go (`src/cms/operations/collect.ts`, `alert-email.ts`):

- The bell of everyone with `operations.act`.
- An e-mail to the technical address, if it is set in the e-mail settings and a mail server is
  configured.
- The same alert at most once a day while the cause lasts.
- **No alerts while the agent is "not set up"** (no valid `OPS_AGENT_SECRET` in the app): the
  collection job then stops early (`collect.ts` line 167).

Failed e-mail deliveries are a separate notice in the bell of everyone with `email.manage`
(§4).

### 8.3 Logs

- **In the Control Center:** masked by the agent before they leave it (e-mail and IP addresses
  shortened; tokens, passwords, cookies and keys replaced; `ops-agent/src/mask.ts`). Masking
  recognises common patterns; a secret in an unusual format could pass (CONTROL-CENTER.md §17).
- **On the server:** `docker compose -f docker-compose.prod.yml --env-file .env logs <service>`
  shows the logs **unmasked**. Only people with server access see them.
- The service logs stay in Docker on the server: at most three files of 10 MB per service, the
  oldest overwritten (`x-logging` in `docker-compose.prod.yml`; Docker itself keeps them without
  limit). Older lines are gone, so look at a problem soon after it happens.
- Access logs: `access.log` (website) and `admin-access.log` (Control Center) in the
  `caddy_logs` volume, see §9.

### 8.4 Certificates

- Caddy obtains and renews the certificates automatically for every site address in the
  Caddyfile (Let's Encrypt, per the Caddyfile's comment). They are stored in `caddy_data`.
- `ACME_EMAIL` is the contact address for the certificate authority (expiry warnings).
- The agent checks the certificate Caddy actually serves for `<SITE_HOST>` and `<ADMIN_HOST>`
  (`CERT_HOSTS` in the `ops-agent` service), through `caddy:443` with the host name as SNI. This works even
  before DNS points to the server. A certificate counts as ok when it is trusted and valid for at
  least 14 more days. `www.<SITE_HOST>` is not checked.

---

## 9. Data protection facts for operations

Cited from docs/privacy-notes.md and CONTROL-CENTER.md. This guide does not set or change any
retention period. "Proposal" means not yet decided by the association.

| Data | Fact | Kept |
|---|---|---|
| Access logs (Caddy) | One JSON line per request to the website and the Control Center: time, method, host, path without query string, status, size, duration, referring page, browser string, IP address shortened to /24 (IPv4) or /48 (IPv6). Not written: full IP addresses, ports, cookies, `Authorization`, forwarded addresses, response headers. They stay on the server; the agent only counts them | Rotate at 50 MB, deleted after 7 days (proposal, decision 7) |
| Host samples | CPU, memory, load, disk, database size; no personal data | 30 days |
| Backups | Whole database (applications, members, messages, accounts) and media files, encrypted with restic; password in the agent's environment and offline with the board | Proposal 7 daily, 4 weekly, 6 monthly (decision 9). Data deleted in the live database remain in backups until they expire (up to about six months) |
| Restore drills | Restore into a separate test database, compare counts, delete it at once | — |
| Backup, drill and restart history | Time, kind, result, counts, sizes, durations, snapshot ids, masked error text; no personal data | 12 months |
| Service logs in the Control Center | Only for `operations.read`, loaded on request, masked; every view in the audit log | Raw logs stay in Docker on the server |
| E-mail delivery log | Time, template, recipient shortened, result, error code, duration; no subject or content | 90 days (proposal) |
| Technical warnings | What (service, host, time) and a link; no personal data | — |
| Visitor statistics | Hourly counts per page, language, referring domain, 404 and error address (masked); no IP address, browser string or cookie | 13 months (proposal) |
| Audit log | No IP addresses, no form or message contents | 12 months (`AUDIT_RETENTION_MONTHS`; decided 2026-10-20 as the initial setting, legal adequacy to be reviewed before production) |
| Sign-in records | No IP address | Ended records deleted after 30 days |
| Notifications | No personal data | Read after 30 days, unread after 90 days |
| Contact messages | — | Six months after arrival (nightly job, 03:00 server time) |
| Rejected applications | — | Six months after the decision (same job) |

For operations this also means:

- The technical administrator sees no applications, members or messages; logs shown to them are
  masked (CONTROL-CENTER.md §4).
- Anyone with server access can read the unmasked logs, the database and `.env`. Keep that group
  small. `[PLACEHOLDER: who has server access]`
- The privacy policy is the association's text (CONTROL-CENTER.md §7). This guide lists facts
  only.

---

## 10. Troubleshooting

Only problems documented in the code or the docs.

| Symptom | Cause | What to do |
|---|---|---|
| Operations screens say "Operations agent not set up" | The app has no valid `OPS_AGENT_SECRET` (missing or shorter than 32 characters). `OPS_AGENT_URL` is set by compose | Set `OPS_AGENT_SECRET` (§3.2), then `up -d`. No alerts are created in this state (§8.2) |
| `ops-agent` restarts again and again; its log says "OPS_AGENT_SECRET must be at least 32 characters" | Same | Same |
| "Operations agent not reachable", "has never answered", or the alert "agent not answering" | Agent stopped, unhealthy, or refusing requests | `ps` and `logs ops-agent`. The agent refuses requests older than a minute or seen before (401). App and agent read the secret from the same `.env` variable |
| Status: Docker not reachable; no service list | `socket-proxy` not running | `logs socket-proxy`. Keep `DISABLE_IPV6: '1'` (§2.1) |
| A restart from the Control Center is refused | The proxy allows restarts only for containers named `yop-app-N` and `yop-caddy-N` (`haproxy.cfg.template` line 47); limit 3 per service in 15 minutes | Keep the project name `yop` and Compose's default container names. Wait if the limit was reached |
| "Backups not set up"; the buttons answer "not configured" | `RESTIC_REPOSITORY` or `RESTIC_PASSWORD` missing | §3.2, §5.4 |
| Backup failed with "S3_BUCKET is not set" | The media backup reads the media bucket (`BACKUP_MEDIA: s3` in the `ops-agent` service) | Set the `S3_*` values (§3.2) |
| Backup failed with another error | Tool error (restic, `pg_dump`, rclone), masked in the history | Read the history's details and `logs ops-agent` |
| History: "retention: not applied" | Object lock keeps data that `forget --prune` would remove | Expected; the backup counts (§5.3) |
| Alert "backup overdue" (26 hours) | No successful backup: failed, interrupted by a restart (not resumed), or skipped because the agent started in that very minute | "Back up now". Check `BACKUP_TIME` (`HH:MM`; invalid values fall back to 02:30) |
| "A backup or restore drill is already running" | One job at a time; at most 4 manual jobs per hour | Wait for the result |
| Drill failed with differences | Listed in the history: table missing, row counts, trigger missing, newest migration, media file count, repository check | Investigate before the next backups expire. `[PLACEHOLDER: who is told when a drill fails]` |
| Drill detail: "drill database could not be removed" | `restore_drill` stayed on the PostgreSQL server with a copy of the data | The next drill drops it when it starts; "Test a restore" does that at once |
| Drill compared "structure only" | The agent has no record of that backup (e.g. after losing `agent_data`) | The next backup and drill compare fully |
| Delivery log "not sent"; app log "E-mail not sent: no mail server configured" | No mail server or no sender address | §4 |
| Sending fails with `PORT_NOT_ALLOWED`, `HOST_NOT_ALLOWED` or `HOST_NOT_FOUND` | The mail server entered in the Control Center failed the host check | Use port 25, 465, 587 or 2525 and a public host; `MAIL_ALLOW_INTERNAL_HOSTS=true` only for a relay inside the server's network (§4) |
| Sending fails on a port other than 465 | The server does not offer STARTTLS, which is required there | Use the provider's STARTTLS port or 465 |
| Control Center host answers 404 | Address not in `ADMIN_ALLOW_IPS`; IPv6 clients appear with the userland proxy's address (§2.1) | Check the allowlist and §2.1 |
| `<SITE_HOST>/admin` answers 404 | By design (§1.3) | Use `<ADMIN_HOST>` |
| Certificate alert or error on Domains & TLS | DNS does not point to the server, ports 80/443 not reachable, or renewal failed | Check DNS and ports; `logs caddy` (warnings only) |
| After restarting the app the page stays blank | The page reloads itself after about twelve seconds | If the app needs longer, reload by hand |
| Alert "disk full" | 90 % of the disk holding the agent's data volume (the host's Docker disk) is used | Check the volumes (§1.2); the media mirror in `agent_data` is as large as the media bucket. `[PLACEHOLDER: procedure when the disk is full]` |
| CPU and memory look too high for the app | They are the host's values, not per container (CONTROL-CENTER.md §17) | — |

---

## 11. Pre-launch checklist

Collected from CONTROL-CENTER.md §12 and §14–§18, and from this guide.

### 11.1 Open decisions (CONTROL-CENTER.md §12)

- [ ] **Decision 2:** hosting provider and server size (§17: "No server yet").
- [ ] **Decision 4:** DNS provider; read-only checks or editing through its API.
- [ ] **Decision 5:** mail provider, sender address, DKIM selector.
- [ ] **Decision 7:** how long raw access logs are kept (proposal 7 days); the privacy policy
      update is the association's text.
- [ ] **Decision 8:** external uptime monitor, or none.
- [ ] **Decision 9:** backup storage with object lock (EU), retention scheme (proposal 7/4/6), who
      keeps the offline copy of `RESTIC_PASSWORD`.
- [ ] **Decision 10:** production restore from the web interface. Open; until decided, a restore
      happens only by §6 and with approval.
- [ ] **Decision 11:** audit log retention is set to 12 months; its legal adequacy is to be
      reviewed before production (§15).
- [ ] **Decision 12:** what happens to accepted applications; consolidation stays off
      (`MEMBERSHIP_CONSOLIDATION=off`, §16).
- [ ] **Decision 13:** who gets which role; the second super administrator (§15).
- [ ] **Decision 16:** implemented as recommended (password only on the server, §18); confirm.
- [ ] **Decision 17:** which addresses receive new-application, message and technical alerts.

### 11.2 Before going live with CC-0 (§14)

- [ ] `ADMIN_HOST=verwaltung.yop-ye.org` (compose sets `ADMIN_URL`) and `MFA_ENCRYPTION_KEY`;
      DNS record for the admin host; Caddy for both hosts.
- [ ] Migration run (automatic at start; it ends all existing sessions).
- [ ] First super administrator created, signed in at once, authenticator app set up, recovery
      codes kept offline. With the `tools` service (§3.6).
- [ ] Second super administrator, once named, created the same way.
- [ ] Open point after CC-0: the security e-mails (set-up, new device, recovery code used, second
      factor reset, password changed) checked once with the association's mail provider.
- [x] Open point after CC-0: image optimizer without cache. Closed: the image creates
      `/app/.next/cache` for the app user, so the `nextcache` volume is writable on the
      read-only file system (checked by the CI job "production"). Only a volume created before
      this change keeps the old owner; remove it once (`docker volume rm yop_nextcache`,
      **with the app stopped**) so it is created again.

### 11.3 Tests not yet done (CC-1 §15, CC-2 §16)

- [ ] Security and new-submission e-mails through the real provider: sender, content, no personal
      data.
- [ ] Exported CSV in Microsoft Excel (Windows and Mac) with the sample files.
- [ ] Wording of the six legal bases compared with the official EUR-Lex text before production.
- [ ] Processing purposes approved by the association; until then exports are impossible and stay
      switched off in production (§16).
- [ ] Scheduled publishing through the Control Center's date picker (one page).
- [ ] Behaviour under real load, with the first real data.

### 11.4 Not tested on a real server (CC-3 §17)

- [ ] The production stack as a whole: deploy, open both hosts, check certificates, the admin gate
      (website host answers 404 for `/admin`) and the allowlist if used.
- [ ] Backups to the real storage with object lock: set `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`,
      `BACKUP_S3_*`; "Back up now" and "Test a restore" succeed with the restricted access key;
      password kept offline with the board.
- [ ] Media backup from the real S3 bucket (rclone): covered by the first manual backup; the drill
      counts the media files.
- [ ] Host values: compare the status screen once with `free` and `df` on the server.
- [ ] Real Let's Encrypt certificates on Domains & TLS after the first start.
- [ ] Technical warning e-mails: set the technical address and send a test e-mail.
- [ ] Known limitation: IPv6 clients and Docker's userland proxy (§2.1).
- [ ] Known limitation: external uptime monitoring not set up (decision 8).

### 11.5 Not tested with real services (CC-4 §18)

- [ ] Sending through the association's mail provider: server, user and sender entered,
      `SMTP_PASSWORD` set on the server, "Test e-mail to me".
- [ ] DNS checks of the real domain on the E-mail screen, after entering domain and DKIM selector.
- [ ] Statistics from real visits: the screen fills from the first complete hour after launch.

### 11.6 From this guide

- [ ] `create-admin` run once on the real server with the `tools` service (§3.6; tested locally
      and in CI on an empty database).
- [ ] The restore (§6) rehearsed on a test server; the decisions in §6.2 made; a media restore
      procedure written.
- [ ] A copy of `.env` kept outside the server (§5.1).
- [ ] How releases reach the server (§3.1) and how the app image is rolled back (§7.3).
- [ ] Retention values in `.env` set according to decision 9 (§5.3).
- [ ] `ALLOW_INDEXING=true` only at launch.
- [ ] **The image on the server contains the Next.js security fix.** Next.js 16.3.8 and older
      are affected by GHSA-p3m5-59mp-jv5r (denial of service through Server Actions; the forms
      use them). The code uses Next.js 16.4.2 with Payload 3.91.0 since 2026-10-22, with all tests
      green (PLAN.md §28). Before launch: `npm audit` and the Next.js security advisories show
      nothing new for the versions in use; the server runs an image built from that commit or
      later.
- [ ] The manual keyboard and screen-reader check is done and its findings fixed
      ([accessibility-check.md](accessibility-check.md)).
- [ ] No placeholder or draft text visible on the website: through the tools service,
      `npm run check:content -- strict` ends without an error. It lists each remaining item with
      a link to the screen where it is edited. (`npm run check:placeholders` lists the
      placeholders in the source, e.g. the seed texts; those are not shown once the content is
      filled in.)
