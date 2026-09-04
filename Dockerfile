# syntax=docker/dockerfile:1

# The roadmap (apps/roadmap): Astro SSR on Node, fronted by Caddy, the same
# shape as the sample site. The site is `output: "server"` (astro.config.mjs):
# endorsement counts come from the form API per request, the session decides
# what renders, and the @gogitcms/preview-astro middleware composes an unsaved
# CMS draft over the content files. Caddy terminates the edge, serves the
# hashed client assets (and the /admin editor when one is built) off disk, and
# proxies everything else to the Node server.
#
#   docker build -f apps/roadmap/Dockerfile -t gitcms-roadmap .
#   docker run -p 8080:8080 -e ROADMAP_CMS_TOKEN=... gitcms-roadmap
#
# Built from the MONOREPO root: the install and build run through
# `pnpm --filter`, which needs the workspace manifest and the root lockfile.
# The site's own @gogitcms dependencies are PUBLISHED ones, so they come from
# the registry like any other. (The mirrored standalone repository builds
# with a plain `pnpm install && pnpm build` and needs none of this.)
#
# No BuildKit mounts anywhere in this file, on purpose: Railway's builder
# rejects `--mount=type=secret` at parse time and requires service-specific ids
# on cache mounts, so this file uses neither and builds unmodified there.
#
# Runtime secrets are runtime: ROADMAP_SESSION_SECRET, ROADMAP_CMS_TOKEN and
# CMS_PREVIEW_SECRET are read from the environment by the running server and
# are deliberately not build ARGs (an ARG bakes into a layer).

# --- Build ------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
RUN corepack enable
WORKDIR /src

COPY . .
# A read:packages credential, for the same reason as the sample site: `deploy`
# below re-resolves the whole workspace before it prunes, and apps/docs depends
# on a package that lives on GitHub Packages. Written and deleted inside each
# RUN that needs it; read with `printenv` so the value never appears in the
# build log. See the longer note in examples/sample-site/Dockerfile.
ARG NPM_TOKEN=

RUN set -eu; \
    { printf '//npm.pkg.github.com/:_authToken='; printenv NPM_TOKEN || true; } > /root/.npmrc; \
    pnpm install --frozen-lockfile --trust-lockfile \
      --filter @gogitcms/roadmap...; \
    rm -f /root/.npmrc

# The self-hosted editor, served at /admin (apps/roadmap/cms.config.mjs).
# Opt-in, keyed on GITCMS_API_URL, exactly as the sample site: without it the
# image simply has no /admin.
ARG GITCMS_API_URL=
ARG GITCMS_WORKSPACE_ID=
ARG GITCMS_REPOSITORY_ID=
ARG GITCMS_PROJECT=
ARG CMS_PREVIEW_SERVER=
RUN if [ -n "$GITCMS_API_URL" ]; then \
      set -eu; \
      pnpm install --frozen-lockfile --trust-lockfile \
        --filter @gogitcms/editor...; \
      cd apps/roadmap; \
      GITCMS_API_URL="$GITCMS_API_URL" \
      GITCMS_WORKSPACE_ID="$GITCMS_WORKSPACE_ID" \
      GITCMS_REPOSITORY_ID="$GITCMS_REPOSITORY_ID" \
      GITCMS_PROJECT="$GITCMS_PROJECT" \
      CMS_PREVIEW_SERVER="$CMS_PREVIEW_SERVER" \
      CI=1 \
        node ../../apps/editor/bin/gogitcms-editor.mjs build --out public/admin --no-tty; \
      node scripts/stamp-admin.mjs public/admin; \
    else \
      echo "GITCMS_API_URL unset — skipping the /admin editor build"; \
    fi

# The commit the footer names. Railway sets RAILWAY_GIT_COMMIT_SHA as a
# service variable; the running server reads it from the environment too, so
# this only matters for builders that don't inject it at runtime.
ARG ROADMAP_COMMIT_SHA=
ENV ROADMAP_COMMIT_SHA=$ROADMAP_COMMIT_SHA

# Runs after the editor build on purpose: Astro copies public/ into dist/client.
RUN pnpm --filter @gogitcms/roadmap build

# Prune to production dependencies. Astro bundles the application code (the
# design system and the preview packages are `noExternal`) but leaves genuine
# runtime dependencies — marked, gray-matter, react — external.
RUN set -eu; \
    { printf '//npm.pkg.github.com/:_authToken='; printenv NPM_TOKEN || true; } > /root/.npmrc; \
    pnpm --filter @gogitcms/roadmap deploy --prod --legacy \
      --trust-lockfile --config.auto-install-peers=false /out; \
    rm -f /root/.npmrc; \
    cp -r apps/roadmap/dist /out/dist; \
    cp -r apps/roadmap/content /out/content

# --- Runtime ----------------------------------------------------------------
FROM node:22-alpine
# bash is for the entrypoint's `wait -n`, which busybox ash does not implement.
RUN apk add --no-cache bash caddy tini

WORKDIR /app
COPY --from=build /out ./
COPY apps/roadmap/Caddyfile /etc/caddy/Caddyfile
COPY apps/roadmap/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# PORT is Caddy's, the port the container publishes. ASTRO_PORT is the loopback
# port Caddy proxies to, and the entrypoint passes it to Node *as* PORT. HOST
# keeps Node on loopback, so Caddy is the only thing that can talk to it.
ENV HOST=127.0.0.1 \
    ASTRO_PORT=4321 \
    PORT=8080 \
    NODE_ENV=production

ARG CMS_PREVIEW_SERVER=
ENV CMS_PREVIEW_SERVER=$CMS_PREVIEW_SERVER

EXPOSE 8080

USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-8080}/healthz" >/dev/null 2>&1 || exit 1

ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
