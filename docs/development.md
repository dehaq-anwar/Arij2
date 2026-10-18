# Development (Phase 3 state)

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
npm run dev                   # http://localhost:3000 (de), /en, /ar · admin at /admin
```

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
| `npm run test:e2e` | End-to-end tests against the production build (`npm run build` first): every page in de/en/ar, RTL, language switcher, navigation, mobile menu, no cookies or external requests, motion and reduced motion, axe WCAG 2.1 AA in light and dark mode. Needs Chromium: `npx playwright install chromium` (or set `PW_CHROMIUM_EXECUTABLE`) |
| `npm run check:placeholders` | Lists every `[PLACEHOLDER: …]` still to be filled; `-- --strict` fails if any is left (launch gate) |

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

**Bind the standalone server to `0.0.0.0`** (the image does this via `HOSTNAME=0.0.0.0`). With `HOSTNAME=127.0.0.1`, German URLs without prefix end in a redirect loop, because next-intl's internal rewrites then look external to Next.js. Restrict access with the network or firewall instead.
