# Install workspace dependencies once and compile all packages before splitting targets.
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/domain/package.json ./packages/domain/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY scripts/sync-version.mjs ./scripts/sync-version.mjs
RUN npm ci --no-audit --no-fund

# Cached local/CI tooling; never copied into the production image.
FROM docker:28.5.2-cli@sha256:625d9431a9f54c5a2bc90f24f0e1c3d55b1349fd857dd85035f98c2c9acbdd4d AS docker-tools
FROM postgres:17.11-bookworm@sha256:839fbb5a4942a7758dd93e18b42ea5649807491a0545b5eeeb8f0b8bb11857a5 AS postgres-runtime
FROM rhysd/actionlint:1.7.7@sha256:887a259a5a534f3c4f36cb02dca341673c6089431057242cdc931e9f133147e9 AS workflow-tools
FROM mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e AS checks-dependencies
WORKDIR /app
# Match apps/web's exact Playwright version; use our Node 24/npm runtime.
COPY --from=dependencies /usr/local/bin/node /usr/local/bin/node
COPY --from=dependencies /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
ARG APT_SNAPSHOT=20261102T000000Z
COPY scripts/check-apt-snapshot.sh /tmp/check-apt-snapshot.sh
RUN ln -sf ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -sf ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
  && sh /tmp/check-apt-snapshot.sh "$APT_SNAPSHOT" && rm /tmp/check-apt-snapshot.sh
COPY --from=dependencies /app /app
COPY --from=docker-tools /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker-tools /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY --from=docker-tools /usr/local/libexec/docker/cli-plugins/docker-buildx /usr/local/libexec/docker/cli-plugins/docker-buildx
COPY --from=workflow-tools /usr/local/bin/actionlint /usr/local/bin/actionlint

FROM checks-dependencies AS checks
COPY . .
CMD ["bash", "scripts/check-container.sh"]

FROM dependencies AS build
COPY . .
ARG RELEASE_REVISION=working-tree
ARG RELEASE_EVIDENCE=local-acceptance
RUN npm run build:runtime && npm run catalog:check && npm run catalog:updates:check
RUN node scripts/package-runtime.mjs /opt/clog-runtime
RUN RELEASE_REVISION="$RELEASE_REVISION" RELEASE_EVIDENCE="$RELEASE_EVIDENCE" node scripts/release-bundle.mjs /opt/clog-release

# Preserve workspace links while stripping build/test dependencies from Node service images.
FROM build AS production-dependencies
RUN npm prune --omit=dev --no-audit --no-fund \
  && node scripts/prune-runtime-tests.mjs node_modules > /opt/clog-runtime/runtime-dependency-cleanup.json

# Shared compiled packages and SQL allow the API target to run the migration job too.
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS service-base
WORKDIR /app
ENV NODE_ENV=production PATH="/usr/lib/postgresql/17/bin:${PATH}"
COPY --from=postgres-runtime /usr/lib/postgresql/17 /usr/lib/postgresql/17
COPY --from=postgres-runtime /usr/share/postgresql/17 /usr/share/postgresql/17
COPY --from=postgres-runtime /usr/share/postgresql/postgresql.conf.sample /usr/share/postgresql/postgresql.conf.sample
COPY --from=postgres-runtime /usr/lib/*/libpq.so.5* /usr/local/lib/
COPY --from=docker-tools /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
ARG APT_SNAPSHOT=20261102T000000Z
COPY scripts/check-apt-snapshot.sh /tmp/check-apt-snapshot.sh
RUN sh /tmp/check-apt-snapshot.sh "$APT_SNAPSHOT" && rm /tmp/check-apt-snapshot.sh && ldconfig \
  && groupadd -g 999 postgres && useradd -u 999 -g postgres -d /data/postgres -s /bin/sh postgres
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /opt/clog-runtime/ ./
COPY --from=build --chown=node:node /app/packages/database/migrations ./packages/database/migrations
COPY --from=build --chown=node:node /app/catalog/snapshot.json /app/catalog/snapshot.sha256 /app/catalog/clue-taxonomy.json ./catalog/
COPY --from=build --chown=node:node /app/catalog/assets.json ./catalog/
COPY --from=build --chown=node:node /app/catalog/default-icon.json ./catalog/
COPY --from=build --chown=node:node /app/catalog/legacy-assets.sha256 ./catalog/
COPY --from=build --chown=node:node /app/catalog/updates ./catalog/updates
COPY --from=build --chown=node:node /app/apps/web/public/catalog/items ./catalog/legacy-images
LABEL org.opencontainers.image.title="Clan Collection Log"
RUN mkdir -p /data/catalog-icons /data/submission-images && chown node:node /data/catalog-icons /data/submission-images

# Web proxy, API and optional bot use one deployment image.
FROM service-base AS app
ARG RELEASE_REVISION=working-tree
ARG RELEASE_EVIDENCE=local-acceptance
LABEL org.opencontainers.image.revision="$RELEASE_REVISION" io.clog.release-evidence="$RELEASE_EVIDENCE"
COPY --from=build /opt/clog-release /opt/clog-release
USER root
RUN mkdir -p /tmp/nginx /var/log/nginx /var/lib/nginx \
  && chown -R node:node /tmp/nginx /var/log/nginx /var/lib/nginx
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
COPY infra/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY infra/start-app.sh /usr/local/bin/start-app
COPY infra/clog /usr/local/bin/clog
COPY infra/start-installation.sh /usr/local/bin/start-installation
RUN chmod 755 /usr/local/bin/start-app /usr/local/bin/clog /usr/local/bin/start-installation
ENV AUTH_ENABLED=true HOST=127.0.0.1 PORT=3000 API_BASE_URL=http://127.0.0.1:3000 BOT_SETTINGS_MODE=database \
    ICON_STORAGE_PATH=/data/catalog-icons PROOF_STORAGE_PATH=/data/submission-images \
    DB_HOST=127.0.0.1 POSTGRES_PASSWORD_FILE=/data/system/postgres/value \
    APP_DB_PASSWORD_FILE=/data/system/app/value SESSION_SECRET_FILE=/data/system/session/value \
    CLOG_SECRETS_ROOT=/data/system CLOG_DATABASE_DATA=/data/postgres CLOG_BOOTSTRAP_FILE=/data/bootstrap/administrator.json
LABEL io.clog.service="installation"
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=5s --start-period=120s CMD node -e "fetch('http://127.0.0.1:8080/readyz', {signal: AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/start-installation"]
CMD []
