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
