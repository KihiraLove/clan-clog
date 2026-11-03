# Development and tests

Use Node 24. For host development:

```bash
npm ci
npm run build
npm run dev:web
# In another terminal, with configured local DB/storage:
npm run dev:api
```

Install dependencies in the same operating-system environment that runs Node.
For a checkout shared between Windows and WSL, run `npm ci --include=optional`
inside the active environment after switching. Native packages such as Rollup
and esbuild are platform-specific; reuse the committed lockfile rather than
regenerating it to repair a missing native package.

Vite proxies `/api` to `127.0.0.1:3000`. The frontend always uses the API;
there is no demo fallback. Browser fixtures live under `apps/web/tests/support`
and cannot enter production bundles. See [configuration](environment.md).

After pulling a catalog update, stop the API watcher and refresh the local database
with its owner credentials. For an owner-configured local `.env`:

```bash
node --env-file=.env packages/database/dist/migrate.js
node --env-file=.env packages/database/dist/catalog-import.js
npm run dev:api
```

Compile changed domain/database/API sources first. Use the owner connection for
these two maintenance commands; the restricted runtime role cannot install release
batches. Starting Vite or the direct API watcher alone does not run catalog import.
Production startup performs this refresh automatically. Existing installations
stage missing pages/items for review; the first administrator is prompted when
changes remain. Check the corresponding Fix? groups and Save to create them.
Fresh installs include the content without an upgrade prompt. Running tests does
not refresh a development database.

## Application version

The root `package.json` version is the only maintained release version. From the
repository root, run `npm run version:bump -- 1.0.4` to update it and synchronize
the workspace manifests and lockfile. This command does not create a Git tag or
publish a release. Internal workspace dependencies use `*` and resolve locally.

After editing the root version directly, run `npm run version:sync`. Installation
and root builds also synchronize derived metadata. `npm run version:check` checks
for drift without writing files. Published release tags must match the root
version with a `v` prefix. The footer uses the same root version.

## Focused checks

For wording changes, edit `packages/domain/src/text.ts` and consume its named
feature export through `@clog/domain`. Rebuild the domain after editing text.
The production web build compiles direct `appText.<entry>` reads to the same
values and formatter expressions, preserving bundle budgets and lazy routes.
Keep the namespace local to direct member reads; do not spread it or use dynamic keys.
Use typed formatters for whole dynamic
messages and structured parts for words separated by links/emphasis. Keep React
markup and data formatting in the component. Shipped defaults are separate from
persisted administrator overrides; do not replace saved settings during extraction.

Run `npm run check:text` (also enforced by the normal ESLint rule),
`node --test scripts/application-text.test.mjs scripts/inline-application-text.test.mjs`, the domain build and
`node --test packages/domain/dist/text.test.js`. Then select affected validation,
redaction, bot and browser tests. Keep some explicit wording assertions so tests
can detect accidental changes instead of deriving all expectations from the catalog.
For public text, check the web build's `.data/local-checks/web-bundle.json` and
the emitted HTML title as well as the relevant accessible names. The AST guard
recognizes text-bearing JSX, known message APIs and authored prose; its explained
contract/historical exceptions live in `scripts/application-text.mjs`. Extend those
only for a specific machine/external value, with a corresponding focused test.

The formatting commands exclude `.data` and `.clog` before expanding file paths.
These runtime directories can contain protected backups and secrets. Keep the
negative directory globs in both `format` scripts: `.prettierignore` also excludes
their files, but does not prevent the CLI's initial directory scan.

Run checks for the behavior/files you changed. Examples:

```bash
npx prettier --check path/to/changed-file.ts
npx eslint apps/web/src/changed-file.ts
npm run typecheck -w @clog/web
node --test apps/web/src/changed-file.test.ts
npm run build -w @clog/database
node --test packages/database/dist/migration-audit.test.js
npm run check:docs
```

Database tests need `TEST_DATABASE_URL` pointing to a disposable PostgreSQL 17
database. They can create/drop schemas and change roles; never use personal or
production data. Some tests skip without it, which is not complete validation.
Build shared packages before running their dependent compiled tests.

For the container startup changes, build a disposable image and run only its
installation checks:

```bash
docker build --target app -t clan-clog:checks .
CHECK_APP_IMAGE=clan-clog:checks node scripts/installation-smoke.mjs
```

This creates and removes its own Compose project and volumes. It covers interrupted
first setup, password changes, persistence, credentials, maintenance and multiple
installations alongside an unrelated service.

For UI behavior, run a selected Playwright spec from `apps/web`, for example
`npx playwright test tests/admin.spec.ts --grep 'review'`. Its config starts
Vite on port 5187. Use a production web build to verify bundle budgets and that
no staff/test modules enter the initial public bundle.

## Complete acceptance

The maintainer runs this before release, with Linux Docker running:

```bash
node scripts/check-local.mjs
```

