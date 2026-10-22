# syntax=docker/dockerfile:1
# Production image: Next.js standalone server with Payload, running as a non-root user.

FROM node:24.21.0-alpine3.24 AS base
ENV NEXT_TELEMETRY_DISABLED=1

# --- dependencies (exact versions from package-lock.json) ---
# Every native package used here ships a musl build, so no glibc compatibility layer is needed.
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
# Optional: behind a TLS-inspecting proxy, pass its CA with `--secret id=extra_ca,src=<file>`.
# Normal builds don't set it; the CA is never stored in an image layer.
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -f /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi && \
    npm ci --no-audit

# --- build ---
# No secrets are needed at build time: pages that read from the CMS render on first request.
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- server commands ---
# create-admin, reset-mfa and membership:consolidate run Payload's command-line tool on the
# TypeScript source, which the standalone server below does not contain. This separate image
# has the source and all dependencies; it is built and started only for such a command
# (docker-compose.prod.yml, service "tools", profile "tools"; docs/OPERATIONS.md §3.6).
FROM base AS tools
WORKDIR /app
ENV NODE_ENV=production \
    NPM_CONFIG_UPDATE_NOTIFIER=false
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=deps /app/node_modules ./node_modules
COPY . .
USER nextjs

# --- runtime ---
FROM base AS runner
WORKDIR /app
# Shown in the Control Center under "Operations" (the release that is running).
ARG APP_VERSION=dev
ARG APP_COMMIT=unknown
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_VERSION=$APP_VERSION \
    APP_COMMIT=$APP_COMMIT
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs
COPY --from=builder /app/public ./public
# The cache directory exists in the image and belongs to the app user, so the volume mounted
# there in production (image optimizer cache) takes over that owner when it is created.
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/ || exit 1
CMD ["node", "server.js"]
