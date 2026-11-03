# Staff guide

Use **Admin panel** in the website header, or open `/admin` directly. **Main site**
returns to the collection log; leaving unsaved edits asks for confirmation.
The administrator can create moderator accounts; each
person changes their temporary password at first login. By default, moderators can review
submissions, enter manual claims, manage the catalog and import competitions.
Only the administrator changes site settings, shared keys and enforcement switches,
and manages accounts. Both roles can edit automatic review rules.

On **Access control**, the administrator chooses which pages all moderators can
access. Changes take effect on subsequent API requests; open moderator tabs refresh
their navigation within 25 seconds or when refocused. Turning off a page also blocks
its actions and direct API requests. Shared catalog reads remain available to allowed
submission and scheduling tools. Access control, account management and existing
administrator-only actions cannot be delegated. Granted Site settings, Hardcore worlds
and Discord bot pages are read-only for moderators; secrets are never redisplayed.

The public **Collection log** is at `/`; **Xp tracker** at `/xp` contains skill
competitions and XP results. The buttons preserve the selected catalog page.
Hardcore mode has its own collection log and hides the public page buttons;
switching to hardcore from XP opens that log. Page links use `?page=<page-id>`;
`hardcore=1` selects hardcore only when the feature is enabled in settings.

In **Site settings**, **Event collection highlight** changes the Event item outline
and hover-menu highlight. **Hardcore worlds** has its own **Hardcore collection
highlight**. Click the preview swatch to choose a colour, or enter a six-digit HEX
value (with or without `#`). Set Alpha (0–100% opacity), then save the settings. Alpha affects the highlight
only; 0% hides it without hiding the item or collection history.

## Submissions

The Pending and Reviewed queues show 20 submissions per page. Next appears when
another page exists. Changing filters starts again at page one. A stale queue
offers a fresh load instead of combining different snapshots.

Open a card to see evidence, item identity, source, original chat message and
audit history. Save corrections and staff notes separately. Approval requires
a saved matching item and proof acknowledgement. Pending **Collection flags** save
with Approve/Reject; changing a flag clears acknowledgement without making claim
corrections dirty. For approved credits, enter an audit reason and use **Save
collection flags** separately. This preserves other correction/note drafts.
For Discord/RuneLite claims, **Use saved intake timing** reclassifies from the
original receipt's timing and page membership. Rejection, revocation and
corrections to an approved credit require a reason. The revision prevents
concurrent reviewers from overwriting each other; reload after a conflict.

Manual submission accepts a collector, catalog item, collection date and optional
PNG screenshot and note. External proof links are no longer accepted. Check
**Obtained during events** for Event collection; otherwise it is Regular.
Approve immediately is on by default. Hardcore forces Regular and has independent
credit. Staff can record hardcore claims even when the public hardcore view is disabled.

Choose an **Event page** when recording an Event claim. One eligible page is
selected automatically; several eligible pages require a choice before approval.
Source claims use the eligible pages saved at intake, even if the schedule later
changes. Explicit staff Event overrides can choose a current page containing the
item outside that schedule. The review controls show the saved target and occupied
pages. Corrections retain an existing historical target unless explicitly changed.

Normal-world items can have one approved Event collection per page and independent
Regular collections. The same shared item can have different Event collectors and
dates on different pages. Each page highlights and displays only its own Event
history alongside shared Regular history. An Event obtain assigned to another page
appears here as a Regular collection, retaining its original collector and date.
Its Event assignment and single obtain count are preserved. Completion and obtain totals still count
the original canonical items and obtains, without multiplying them by page membership.
**Filter out regular duplicates** blocks another Regular credit in
the same world mode when on. When off, Regular collections follow the repeat
collector policy below. Re-enabling it preserves existing history. Staff approval and
corrections enforce the same rules. Revoke a credit to remove that entry only.

**Repeat collections by username** is a separate section directly below that
filter. The administrator chooses **Automatically reject repeat collections**,
**Show each obtain separately** (the default), or **Merge obtains by username**,
then saves the choice. Moderators can read the policy. Failed saves retain the
draft; after a conflict, review the reloaded settings before saving again.