The checked-in [toolchain specification](../scripts/check-toolchain.json) declares
Node 24.21.0/npm 11.19.0, Linux/amd64 acceptance, Docker Engine 28–29,
Compose 2.30.0 through 5.x and Buildx 0.17.0 or newer in the 0.x series.
Use `.nvmrc` to select the host Node runtime. Docker Desktop must use Linux
containers; an ARM host needs amd64 emulation, which is visible in the report.
Clean-ref replay also needs Git and `tar` (included with Git for Windows/WSL).
Hosted acceptance uses Ubuntu 24.04. Host/daemon versions are recorded and checked;
they need not be byte-identical across supported hosts. The runner
builds isolated Linux tooling, PostgreSQL and browser environments without
reading runtime `.env` or logging into real Discord. It covers formatting,
lint, builds, catalog checks, typechecks, Node tests, three-browser HTTPS flows,
security headers, image inspection, performance and backup/recovery. Full
acceptance rejects skips and missing required scenarios.

Reports and logs are in `.data/local-checks/<run-id>/`. Record the run ID,
source fingerprint and final manifest SHA-256 from `summary.md` in PR/release
evidence. Independent checks continue after failures. Checks that
need a failed build, unavailable test service or missing prerequisite fixture data
are marked **blocked**, and the
run still exits with an error. Initial tooling/database setup must succeed before
the test runner can start.

At the end, open `summary.md` for stage results, failed browser test locations and
links to retained screenshots and traces. `result.json` contains the same result
as structured data; `gates.json` tracks stage progress, and each stage has its own
log. To inspect a trace, run `npx playwright show-trace <path-to-trace.zip>` from
`apps/web`. Missing reports or failed evidence copying also fail the run.

The runner removes its own containers and volumes.
After a crash, inspect resources labelled `clog.local-checks` and clean up only
that run's namespace. Avoid global Docker prune on a shared machine.

Hosted CI runs manually or on a published Release. Publishing waits for complete
acceptance and always uses a clean commit. Local evidence does not replace checking your own HTTPS host,
Discord guild, supported devices and off-host recovery before launch.

### Exact source and replay

The default tests the working tree, including untracked files that Docker allows.
Before building, Docker applies the context exclusions and exports an immutable
source archive. Both the checks image and its application build consume that
snapshot. A versioned `manifest.json` records commit/ref, tracked dirty state,
participating untracked path hashes, lockfile hash and the fingerprint of every
included path, byte sequence, file type/mode and text line ending count. Paths are
hashed; source contents, ignored secrets and arbitrary filenames are not uploaded.
Timestamps and tar entry order do not change the fingerprint. CRLF/LF or executable
mode differences do; inspect Git checkout settings when comparing Windows/WSL/CI.
Keep shell helpers and migration files at their declared LF endings.

For release comparison, replay an exact commit without stashing or modifying the
current checkout:

```bash
node scripts/check-local.mjs --ref <40-character-commit>
```

Git archives only that commit; unrelated local files and dirty edits cannot enter
the context. The manifest still describes the initiating checkout's dirty state,
and identifies the tested source as `clean-ref`. The commit must contain the same
replay/toolchain contract as the driver; use the target commit's driver when that
contract changes. Setup failures retain partial manifests with missing facts.

The default reuses Docker's content-addressed layers. A scoped cold build bypasses
layers for this run's checks/application builds, while retaining immutable base
images and leaving other projects' cache, containers and volumes alone:

```bash
node scripts/check-local.mjs --ref <commit> --cache cold
```

Do not prune the daemon to investigate a test. Preserve the original failed run
directory before rerunning; each invocation uses a new namespace.

### Focused timing investigation

The catalog replay uses the normal browser configuration, with one worker,
one diagnostic retry, `forbidOnly` and `failOnFlakyTests`. It selects the item
creation/order and page-candidate regressions plus deterministic request-gated
save, stale-review and superseded-refresh scenarios. No arbitrary sleeps or
timeout increases are used. Each case repeats three times by default; the seed
and repeat index alternate the controlled older/newer response order. Every
attempt and trace is retained, including passes. Retries never turn a failed
first attempt into accepted evidence.

```bash
node scripts/check-local.mjs --ref <commit> --scope catalog --profile constrained --repeat 3 --seed 126
```

Repetitions are bounded to 1–10; seeds are integers from 0 to 2147483647. Catalog
scope is investigation evidence and cannot grant release acceptance. The manual
CI workflow exposes the same scope, cache, profile, repetition and seed options;
select the branch containing the commit to investigate.

The constrained profile limits the runner to 2 CPUs/4 GiB with 1 GiB shared
memory, its test PostgreSQL to 1 CPU/512 MiB and application installations to
1 CPU/1 GiB each, including recovery/installation fixtures. The normal profile
keeps only the existing 1 GiB runner shared-memory setting. These are explicit
container ceilings, not assumptions about hosted runner capacity. BuildKit is a
daemon service outside those ceilings; its version/driver and daemon capacity
are reported. Gate timings, cgroup quotas and available disk/memory help classify
capacity failures separately from synchronization defects.

