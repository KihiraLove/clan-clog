# API contracts

Application routes use same-origin `/api/v1` paths. Public catalog, collections,
settings, branding, activity and XP reads use validated snapshots; projection
routes return ETags for conditional requests. Private reads are `no-store`.
See route modules under [apps/api/src](../apps/api/src) for complete wire schemas.

Public icon discovery also exposes origin-root `GET`/`HEAD` `/favicon.webp`,
`/favicon.ico`, `/apple-touch-icon.png` and `/apple-touch-icon-precomposed.png`.
These resolve the current main branding anonymously, use the matching WebP,
ICO (embedded PNG) or PNG MIME type, and return `public, max-age=0, must-revalidate`
with a content ETag. An old validator after replacement/reset returns the new
image; storage/settings errors return a recoverable error with `no-store`.
`?hardcore=1` explicitly selects the independent Hardcore branding. Asset-ID
`/branding/:id/favicon.webp`, `/favicon.ico` and `/apple-touch-icon.png` keep
immutable caching. No icon route redirects to itself or returns the SPA document.

`GET /discord/status` returns only `enabled`, `ready` and a `state` of `disabled`,
`connecting`, `connected`, `disconnected` or `unavailable`. Connected requires
both the gateway and intake API. Non-ready enabled states return 503; disabled
returns 200 without probing the bot. Website readiness is independent.

| Area                | Main routes                                                                       |
| ------------------- | --------------------------------------------------------------------------------- |
| Public log          | `GET /catalog`, `GET /collections`                                                |
| Public settings     | `GET /settings`, `GET /branding`, `GET /branding/hardcore`                        |
| Public competitions | `GET /competitions/activities`, `GET /xp/tracker`                                 |
| Staff session       | `POST /auth/login`, `GET /auth/session`, `POST /auth/logout`                      |
| Staff review        | `GET /admin/submissions` and per-submission correction/note/decision/audit routes |
| Catalog             | Section/page/item routes under `/admin/catalog`                                   |
| Scheduling          | `/admin/schedules`, `/admin/schedules/settings`                                   |
| Imports             | `POST /admin/competitions/preview`, `POST /admin/competitions/imports`            |
| RuneLite            | `POST /runelite/submissions` multipart intake                                     |
| Discord             | `/bot` routes using the configured service credential                             |

Unknown competition metrics return HTTP 422 with code `UNKNOWN_WOM_METRICS`
and a `resolution` containing bounded source metadata, unknown keys, active
page choices, an expiring actor-bound `resolutionToken` and a `metrics-N` revision.
`POST /admin/competitions/metrics` accepts `{ resolutionToken, expectedRevision,
definitions }` and a UUID `Idempotency-Key`. Each definition contains `metric`,
`name`, `type` (`BOSS`, `ACTIVITY`, `COMPUTED` or `SKILL`), `pageIds`, and a supported
`skill` only for SKILL. The receipt returns `revision` and `savedMetrics`.
Saving definitions creates no competition or schedule; request a fresh preview
before Apply. Custom semantics are included in saved `metricDefinitions` so
public/admin validation uses the same frozen definition.

`POST /admin/catalog/items` creates one canonical item with `name`, distinct positive
`gameItemIds` and one or more existing `pageIds`, plus an optional `iconAssetId`.
Omitting the icon field uses `/catalog/default.webp` with no upload record or custom
icon override. Explicit empty, null or malformed asset IDs are invalid. Supplied
assets must remain owned by the actor, unexpired, verified and unassociated.
The `Idempotency-Key` freezes the exact creation fields: replay returns the original
item/receipt, and changing icon choice under that key conflicts. Existing uploaded-icon
receipts retain their payload format. Item edits can replace the default through
the existing staged upload path; omitting the replacement preserves the current icon.

Catalog update review uses administrator-only `GET /admin/catalog-updates`,
`POST /admin/catalog-updates/seen`, `/rescan` and `/apply`. Seen/rescan accept a
bundle-set `revision`; apply accepts `{ revision, catalogRevision, apply, keep }`
with server-generated proposal hashes. Proposals include explicit `createPage` and
`createItem` operations. Existing-install startup and rescan never create catalog
content; apply creates only selected entries and relationships, checking their
dependencies atomically. Fresh bootstrap is separate. Apply/rescan require UUID idempotency keys.
Every write reauthorizes the administrator and checks Origin/CSRF. Stale catalog
reviews conflict; exact apply retries return their original receipt. Public
`GET /catalog/update-images/<sha256>.webp` serves verified immutable WebP bytes.