Repeats match the canonical item, world mode and normalized collector name, using
case-insensitive names with underscores, nonbreaking spaces and repeated whitespace
treated as spaces. The collector identity is independent of the staff or Discord
account submitting the claim. An approved Event or Regular credit qualifies;
pending, rejected and revoked claims do not. Normal and Hardcore stay independent.
The broader Regular duplicate filter takes precedence for additional Regular
credit, including for different collectors. Separate/merged display uses the normal
approval and proof rules and leaves that filter enabled when it was already on.

Reject mode stores new repeat claims as rejected with a policy reason and settings
revision. Pending approvals recheck the current policy; a conflicting approval or
approved identity/item/world correction is refused atomically. Existing approved
history remains intact when the policy changes, and old delivery retries keep their
original receipt. A normal correction to an existing credit's date or equivalent
name spelling preserves it.

Merged hover history shows one group per normalized username. Multiple obtains use
**Collected 3x by Alice first on 01/10/26**, using the earliest collection date and
its display spelling; a single obtain keeps **Collected by Alice on 01/10/26**.
Expand **Collection history** for every date and Event/Regular label, including
repeated dates. Groups with the current page's Event credit appear first. An Event
obtain from another page appears as Regular in the current page's history, while
the obtain remains a single record. Revocation and corrections update group counts
and dates; item completion and actual obtain totals retain their canonical meaning.

With the regular duplicate filter off, a later Event-eligible obtain becomes
Regular when the selected page already has an approved Event collection for that
item, even while the schedule is still open. It follows the usual review/automatic
approval policy.
The original Event credit stays intact; the later obtain appears in Regular
history and adds to the obtain total. Review details explain this fallback.
Approval checks again if another claim acquired the Event credit after intake.
Ordinary edits and later Event revocation do not promote a saved fallback to Event;
staff can explicitly request saved intake timing or change collection flags.

## Event credit upgrade review

After an upgrade, **Assign existing Event collections to pages** opens for the
administrator when legacy Event collections still need a page. Single-page credits are assigned
automatically; shared items require one choice for each original credit. Review
the collector, date, available pages and original timing evidence. Evidence is
advisory and never selects a shared item's destination automatically.

Save selected choices together, or choose later/Escape to leave them outstanding.
Outstanding credits return on the next visit, including after a restart. If a save
times out, use Retry with the same choices; the saved receipt prevents a second
assignment. Reload after a stale catalog or credit conflict. Items without an
available page retain their legacy credit and need catalog membership repair first.
Moderators cannot read or apply these assignments.

Unassigned credits remain visible as legacy Event history. New Event approvals for
that item wait until assignment is resolved; Regular credits and unrelated items
remain usable. Assigning a legacy credit changes only its target and audit/version
metadata. Renaming or retiring a page, or removing an item from it later, retains
the historical page identity and evidence; it never moves credit to another page.

## Catalog

Sections contain pages, and pages can share canonical items. Moving or removing
one membership does not create another item or erase credits elsewhere.
New items need a name, in-game item ID and selected page. **Item icon (optional)**
uses the bundled default when left blank; no upload is needed. A selected PNG/WebP
must finish validation before saving. **Remove selected icon** returns to the
default. Uploaded icons keep their native dimensions and transparency.
You can replace the default later in the item inspector; leaving **Replace item icon**
untouched keeps the current icon. Existing item edits may omit game IDs; RuneLite
matching needs an unambiguous game ID.
Use the inspector to edit names, icons and memberships. Deletion retains audit
and submission history. Section, page and item order stays local until you click
**Save changes**. Leaving a page with unsaved edits asks whether to discard them.

RuneLite items missing from the catalog appear in **Submissions → Unmatched**.
Check the submitted name, original **Game item ID**, chat message and optional
screenshot. Select the correct canonical item and **Save corrections**, then
review and approve separately. Notes and rejection do not require a match.
Catalog items and game-ID aliases are managed separately in **Items catalog**.

## Catalog update review

The first administrator sign-in or restored session after an update opens the
review when there are pending problems. **Review catalog update** appears on admin
pages only while problems or supplied-icon replacements remain. Moderators do not
receive this tool. Release history and identical images do not trigger a review.

