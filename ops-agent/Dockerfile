# syntax=docker/dockerfile:1
# Operations agent (docs/CONTROL-CENTER.md §3.2): Node's own HTTP server, no npm packages, plus
# the tools it runs: restic (backups), pg_dump/pg_restore/psql 18 (database), rclone (media from
# S3). Every image is pinned by digest; versions were at least 14 days old when pinned. Nothing
# is downloaded at build time besides these images.

# restic 0.19.1 (released 2026-07-05)
FROM restic/restic:0.19.1@sha256:136600b6ff6843d61d355f7f71f460a166429f35de6fd11b568fece3c9a4d510 AS restic
# rclone 1.75.1 (released 2026-09-04)
FROM rclone/rclone:1.75.1@sha256:45401ad7410db1d67ffdb58e19059ad20b0d8e0285a60e38bbec55cc1019c7a5 AS rclone
# Node 24.21.0, the same runtime as the website
FROM node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1 AS node

# The PostgreSQL 18.6 image (the database server's own version) brings pg_dump, pg_restore and
# psql with their libraries and the time-zone data; the server itself is never started here.
FROM postgres:18.6-alpine3.24@sha256:77f585114c32fbca283dc835b0596f4e52b51b4c6662d7810b2f4084f60a1873
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/lib/libstdc++.so.6 /usr/lib/libgcc_s.so.1 /usr/lib/
COPY --from=restic /usr/bin/restic /usr/local/bin/restic
COPY --from=rclone /usr/local/bin/rclone /usr/local/bin/rclone
RUN addgroup -S -g 1000 agent && adduser -S -u 1000 -G agent -h /var/lib/agent agent && \
    mkdir -p /var/lib/agent && chown agent:agent /var/lib/agent
WORKDIR /agent
COPY package.json ./
COPY src ./src
USER agent
ENV NODE_ENV=production \
    STATE_DIR=/var/lib/agent \
    HOME=/var/lib/agent
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4100/health || exit 1
ENTRYPOINT []
CMD ["node", "src/main.ts"]
