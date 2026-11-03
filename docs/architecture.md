# Architecture

The `clan-clog` image runs PostgreSQL 17, Nginx, a Fastify API and an optional Discord bot in one container. A root supervisor initializes storage and PostgreSQL, then starts application processes as UID 1000 and PostgreSQL as UID 999. One persistent `/data` volume holds the installation. PostgreSQL listens only on loopback and a private Unix socket.

```mermaid
flowchart LR
  Browser --> Nginx
  Nginx --> API[Fastify API]
  Discord --> Bot[Optional bot]
  Bot --> API
  API --> DB[(PostgreSQL)]
  Bot -->|Read encrypted settings| DB
  API --> Files[Uploaded images and branding]
```

| Folder              | Responsibility                                                    |
| ------------------- | ----------------------------------------------------------------- |
| `apps/web`          | React/Vite public log and staff tools                             |
| `apps/api`          | Authentication, reads, intake, reviews, catalog and competitions  |
| `apps/bot`          | Discord commands and saved configuration; submissions use the API |
| `packages/domain`   | Shared validation, item identity, world modes and exact XP        |
| `packages/database` | Database setup, catalog import, permissions and maintenance       |
| `infra`             | Nginx, process supervisor, deployment and recovery                |
| `catalog`           | Pinned catalog inputs, identity mapping and asset provenance      |

PostgreSQL is authoritative. An item has one canonical ID across every page.
Approval grants Regular or Event credit. Normal-world items can have one Event
credit per canonical item/page pair and independent Regular credits; the regular
duplicate filter controls Regular repeats in each world mode. Hardcore supports Regular only. Rejection
and revocation grant no credit. Claims, receipts and audits remain private.
Revisions prevent one staff edit from overwriting another. Request keys let
clients retry uncertain writes without creating a second submission or import.

Bootstrap initializes a fresh database with `001_baseline.sql`, applies pending
migrations, imports the catalog and provisions
`clog_runtime`. Only bootstrap/maintenance gets owner credentials. Startup
checks migration names and checksums; incompatible history fails before writes.
New migrations upgrade existing installations without recreating their data.
Databases with pre-release or incompatible migration checksums are unsupported.

Public reads use revision-based ETags and visibility-aware polling. Staff routes
load code and data together and clear private state on access loss. Production
builds exclude tests and fixture data. Item icons, fonts, UI art, logos and
uploads are served locally; the browser never fetches WOM results directly.

## Application wording

`packages/domain/src/text.ts` is the code-maintained source for shipped application
wording. Import its named feature exports through `@clog/domain`, for example
`import * as appText from '@clog/domain'` and
`appText.webCollectionLogItemLabel(name, collected, hardcore, count)`. Each feature
contains semantic labels, complete messages and typed formatters; shared messages
also supply API errors and the browser/bot allowlists that recognize them.
Use direct named entries so public pages do not load staff or server wording.
The module is pure and browser-safe; rendering, date/number formatting and React
markup stay in the consuming layers. Structured parts such as `webSiteAppFooterCredits`
keep link labels and surrounding words together without embedding HTML.

Existing `defaultSiteCopy`, `defaultSubmissionHelp`, skill labels and validation
exports refer to this source. It owns shipped defaults, while saved regular and
Hardcore settings and submission instructions still take precedence. Editing a
default does not rewrite persisted administrator text, audit history or receipts.
Vite injects the initial HTML title from the same collection-title default in
development and production. The production Vite compiler resolves catalog reads
to ordinary string/object expressions and complete formatter calls. This removes
catalog lookup overhead without shipping unused staff/server text; development
uses the same typed exports directly. Formatter arguments still evaluate once.
Avoid collecting the whole catalog in a runtime object, spreading a text namespace,
or looking up exports dynamically. Rendering continues to escape text normally.

Route/asset paths, enum IDs, environment names, SQL, HTTP/cookie formats, selectors
and command/option identifiers remain contracts in their existing layers.
Imported catalog/WOM names and user input retain their sources. The pinned legacy
clue taxonomy correction and its immutable audit reason are historical evidence.
Build-tool diagnostics are separate from live application wording.
ESLint's `copy/canonical-text` rule and `npm run check:text` enforce the authored
text boundary; see [focused checks](local-testing.md#focused-checks).

See [security](security.md), [contracts](contracts.md), [testing](local-testing.md)
and [recovery](release-recovery.md) for the operational boundaries.