The table has **Detected problem** and **Fix?** columns. Non-empty groups appear in
this order: **Page name mismatches**, **Missing pages**, **Missing items**,
**Incorrect item names**, **Incorrect item ids**, **Missing item-page relationships**,
and **Incorrect item-page relationships**. Each group lists the affected entries
and proposed changes; its checkbox selects all listed fixes. Unchecked groups
stay unchanged and available for later review. ID repairs add/remove the listed
IDs rather than overwriting all mappings. Leave the group unchecked and use Items
catalog if you need to retain some listed local variants or relationships.

On existing installations, missing pages/items wait for their groups to be checked
and **Save** to succeed. Startup, login and rescanning never add them automatically.
New items also need their missing page relationships selected, and missing target
pages must be created/adopted in the same save or beforehand. Fresh installations
still receive the complete bundled catalog automatically, including after an
interrupted first startup. Previously installed content remains intact.

For a manually created page with a different name/key, review the matching, missing
and extra item evidence in the problem cell. Choose one existing page to adopt or
create a separate page. Adoption keeps its local identity, memberships and schedule
references. Conflicting or retired identities require explicit resolution; the
review never silently merges them or transfers another item's game ID.

**Use project supplied item icons (recommended)** appears below the table only
when existing icons can change. It is independent of the other groups. Newly
created supplied items use their bundled icon as part of creation.

**Save** applies selected fixes and closes the dialog. **Cancel** or Escape discards
the draft without an apply request. Saved keep decisions from earlier versions
remain honored. On an uncertain save, use **Save** again to recover the exact
receipt; choices stay fixed until that outcome is confirmed. A stale review loads
fresh differences and requires selecting again. Corrections preserve collector
history and earlier intake evidence; they do not reopen schedules or recalculate XP.

## Scheduling and competitions

Every page accepts submissions. The first panel, **Track Event collections during
scheduled windows**, contains the administrator-only On/Off switch. Its settings
navigation button remains **Scheduling and Competitions**. With scheduling enabled,
a normal-world drop is Event when an associated active page has a timed window
covering its server receipt time; otherwise it is Regular. Starts are inclusive
and ends exclusive, in UTC. The date picker shows local time and UTC together.

Permanently open pages have been retired. Older selections no longer override new
intake, while existing claims and their frozen evidence remain unchanged. Disabled
scheduling and Hardcore claims remain Regular.

Intake saves timing and page membership. Later schedule/catalog changes cannot
reclassify a claim. Unmatched claims resolve from that saved evidence when staff
save a canonical match. **Use saved intake timing** keeps that behavior; an explicit
Regular/Event correction is audited. Manual date-only claims use the selected type.
Approved Event credit has a gold item outline and a gold-bordered history block.
The hover/tap menu shows the current page's Event first, then every Regular credit
oldest first. Unassigned legacy Event history has a separate label until resolved.

[WOM imports](wom-competitions.md) can create activity windows or publish skill
results. Importing does not enable scheduling automatically. RuneLite stores
valid submissions even when a policy automatically rejects them; they appear
under Reviewed with the reason.

## Settings

Set displayed clan names, copy and logos independently for regular/hardcore.
Choose a logo or restore its default, then click **Save site settings** or
**Save hardcore settings** to apply the logo together with that form's changes.
**Discard changes** also discards a pending logo. If settings save but a logo
upload fails, the logo remains pending; retry Save to finish the upload.
The hardcore switch controls public visibility; disabling it preserves records.
The public XP tracker is hidden in hardcore mode until hardcore competitions
are supported. Set the actual in-game clan match under RuneLite submissions,
independently of the displayed site name. See [RuneLite](runelite-submissions.md).

In Site settings, edit **How to submit (Markdown)** and use **Preview instructions**
before saving. One public guide serves the collection log, XP tracker and hardcore
views. Headings, lists, links, emphasis and code blocks are supported; raw HTML
and embedded images are not rendered. The limit is 32 KiB of UTF-8 text. Empty
text displays the default guide. Save explicitly or discard changes; only the
administrator can edit this content.