Staff writes require a verified session, Origin, CSRF token and current expected
revision. Reusing an already consumed idempotency key with different data conflicts.
Successful replay returns the saved receipt. Auth failures are 401/403; stale
state is 409; malformed or unsupported input is 400/422. A timeout cannot prove
rollback: preserve the retry key and reconcile the original operation.

Pending `POST /admin/submissions/:id/approve` and `/reject` optionally accept
`flags` alongside `expectedVersion` (and the rejection `reason`). Flags contain
`hardcore` and either `collectionType` (`regular`/`event`) or `useIntakeTiming: true`.
Event flags can include `eventPageId`. Intake timing validates this choice against
the frozen eligible page IDs; an explicit staff Event override validates current
item/page membership instead. Multiple candidates require a page before approval.
Omitting flags preserves the saved classification. Both flags and the decision
save in one transaction/revision/audit. Hardcore permits Regular only; manual
claims cannot use intake timing. Approved credits use the separate
`PATCH /admin/submissions/:id/flags` with `expectedVersion`, `flags` and an audit
`reason`. It changes no item, collector, date or review note. Revoke accepts no
flags; save/discard their draft first. All credit moves enforce duplicate rules.

`POST /bot/submissions` requires the bot credential and multipart fields
`submission` (JSON) and `screenshot` (one PNG, up to 10 MiB). JSON contains
`interactionId`, `guildId`, `actorDiscordId`, `rawItemText`, `collectorName`,
optional canonical `itemId`, optional `eventPageId` and optional `hardcore` (default
false). Caller dates, decision fields and external proof URLs are rejected. The image is fully decoded,
bounded to 8192 pixels per side/32 megapixels, and saved only as private lossless
WebP. The Discord interaction ID binds metadata and image content: exact replay
returns the original receipt with 200; new intake returns 201; changed data conflicts.
Staff manual entry keeps optional PNG upload and RuneLite keeps chat proof.
The former manual `proofUrl` field accepts only an empty compatibility value;
historical URL data remains in audit/receipt records and is not new proof.

`GET /settings` publishes `howToSubmitMarkdown`, shared by all public views.
Administrator-only `PUT /admin/settings` accepts this optional field alongside
`hardcoreEnabled` and `expectedRevision`. Omission preserves saved content; an
empty string uses default instructions in the UI. The maximum is 32,768 UTF-8
bytes with no NUL characters. Saves advance the settings ETag and audit the old
and new text. Markdown is rendered without raw HTML or embedded images, with
safe links opening separately. This content is public; do not include secrets.

Settings also publish `eventHighlight` and `hardcoreHighlight`. Each is an RGBA
object: integer `red`, `green`, `blue` channels from 0–255 and numeric `alpha`
from 0–1. The same administrator endpoint accepts either optional colour;
omission preserves it. Writes validate channels, check the shared revision,
audit both old/new colours and refresh the public ETag. Defaults are opaque
gold (231,189,82) and red (255,41,41).

Review queries return at most 20 rows plus an opaque next cursor. Cursors bind
filters/revision and cannot combine different snapshots. Audit and import history
are similarly bounded. Approval requires saved proof acknowledgement and a matched
canonical item; reasons are required for rejection, revocation and approved-credit
corrections. Notes are independently versioned staff comments.

Scheduling reads retain an empty `permanentlyOpenPageIds` compatibility field.
The permanent-page editing endpoint has been removed; retained historical settings
do not affect new intake. Scheduling classifies collection type and never closes
submission intake. Associated timed normal-world pages qualify Event collections;
unscheduled drops, disabled scheduling and Hardcore produce Regular collections.
Historical claims continue to use their original frozen evidence.

Valid RuneLite intake returns 201 with a durable submission receipt, including
automatic rejection by regular-duplicate or world-review policy. Structural,
authentication and excluded-world failures remain errors. Private chat proof and
screenshots never appear in public credits. See [RuneLite](runelite-submissions.md).

Submissions and new receipts include `collectionType` (`regular`, `event`, or
`null` for unmatched normal claims awaiting classification). Manual creation and
claim corrections accept an optional explicit Regular/Event type. Automatic claims
resolve from frozen intake evidence; `useIntakeTiming: true` restores this after
a staff override. Omitted fields preserve an existing explicit override. Hardcore rejects Event.
Approved public credits include a nonnullable type. Public history contains every
approved credit; progress counts distinct items. One normal-world Event credit is
allowed per canonical item/page pair. Submissions, new receipts and public credits
include nullable `eventPageId`; public credits also expose
`eventPageAssignmentPending` for retained legacy Event credits awaiting assignment.
Regular and Hardcore credits have no Event page. Public history contains all page
credits. The hover menu groups the current page's assigned obtain as Event and
other pages' Event obtains as Regular, preserving each original collector/date and
one record per obtain. Only the assigned page receives Event highlighting. Completion, Regular
history and obtain totals retain their canonical meaning. The regular duplicate
switch governs Regular credits in each world mode. Existing receipts/audits keep their original JSON; older omitted
types display as Regular. See [staff rules](staff-guide.md).

