# Hosting

Use Linux Docker, Compose v2 and an HTTPS reverse proxy. The [README](../README.md)
contains a service definition you can paste into a Compose project containing
other services. No dedicated project name, database service or secret setup is
required. Choose a unique service name, volume and host port for each installation.

## Images and storage

Published Releases on `main` run acceptance before publishing amd64/arm64 images:

```text
ghcr.io/<repository-owner>/clan-clog:v1.0.0
ghcr.io/<repository-owner>/clan-clog:release-<full-commit-sha>
ghcr.io/<repository-owner>/clan-clog:sha-<full-commit-sha>
```

Ordinary pushes, tags and drafts do not publish. Select an available published
release. The repository Compose file uses `IMAGE_NAME` and `IMAGE_TAG` from `.env`;
an inline service can use a literal image reference and needs no `.env`.

Persist `/data` in one named volume. It contains PostgreSQL 17, uploads and
credentials. Do not change container UID, mount PostgreSQL separately, or use
`down --volumes` on an installation you want to keep. See [recovery](release-recovery.md).

## HTTPS

The default port is loopback-only. Point your reverse proxy at `127.0.0.1:8088`,
set `PUBLIC_ORIGIN` to the exact HTTPS origin and configure the proxy's verified
addresses in `TRUSTED_PROXY_CIDRS` when needed. Preserve security headers.
Only port 8080 is served externally; the API and database stay private.
For a proxy on the same Docker network, use `http://clan-clog:8080` as its
upstream; the host port mapping can be omitted.

For an existing Traefik installation on network `web`, set `CLOG_HOST`, then use
`compose.yaml:compose.traefik.yaml` as `COMPOSE_FILE`. Adapt the router/service
names if hosting multiple installations behind the same Traefik.

## Updates

Take a [backup](release-recovery.md), change just this service's image tag, then:

```bash
docker compose pull clan-clog
docker compose up -d --no-deps --wait clan-clog
```

Use your selected service name in place of `clan-clog`. Accounts and credentials
remain in the volume; updates never reset the administrator.
Startup applies pending, checksummed migrations automatically. Released migrations
are immutable; new versions add forward-only migrations and preserve existing data.
Catalog releases use forward migrations plus validated immutable content batches.
Bootstrap and the installation supervisor install safe missing entries and queue
optional fixes for the first administrator login; conflicts do not silently merge
items or block unrelated content. Keep normal database and uploaded-asset backups:
the database also contains update decisions, receipts, bindings and retained
bundled WebP bytes. See [catalog updates](catalog-import.md#release-updates).

After a schema upgrade, an older image may be incompatible. Restore the coordinated
backup to roll back both the database and image; do not delete migration history.

When upgrading from item-wide Event credit, existing single-page credits are
assigned to their sole active page. Shared, missing or retired-page cases retain
their data and wait for the administrator's **Assign existing Event collections to
pages** review. Choose one valid page for each credit; timing evidence is advisory. Choices
save atomically with audit records and survive restarts. Cancelling leaves them
outstanding, and uncertain saves must use the original retry operation. Repair
missing catalog memberships before assigning credits with no available destination.
While unresolved, only new Event approvals for that item are blocked. Regular
submissions and unrelated items remain usable. See the
[staff upgrade review](staff-guide.md#event-credit-upgrade-review).

For an optional pinned updater, keep `infra/` from a reviewed release and run
from your Compose directory:

```bash
bash /path/to/infra/deploy.sh FULL_40_CHARACTER_RELEASE_SHA clan-clog
```

It verifies infrastructure and schema compatibility, backs up the selected
installation, recreates only that service, and publishes successful metadata
atomically under `.clog/clan-clog/`. Failure keeps evidence and does not downgrade
the schema. Requires Bash, jq, flock, sha256sum and Docker access.

The updater writes `.clog/clan-clog/image.yaml` with the resolved image digest.
Its helpers load this overlay automatically. For subsequent plain Compose commands,
include it in `COMPOSE_FILE` (after your own files), or copy the recorded image
into your service definition. The optional GitHub deployment workflow requires
your own protected runner and a reviewed launcher checksum; install the complete
`infra/` helper directory beside the launcher.

## Sign-in throttling and proxy identity

Credential limits use Fastify's validated client address. Bundled Nginx appends
its actual peer to `X-Forwarded-For`; configure `TRUSTED_PROXY_CIDRS` only for the
external reverse proxies you control. Do not trust every address or a hop count
when paths can vary. An untrusted direct peer cannot choose its source bucket
with a forwarded header; the closest untrusted address ends a trusted chain.
Equivalent IPv6 forms and IPv4-mapped IPv6 addresses share the same source key.

A shared NAT has one 20-attempt source budget per minute, with separate
5-attempt username budgets within it. A targeted username also has one budget
across source addresses. On 429, wait the returned positive `Retry-After` seconds;
retries do not prolong the window. Existing staff sessions, public pages, static
assets and logout remain available. A 503 from credential admission can indicate
shared storage contention, capacity or database failure; inspect readiness and
fixed `AUTH_LIMIT_STORAGE` diagnostics, then allow automatic recovery. Do not
reset credentials or delete session/limiter tables as a troubleshooting shortcut.

For a focused disposable proxy/storage check, build an isolated image and run
`CHECK_APP_IMAGE=clan-clog:checks node scripts/auth-throttling-smoke.mjs`. It creates
uniquely named containers, a network and fresh data, then removes only those
resources. Never run brute-force checks against an existing installation.