### Compare and retain evidence

```bash
node scripts/check-compare.mjs .data/local-checks/<local-run> <downloaded-ci-manifest.json>
```

The comparison identifies matching material inputs, source/toolchain/policy
differences, execution-environment differences and missing evidence. Missing facts
yield an inconclusive comparison. Matching HEAD values alone never prove source
equivalence. Ephemeral BuildKit stdin-session IDs are omitted; tar transport
digests are diagnostic, while comparisons use canonical source fingerprints and
resolved base materials. Matching fingerprints/configuration still cannot guarantee identical
scheduling. `gates.json` preserves commands/order, prerequisites, result classes
and stage durations. The manifest records resolved image IDs/base materials,
host/container Node/npm, Docker/Compose/BuildKit, OS/kernel/architecture,
resource limits, locale/timezone, installed tooling packages and resolved browser
projects/workers/retries/timeouts. Only selected non-secret configuration is kept.

CI uploads compact manifests, gate summaries and browser statistics on success
and failure, including manual runs, for 14 days. Compact evidence is capped at
8 MiB per run. Failure/catalog traces and screenshots have a separate 64 MiB,
200-file cap; `retention.json` records omission counts and a bounded path sample. Traces contain disposable
synthetic test traffic. The upload allowlist excludes checkouts, environment
files, database dumps, raw Docker inspection and host/application logs. Full logs
and reports remain in the local run directory. Hard runner termination can
prevent final export; retained partial manifests must be treated as incomplete.

### Toolchain updates and failure classification

Dockerfile image references pin multi-architecture index digests. Checks tooling
and production runtime packages resolve through a dated, signed Ubuntu/Debian
archive snapshot; installed versions are inventoried. Archive unavailability
fails setup, with no fallback to current packages. See the upstream
[Docker digest guidance](https://docs.docker.com/build/building/best-practices/#pin-base-image-versions),
[Ubuntu snapshots](https://snapshot.ubuntu.com/) and
[Debian snapshots](https://snapshot.debian.org/).

Update image tags/digests, Node/npm, `.nvmrc` and the archive snapshot together in
the toolchain specification and Dockerfile. Keep Playwright's package and image
versions matched. Review security updates regularly; pins require deliberate
maintenance. Run the toolchain/source/report tests and focused image/browser
checks, then obtain clean normal/cold and local/hosted comparisons before release.
The consistency guard rejects declared-toolchain drift.

Focused runner checks can run independently of acceptance:

```bash
node --test scripts/check-source.test.mjs scripts/check-evidence.test.mjs scripts/check-local.test.mjs scripts/check-gates.test.mjs scripts/check-report.test.mjs scripts/check-release-results.test.mjs scripts/check-browser-results.test.mjs
CHECK_SOURCE_DOCKER_TEST=1 node --test scripts/check-source.test.mjs
```

The opt-in Docker cases use only synthetic temporary Git repositories, including
ignored secrets, Dockerfile-specific exclusions and normal/cold source snapshots.

`npm ci` remains authoritative for the committed lockfile and integrity hashes.
Advisory requests intentionally stay live: high/critical findings and unavailable
advisory evidence still fail acceptance, and release evidence must be fresh and
match the lockfile. Compare `dependencies.json` timestamps/findings separately
from frozen test inputs. Documentation checks validate relative links locally;
registry/archive transport availability is separate from pinned-content integrity.
Classify failures as source/configuration drift, pinned-input transport/setup,
fresh advisory/network findings, synchronization defects, application races or
capacity failures, using the retained request timeline and gate/resource facts.
Do not classify a retry pass as success, allow skips, or broaden timeouts to hide
a race. The request-gate tests supplement the
[Playwright completion assertions](https://playwright.dev/docs/best-practices#use-web-first-assertions).

## Focused catalog upgrade smoke

`scripts/catalog-update-smoke.mjs` is an opt-in check for a freshly started,
disposable production container. It requires no submissions or installed content
updates and uses only temporary credentials/data. Never run it on a hosted clan's
installation. Copy it into the test container, then run:

```bash
docker cp scripts/catalog-update-smoke.mjs <disposable-container>:/tmp/catalog-update-smoke.mjs
docker exec -e CATALOG_UPDATE_SMOKE_TEST=1 <disposable-container> node /tmp/catalog-update-smoke.mjs
```

The container needs its normal HTTPS `PUBLIC_ORIGIN`. The check uses real
login/password change, CSRF/Origin validation, runtime-role catalog corrections,
idempotent replay, retained local identity/credit, and a temporary PostgreSQL
dump/restore of images, prompt state and receipts. It removes the restored
database/dump; remove the disposable installation afterward. The script is not
included in production runtime images. This focused check does not replace full
release acceptance.
