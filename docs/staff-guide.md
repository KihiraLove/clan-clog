# Staff guide

Use **Menu → Admin panel** in the website header, or open `/admin` directly. **Main site**
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

Both controls are in **Duplicate handling** on **Submissions**. The Regular filter
toggle saves immediately. Under **Repeat collections by username**, the
administrator chooses **Automatically reject repeat collections**,
**Show each obtain separately** (the default), or **Merge obtains by username**,
then selects **Save**. Moderators can read the settings. Failed saves retain the
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

The hover menu keeps the current page's Event credit first, using
**Collected by Alice on 01/10/26**. Additional obtains by that collector appear
under the single **Regular collection** separator. Merge mode groups those Regular
obtains by normalized username. Multiple obtains use
**Collected 3x by Alice first on 01/10/26**, using the earliest collection date and
its display spelling; a single obtain keeps **Collected by Alice on 01/10/26**.
Only the first date is displayed for a merged group; equal dates still count as
separate obtains. An Event obtain from another page appears as Regular in the
current page's menu, while the obtain remains a single record. Revocation and
corrections update group counts and dates; item completion and actual obtain totals
retain their canonical meaning.

With the regular duplicate filter off, a later Event-eligible obtain becomes
Regular when the selected page already has an approved Event collection for that
item, even while the schedule is still open. It follows the usual review/automatic
approval policy.
The original Event credit stays intact; the later obtain appears in Regular
history and adds to the obtain total. Review details explain this fallback.
Approval checks again if another claim acquired the Event credit after intake.
Ordinary edits and later Event revocation do not promote a saved fallback to Event;
staff can explicitly request saved intake timing or change collection flags.

## Collector name changes

### Collector game modes

Each collector has one current **Game mode**, shared across items and normal and
Hardcore collection worlds. Existing collectors start **Unassigned**. **Normal**
is an explicit assignment, not the default for missing information. Supported
modes are Normal, Ironman, Ultimate Ironman, Hardcore Ironman, Group Ironman (GIM),
Hardcore Group Ironman (HCGIM) and Unranked Group Ironman (UGIM); team sizes are not
tracked.

Administrators can open **Submissions → User Handling → Game Mode Changes**,
search for a collector, select that collector and save a game mode without opening
a submission. **Name Changes** and **Game Mode Changes** share the User Handling
panel. Unsaved or uncertain mode changes keep the selected collector locked until
the change is discarded or recovered.

In a submission review, administrators and moderators with Submissions access can
choose **Game mode**, then **Save game mode** or **Discard**. This saves the
collector profile independently of the claim: it needs no item match or proof
acknowledgment and does not approve, reject, revoke or change the claim's date,
world or Event credit. Original submitted modes remain private provenance. A
different submitted value is shown as a disagreement for review; later intake
cannot replace an established or explicitly reviewed assignment.

A stale mode draft must be reloaded before saving. An uncertain result keeps the
original request; **Retry game mode save** recovers it, including after reopening
the review. Successful changes refresh public appearances. The six Ironman modes
show a labeled helmet beside usernames in item hover/tap menus. Normal and
Unassigned show no helmet. Current mode does not affect duplicate identity or
obtain/completion totals.

A rename retains the mode. A merge carries the assigned value when only one
collector has one, and retains matching assignments. Conflicting assignments
require choosing **Game mode after merging**, requesting **Preview selected game
mode**, and then confirming **Merge users**. The exact name-change confirmation
remains visible and the selected resolution is audited. A public WOM-verified
merge with conflicting modes requires staff.

### Name changes and merges

**Enable user submitted name changes**, directly below the **Name Changes**
subtitle in **User Handling**, controls **Menu → Change name** on the public site.
It starts disabled after upgrade. Administrators can toggle it; moderators can
see its current setting. The staff rename and merge workflow below does not
require Wise Old Man (WOM) verification.

When enabled, visitors enter their old and new RuneScape names in the public
dialog. The server requires an approved WOM name change on the new name's current
player profile, including a chain of approved changes when necessary. If the old
name still exists without that approved change, the dialog links to WOM's name
change form. Missing, unavailable or ambiguous WOM records ask the visitor to
contact staff. A successful check applies the same collector rename or merge,
closes the dialog and displays **Name successfully changed**. Disabling the toggle
also blocks new public changes on the server, including an open dialog.

If the public dialog cannot confirm a response, click **Change** again to recover
the same request. A retired name reused by a different WOM player, a previously
used verification record or conflicting known player identities requires staff
review. This check trusts WOM's approval; it does not authenticate the visitor
or update accounts on WOM.

The administrator can use **User Handling → Name Changes**, below **Duplicate handling** on
**Submissions**, to rename a collection-log collector or merge that collector into
an existing one. Search for the source collector, select it, and enter the new
name. Existing target names are suggested while typing. **Change name** requests
a server preview; it does not change any collection history.

The confirmation shows either:

```text
Are you sure you want to change user Alice to Alice New?
This action cannot be reversed.
```

or, when the normalized target already exists:

```text
Are you sure you want to merge user Alice to existing Bob?
This action cannot be reversed.
```

Confirm with **Change name** or **Merge users**. **Cancel** and Escape dismiss the
window without applying the preview. There is no Undo or Unmerge action. If a
collector's names or history change after the preview, use **Preview again** and
review a new confirmation. An uncertain save retains its request: **Retry
confirmation** recovers that same operation, including after dismissing the
window. Do not assume an unconfirmed response means the operation did not happen.

Renames affect the collector's pending, approved, rejected and revoked submissions
in both world modes. Merges keep the existing target identity and every original
obtain, including overlapping items and repeated dates. Status, dates, Event pages,
proof, actual obtain totals and completion counts stay intact. Original submitted
names remain visible in submission details; old audit entries and delivery
receipts keep their original content. Existing staff editors must reload after a
collector name change. Staff sign-in names and WOM accounts/results are separate.

Name matching uses the same case/space/underscore normalization as repeat-collector
policies. A case-only spelling change is a display-name change; an unchanged
effective display name reports that no changes were made. A confirmed merge never
retroactively rejects overlapping history, even in reject-repeat mode. Future
obtains under the survivor's current name use its combined approved history for
duplicate checks. Separate mode still lists every obtain; merge mode groups the
Regular entries under the current name, with the Event entry kept separate.

Retired names are **not permanent aliases**. A genuinely new submission under an
old name creates a separate collector, because a player name can be recycled.
An old delivery retried with its original request key returns its saved receipt.
Verify a late arrival before using a confirmed merge, or correct that individual
submission. Editing one submission's collector reassigns that claim only; use
**Name Changes** for a collector-wide display spelling change.

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
