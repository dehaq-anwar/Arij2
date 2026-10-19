# Development (Phase 4 + visual redesign C)

Short guide until the full German/English README arrives in Phase 6.

## Requirements

- Node.js **24.21.0** (see `.nvmrc`), npm 11
- Docker with Compose

## First start

```bash
cp .env.example .env
# Fill in PAYLOAD_SECRET, POSTGRES_PASSWORD, DATABASE_URL, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY,
# e.g. with `openssl rand -hex 32` for the secret and `openssl rand -hex 16` for passwords.

docker compose up -d          # PostgreSQL 18.6 + SeaweedFS (local S3) + bucket creation
npm ci
npm run migrate               # apply the committed database migrations
npm run seed                  # initial content: placeholders and marked drafts only
npm run dev                   # http://localhost:3000 (de), /en, /ar · admin at /admin
```

`npm run seed` never overwrites content that already exists; `npm run seed -- force` resets the seeded pages and focus areas (only for development databases). If there are no projects yet, it also creates five project slots with abstract placeholder images and placeholder titles, to be replaced in the CMS.

The first account is created on the admin's "create first user" screen and automatically becomes an administrator. All later accounts are created by administrators; there is no public registration.

## Checks

| Command | What it checks |
|---|---|
| `npm run lint` | ESLint (incl. jsx-a11y), no physical left/right CSS (RTL), WCAG contrast of all colour tokens |
| `npm run typecheck` | TypeScript, strict |
| `npm run test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run check:deps` | Every package in `package-lock.json` is at least 14 days old |
| `npm run check:audit` | No security advisory in production dependencies except the reviewed ones in `scripts/audit-allowlist.json` |
| `npm run verify` | All of the above, in order |
| `npm run test:e2e` | End-to-end tests against the production build (`npm run build` first): every page in de/en/ar, CMS content and translation fallback, hreflang/canonical, visibility rules (drafts, consent, permissions), cache refresh after CMS changes, sitemap/robots, RTL, language switcher, navigation, mobile menu, no cookies or external requests, motion and reduced motion, axe WCAG 2.1 AA in light and dark mode. Needs Chromium (`npx playwright install chromium`, or set `PW_CHROMIUM_EXECUTABLE`) and a test database, see below |
| `npm run check:placeholders` | Lists every `[PLACEHOLDER: …]` still to be filled; `-- --strict` fails if any is left (launch gate) |

## End-to-end test database

The end-to-end tests run against their own database, which **is wiped and rebuilt on every run** (all migrations, the seed content and the test data in `scripts/e2e-fixtures.ts`). Its name must end in `_e2e`; anything else is refused. By default it is `DATABASE_URL` with `_e2e` appended, or set `E2E_DATABASE_URL`. Create it once:

```bash
docker compose exec postgres createdb -U yop yop_e2e
```

The test data (projects, a post, a statistic, people and partners named "E2E …") exists only there. The tests sign in as a test editor whose password is generated for each run.

## Media storage

Uploads go to S3-compatible storage when `S3_BUCKET` is set (SeaweedFS from `docker-compose.yml` in development, an EU-region provider in production). Without it they are written to `MEDIA_DIR` on the local disk; the end-to-end tests use this (`.e2e-media/`, rebuilt per run). The database schema is the same either way.

## Content and caching

Pages are rendered on their first visit and then served from an in-memory cache. Every change saved in the CMS marks all cached pages as stale, so they are rendered again on their next visit. Nothing is prerendered during `npm run build`, which therefore needs no database. After a restart, each page is rendered once on its first visit.

Missing texts are stored in the CMS as `[PLACEHOLDER: …]`; texts drafted from the Satzung start with `[ENTWURF]` / `[DRAFT]` / `[مسودة]` and need the association's approval. Both are shown with a dashed frame on the site. Projects and news that are not translated yet show the German text with a notice, and are left out of hreflang and the sitemap for that language.

## Adding or updating dependencies

Versions are exact (`.npmrc`: `save-exact=true`), and nothing younger than 14 days is allowed, including transitive packages:

```bash
npm install --before="$(date -u -d '14 days ago' +%Y-%m-%dT%H:%M:%SZ)" <package>@<exact-version>
npm run check:deps
```

On macOS, use `date -u -v-14d +%Y-%m-%dT%H:%M:%SZ` instead.

## Database schema changes

Schema changes always go through migrations (no automatic `push`, also in development):

```bash
npm run migrate:create -- <short-name>   # after changing collections/globals
npm run migrate
npm run generate:types                   # refresh src/payload-types.ts
```

The production container applies pending migrations by itself on first start.

## Production image

```bash
docker build -f docker/Dockerfile -t yop-website .
```

The build needs no secrets. Behind a TLS-inspecting proxy, pass its CA as a build secret:
`--secret id=extra_ca,src=/path/to/ca.crt`.

Settings are read at runtime from the environment, so one image serves every environment: `SERVER_URL` (public address, e.g. `https://yop-ye.org`) and `ALLOW_INDEXING` (`true` only at launch; until then robots.txt and every page keep search engines out). They are deliberately not `NEXT_PUBLIC_*`, because Next.js freezes those into the build.

**Bind the standalone server to `0.0.0.0`** (the image does this via `HOSTNAME=0.0.0.0`). With `HOSTNAME=127.0.0.1`, German URLs without prefix end in a redirect loop, because next-intl's internal rewrites then look external to Next.js. Restrict access with the network or firewall instead.