Private review details include `eligibleEventPageIds` from the original evidence,
`occupiedEventPageIds` excluding the current submission, and `eventPageBlocked`
when another unresolved legacy credit prevents Event approval. Manual creation and
Event corrections can include `eventPageId`; Regular/Hardcore inputs cannot.

XP gains are nonnegative integer strings, never floating-point numbers. WOM metric
weights and combined/computed scores use canonical decimal strings. Competition
metadata can include `metricDefinitions`; finished previews include `standings`
with per-metric `deltas`. Public XP events include a `competition` summary with at
most three standings; public activity reads expose metadata only. Imports
are previewed and applied transactionally; refreshing replaces a prior event's
contribution. [Competition rules](wom-competitions.md) define lifecycle and corrections.

## Repeat collector policy

`GET /admin/submission-filters` and queue metadata include `repeatCollectorPolicy`:
`reject`, `separate` or `merge`, alongside `filterCollected` and the shared
`submission-filters-N` revision. The default is `separate`, including during
upgrade. Administrator-only `PUT /admin/submission-filters` accepts the optional
policy with `filterCollected` and `expectedRevision`. Omission preserves the saved
policy. Writes require Origin/CSRF, reject stale versions with 409, and audit the
actor plus old/new filter and policy. Moderators may read the values.

Matching uses canonical item ID, world mode and `normalizePlayerName()` applied to
the submitted collector identity. An indexed approved item/world candidate query
uses that same JavaScript normalizer so database collation and Unicode lowercasing
cannot disagree. Pending/rejected/revoked credits never establish a repeat.
Existing approved Event and Regular credits both qualify. Canonical-item locks and
shared settings locks serialize intake and approval checks. The broader Regular
duplicate filter retains precedence. Pending approval and identity/item/world
changes to an approved credit can return 409 with the repeat-policy reason, leaving
the prior record intact. Policy changes never rewrite existing approved history.

Automatic repeat rejections are saved with `admissionPolicy` (the original filter
snapshot), reason, proof and audit evidence. RuneLite and Discord return a durable
rejected receipt with `rejectionReason` and `admissionPolicy`; new intake returns
201 and exact replay returns the original JSON. Manual creation returns its saved
rejected private submission with `reviewReason` and `admissionPolicy`. The Discord
bot describes rejection truthfully. Existing request fingerprints and historical
receipt JSON are retained, including the independent five-second observer window.

Anonymous `GET /collections` also includes `repeatCollectorPolicy`. Missing legacy
metadata defaults to separate; invalid values fail validation. Policy writes
advance its public revision/ETag even when credits stay unchanged. An open menu
refreshes the presentation using that metadata, without private requests. Merge
mode groups Regular entries by normalized username per canonical item/world,
keeping one original record per obtain. The current page's Event credit stays
separate and first, with its original collector/date wording; that collector's
additional obtains appear below a single Regular collection separator. An Event
obtain assigned to another page joins the Regular entries on the current page.
The summary is `Collected <number>x by <collector name> first on <date>` for repeats;
singletons retain their existing text. Merged groups display only the first date.
Equal dates still represent separate obtains. No stored credit is collapsed.

## Collector identities and name changes

Collector identity is independent of staff accounts and WOM. Migration 007 adds
the registry, immutable original-name provenance, preview/request/audit tables and
indexed history references. The migration runner backfills existing submissions
in batches using the shared JavaScript `normalizePlayerName()` inside its existing
migration transaction, before recording 007. Run the normal application migration
command; executing its SQL file alone omits this data step. Prior migration bytes,
submission evidence, payload hashes, receipt JSON and audit JSON are retained.
Original-name provenance uses the earliest available audit snapshot; if none
records a name, it retains the submission's name at upgrade. Missing historical
evidence is not reconstructed or inferred from a current external account.

Active normalized current names are unique. Merged identities point directly to
an active survivor, including after a second merge; reads never traverse a merge
chain. A rename or merge updates identity records rather than rewriting all
obtains. Public credits resolve the current name. Private submissions also expose
`collectorId` and `originalCollectorName`; old receipts/audit snapshots may omit
them. Submission version checks incorporate identity changes, so an older staff
editor cannot silently reassign a collector using the name shown before a rename.
Single-claim corrections retain original provenance and reassign only that claim.

Administrator-only, same-origin routes:

| Method | Route                                          | Request/result                                                                                                                                             |
| ------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/v1/admin/collectors?search=<prefix>`     | At most 50 active collectors and `hasMore`; each identity has `id`, `name`, `version`, `historyVersion`.                                                   |
| POST   | `/api/v1/admin/collector-name-changes/preview` | `{ sourceId, newName }`; returns actor-bound token, explicit `rename`/`merge`/`noop`, exact source/target names and versions, and source counts by status. |
| POST   | `/api/v1/admin/collector-name-changes/apply`   | `{ token }` plus UUID `Idempotency-Key`; returns operation ID, actual operation, source/survivor IDs, original/new names and affected counts.              |

Both POSTs require Origin and CSRF validation. Preview performs no name/history
change and expires after 15 minutes. Apply validates source/target identity and
history versions, current normalized target existence and expiry. A new target or
changed scope returns 409; it never converts a confirmed rename into a merge.
No-op previews are not applicable operations. Missing/retired sources require a
new selection. Moderators cannot search, preview or apply these operations.

The catalog gate precedes the collector identity gate; intake, approvals and
corrections hold its shared side before scheduling, submission or canonical-item
locks. Apply holds its exclusive side and atomically saves the identity change,
public/private revisions, actor-attributed audit and immutable request result.
Preview pins identity rows in deterministic order while reading scope counts.
History counters invalidate previews when submissions change. Queries use current
name, survivor and collector-history indexes; bulk operations touch registry
identities, not every historical obtain. A failure rolls the entire apply back.

Replay with the same actor/key/token returns the saved result even after later
renames or expiry; another token with that key conflicts. Existing source receipts
are never rewritten. The browser retains the key/token after an uncertain result
and requires a new explicit confirmation after a definite scope conflict.

Names are not permanent external account IDs. Future submissions use the active
current name. A new obtain under a retired spelling starts a separate identity;
there is no automatic historical alias resolution for recycled/late player names.
Staff can verify and merge it explicitly. Normalized case/spacing variants of a
current name still resolve to that current identity.

## Legacy Event page assignments

Administrator-only `GET /admin/event-page-assignments` returns `revision`, `total`
and up to 50 unresolved `credits`. Each credit contains the original submission
ID/version, item, collector/date, current page names and availability, frozen
eligible page IDs and receipt time. A missing or retired destination stays
unresolved and requires catalog repair. Historical evidence never chooses a shared
item's page automatically. Empty reviews do not prompt on fresh installations.

`POST /admin/event-page-assignments` accepts `{ expectedRevision, assignments }`;
each assignment contains `submissionId`, `expectedVersion` and `eventPageId`.
Select 1–50 distinct credits and send a UUID `Idempotency-Key` with the normal
Origin/CSRF protections. The entire selected batch validates current membership,
credit versions and the catalog/review revision before committing. The response is
`{ assignedIds }`. Actor-attributed before/after audit records and durable receipts
are atomic with the assignments. Exact retries return the original response even
after a restart; changed payloads under the same key conflict. Cancellation has no
write. Unrelated Regular submissions do not invalidate the review revision.

Migration assigns approved single-page legacy Event credits only when their sole
page is active; shared/missing/retired cases retain their original record with the
pending marker. That marker blocks new Event approvals for the affected canonical
item until assignment or explicit revocation. It does not block Regular history or
unrelated items. Page retirement or membership removal after assignment retains the
historical page ID; unchanged history can still receive collector/date corrections.
New or moved Event targets must be active current memberships. Omitted input page
fields retain old intake fingerprints and opaque receipt JSON; explicit targets
are included in new request fingerprints. Event-to-Regular fallback checks only a
selected page's occupied slot when Regular duplicate filtering is disabled.

## Credential throttling

`POST /auth/login` requires the exact configured Origin and admits at most
20 attempts per validated source and 5 password checks per case-insensitive
username per 60-second window. `PATCH /auth/account` retains Origin/session/CSRF
validation and independently admits 5 current-password checks per staff account,
including mandatory first-login changes. Reservations happen before password
verification, persist across API restarts/workers and count successful attempts.

An exhausted budget returns 429 with `{ error: string }`, `Cache-Control: no-store`
and `Retry-After: <seconds>`: the remaining blocking window rounded up, from
1 through 60. Unknown/disabled accounts have the same response shape and dummy
password verification as other admitted failures. Rejected requests do not
refresh deadlines. Limiter storage/capacity failures return a sanitized 503 and
do not allow password work. Password-queue saturation is a separate 429 with
its existing one-second retry. Session refresh/logout are outside these budgets.

The browser validates bounded positive delta-seconds, falls back to 60 seconds
for missing/malformed throttle headers, and never retries credentials
automatically. Its tab-local deadline survives reload/deep links without storing
a username, password, cookie or CSRF token. API enforcement is authoritative.
