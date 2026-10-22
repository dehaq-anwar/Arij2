# Youth of Peace — Control Center handbook

**Deutsche Fassung:** [HANDBOOK.de.md](HANDBOOK.de.md)

**Status:** 2026-10-22, features of CC-0 to CC-5 ([CONTROL-CENTER.md](CONTROL-CENTER.md)
§14–§19). For everyone who works with the Control Center: the board, content editors, membership
managers, auditors and the technical administrator. Technical work on the server is in the
operations guide ([OPERATIONS.md](OPERATIONS.md)).

**How to read this handbook**

- Text in "quotation marks" is the label in the interface (interface language English).
- **Open (decision N)** means: the feature depends on a decision of the association that is still
  pending (CONTROL-CENTER.md §12).
- `[PLACEHOLDER: …]` marks information that is still missing.
- You only see menu entries and buttons your role allows. If something is missing, it is usually
  the role (section 2).

**Contents**

1. Getting started
2. Roles and what they may do
3. Confirming with a code
4. Website content
5. Members, applications and messages
6. User accounts
7. Audit log
8. Operations, e-mail and statistics
9. Data protection in daily work
10. Help and contact

---

## 1. Getting started

### 1.1 Address, menu and language

- The Control Center has its own address: `https://verwaltung.yop-ye.org/admin` (chosen by the
  association, CONTROL-CENTER.md §14). The website's address has no `/admin`.
- The menu on the left is grouped: "Overview", "Content", "Page texts", "Association",
  "Operations", "Insights", "Security".
- There are two language menus at the top:
  - "Interface": the language of the Control Center (Deutsch, English, العربية).
  - "Content language": the language of the text you are editing. It appears only for content
    that exists in several languages.

### 1.2 Signing in

1. Enter your "E-mail address" and "Password" and choose "Continue".
2. Under "Verification code", enter the six-digit code from your authenticator app.
3. Choose "Confirm".

Without your phone, choose "Use a recovery code" (section 1.6).

Protection against failed attempts (docs/privacy-notes.md):

| What happens | Result |
|---|---|
| 5 wrong passwords | The account is locked for 15 minutes |
| 5 wrong codes in one sign-in | The sign-in ends; sign in again with your password |
| 10 wrong codes in 15 minutes | Two-factor sign-in is locked for 15 minutes |
| Code not entered within 10 minutes | The sign-in expires |
| Many attempts from the same connection | At most 20 in 10 minutes and 100 per day |

"Forgot password?" sends a link by e-mail. The code from the app is still needed afterwards. This
works only when a mail server is set up (section 8.3).

### 1.3 First sign-in: set up the authenticator app

Every account needs a second factor. At the first sign-in, "Set up two-factor sign-in" appears.
Nothing else is possible before it.

1. Install an authenticator app, e.g. Microsoft Authenticator or Google Authenticator.
2. Scan the QR code with the app. Without a camera, type in the "Key for typing in".
3. Enter the code the app shows now.
4. "Your recovery codes" appear: 10 codes, each works exactly once. They are shown **only now**.
   Use "Copy" or "Save as file" and keep the codes apart from your phone.
   `[PLACEHOLDER: where the association keeps recovery codes]`
5. Tick "I have stored the codes safely." and choose "Go to the Control Center".
6. Change the initial password: "Account" → "Change Password". Passwords have at least 12
   characters. The change needs a code (section 3).

Your account gets an e-mail once the second factor is set up (if a mail server is set up).

### 1.4 How long a sign-in lasts

- A session lasts 2 hours and is renewed while you are active.
- After 12 hours at most, you sign in again, even if you were active.
- The sign-in applies only to the Control Center's address, not to the website.

### 1.5 "My security"

Menu "Overview" → "My security". This is where you manage your own account.

| Area | What you can do |
|---|---|
| "Two-factor sign-in" | See the status; "Create new recovery codes" (needs a code; all previous codes stop working) |
| "Signed-in sessions" | See sessions with device, start and last activity; "Sign out" one, or "Sign out all other sessions" |
| "Known devices" | "Remove" devices. A sign-in from another device is reported to you by e-mail |
| "Your recent security events" | Your sign-ins and security changes |

The "Dashboard" shows how many recovery codes are left and warns when only a few remain.

### 1.6 Lost phone

1. Sign in with a recovery code ("Use a recovery code"). Each code works once. Your account gets
   an e-mail about it.
2. Without codes: another super administrator resets your second factor (section 6.4). At the
   next sign-in you set up the app again.
3. In an emergency, someone with server access resets the second factor (operations guide,
   §3.9).

This is why the association needs at least two super administrators.
`[PLACEHOLDER: second super administrator — decision 13]`

---

## 2. Roles and what they may do

Each person has exactly one role. It is in the field "Role" under "Users & roles".

### 2.1 The six roles

| Role | In short |
|---|---|
| "Super administrator" | Everything, including accounts and settings |
| "Board administrator" | Association: applications, members, messages, exports; content read only; operations read only; manages content editors and membership managers |
| "Content editor" | Edits and publishes the website's content |
| "Membership manager" | Applications, members, messages, exports |
| "Technical administrator" | Operations, e-mail settings, statistics; no personal data of the association |
| "Read-only auditor" | Reads without personal data: content, operations, statistics, accounts, audit log, export register |

### 2.2 Permissions in detail

From `src/cms/access/permissions.ts`; matches CONTROL-CENTER.md §4. ✓ = allowed.

| Permission | Super administrator | Board | Content editor | Membership manager | Technical | Auditor |
|---|---|---|---|---|---|---|
| "View content (drafts too)" | ✓ | ✓ | ✓ | — | — | ✓ |
| "Edit and publish content" | ✓ | — | ✓ | — | — | — |
| "View applications and messages" / "Process applications and messages" | ✓ | ✓ | — | ✓ | — | — |
| "Delete applications" | ✓ | — | — | — | — | — |
| "Delete messages" | ✓ | ✓ | — | ✓ | — | — |
| "View members" / "Edit members" | ✓ | ✓ | — | ✓ | — | — |
| "Delete members" | ✓ | — | — | — | — | — |
| "Export personal data" | ✓ | ✓ | — | ✓ | — | — |
| "Review the export register" (all exports) | ✓ | ✓ | — | — | — | ✓ |
| "Control Center settings" (also approving processing purposes) | ✓ | — | — | — | — | — |
| "View operations" | ✓ | ✓ | — | — | ✓ | ✓ |
| "Run operations actions" | ✓ | — | — | — | ✓ | — |
| "E-mail settings" | ✓ | — | — | — | ✓ | — |
| "View statistics" | ✓ | ✓ | — | — | ✓ | ✓ |
| "Run jobs manually" | ✓ | — | — | — | ✓ | — |
| "View accounts" | ✓ | ✓ | — | — | — | ✓ |
| "Manage accounts" (all) | ✓ | — | — | — | — | — |
| "Manage editors and membership managers" | — | ✓ | — | — | — | — |
| "View audit log" | all areas | users, content, association | — | — | operations | all areas |

Key rules:

- The technical administrator sees no applications, members or messages. Logs shown to them are
  masked.
- Content editors reach neither operations nor personal data.
- The Control Center has no restore of the live database. **Open (decision 10).**
- Only the role decides who sees applications and messages. An assignment grants no access.

### 2.3 "Restrictions" per person

- In a person's account, single permissions can be taken away under "Restrictions".
- There are never permissions beyond the role.
- Example: a board account without "Export personal data".

### 2.4 What nobody can change for themselves

- their own role,
- their own restrictions,
- their own deactivation,
- deleting their own account.

You manage your own account under "My security".

---

## 3. Confirming with a code

Some actions are sensitive. For them, the Control Center asks once more for a code from your app
("Confirm with a code"). The confirmation is valid for 5 minutes. The audit log then shows
"Confirmed with code".

| Area | Action |
|---|---|
| Your own account | Changing the password; "Create new recovery codes" |
| Other accounts | Creating an account; changing the role, "Restrictions", "Deactivated" or the e-mail address; deleting an account; "Reset two-factor"; "End all sessions" |
| Members | Deleting a member entry or an application; removing contact data in the review after the end |
| Export | Every export of personal data |
| Processing purposes | "Approve", "Retire", "Reopen as draft" |
| E-mail | Saving the e-mail settings |
| Operations | Restarting a service (also type the service's name); "Back up now"; "Test a restore"; running a scheduled task that deletes something by hand |

---

## 4. Website content

For "Content editor" and "Super administrator". "Board administrator" and "Read-only auditor" can
read content.

### 4.1 Basic rules for all content

- **Three languages.** Choose the "Content language" at the top and fill in each language. If a
  language is missing, the website shows the German text.
- **Draft and publish.** Pages, projects, posts and events have drafts. Changes are saved
  automatically every 2 seconds ("Autosave"). They appear on the website only after "Publish" or
  "Publish changes".
- **"Live Preview".** Shows the current draft next to the form, as the website would show it, in
  phone, tablet and desktop sizes. It follows every saved change. Links inside the preview are not
  meant for clicking.
- **"Schedule Publish".** Sets when a draft appears (time zone Europe/Berlin). The publication runs
  only if the person who scheduled it still exists, is active and may edit content at that time.
  Otherwise it is not carried out, and the audit log records the refusal.
- **"Versions".** Up to 50 earlier versions per page, project, post and event. "Restore this
  version" brings one back.
- **No free design.** No free HTML, no own colours, sizes or embeds. Links only to pages of the
  website, custom pages or checked addresses (https, mailto, tel). Every field has a maximum
  length.

### 4.2 "Pages" built from blocks

Menu "Page texts" → "Pages". A page consists of "Blocks"; each block is a section in the design of
the website.

1. Choose "Create New", enter the "Title".
2. "URL slug" (sidebar): the address, the same in all languages (`/<slug>`, `/en/<slug>`,
   `/ar/<slug>`). Lowercase letters, digits and hyphens only. Left empty, it is generated from the
   title. Addresses the website already uses are refused.
3. Under "Content of the page", add blocks. The block menu shows a preview image of each block.
   Drag to change the order.
4. Check with the "Live Preview", then "Publish".

The blocks in the block menu:

| Group | Blocks |
|---|---|
| "Page opening" | "Page header", "Home stage", "Header with image" |
| "Text and images" | "Text", "Cards", "Image and text", "Quote", "Questions and answers", "Gallery", "Statement", "Timeline", "Values", "Journey (scroll scene)" |
| "Calls to action" | "Night band", "Call to action", "Donations" |
| "Content from the CMS" | "Projects", "News", "Upcoming events", "Focus areas", "Statistics", "Board", "Partners" |
| "Forms" | "Membership form", "Contact and form" |

Rules when publishing (`src/cms/blocks/layout-rules.ts`):

- The first block is a page opening ("Page header", "Header with image" or "Home stage"), and
  there is only one.
- The "Home stage" exists only on the home page.
- The two forms stand only on their own pages ("Membership", "Contact"), exactly once there.
- At most 30 blocks per page.
- Drafts are saved without these rules; they are checked when publishing.

**Fixed pages.** "Home page", "About us", "Membership", "Support us" and "Contact" are part of the
fixed structure of the website (field "Fixed page"). Their address stays, their form stays, they
cannot be deleted.

### 4.3 "Search engines & sharing"

On pages, projects, posts and events. Optional; when empty, the title and summary are used.

| Field | Note |
|---|---|
| "Page title" | at most 70 characters |
| "Description" | at most 160 characters |
| "Sharing image" | shown when the page is shared in messengers or social networks; empty: the cover image |
| "Hide from search engines" | The page stays reachable but is left out of search results and the sitemap |

"How the page appears in search engines" shows a preview of the search result while you type.
Until the website launches, no search engine indexes anything.

### 4.4 Further content (menu "Content")

| Menu entry | Good to know |
|---|---|
| "Projects" | "Status" (Planned, Ongoing, Completed), "Start", "End", "Location", "Focus areas", "Cover image", "Description", "Gallery", "Partners". The "Summary" appears in the project list and in search engines |
| "News" (posts) | "Title", "Summary", "Cover image", "Text", "Related projects", "Published on" |
| "Events" | "Starts" and "Ends" in Berlin time; the end cannot be before the start. "Place", optional "Registration link" (checked address). The website generates a calendar file (`.ics`) per event. The default menu does not contain "Events"; add it in "Navigation" when needed |
| "Focus areas" | "Title", "Summary", "Icon", "Order" |
| "Board & team" | "Name", "Position", "Group" (Board, Team), "Photo", "Short bio". **Public only with "Consent to publication has been given"**, plus "Date of consent" |
| "Statistics" | "Label", "Value", "As of", "Show on the home page". "Source (internal)" is not published |
| "Partners" | "Name", "Logo", "Website" (https only), "Short description". **Public only with "The partner agreed to be listed"** |
| "Media" | Section 4.5 |

### 4.5 "Media": images

- Allowed: JPEG, PNG, WebP and AVIF, at most 10 MB. SVG is not allowed.
- On upload, the image is reduced to at most 2560 pixels; metadata such as location (GPS) and
  camera data are removed.
- **"Alt text" is required.** It describes what the image shows, for people who cannot see it.
  Exception: tick "Purely decorative" if the image carries no information; screen readers then
  skip it.
- **Focal point:** set the most important point in the image. Where the website crops an image to
  a frame, this point stays visible. Without one, the centre of the image is used.
- "Caption" and "Image credit" are optional.

### 4.6 Menu "Page texts"

| Menu entry | Good to know |
|---|---|
| "Navigation" | "Menu entries" and "Highlighted button", per language. At most 6 entries, each at most 20 characters, at most 60 characters together, so that the menu fits on one line. Legal notice and privacy policy are always in the footer |
| "Form texts" | Wording of the declarations and consents in the membership application and the contact form. It is stored with every application and message. **Please have changes legally reviewed.** Earlier wordings remain under "Versions" |
| "Legal notice" | The text is supplied by the association (have it legally reviewed). Every wording stays as a version |
| "Privacy policy" | The text is supplied by the association. The field "Version" is stored with every consent given in the forms |
| "Site settings" | "Description for search engines", "Tagline" (under the name, on the home page and in the footer), "Contact details", "Social media links" |
| "Redirects" | Section 4.7 |

The association writes its legal texts itself. This handbook contains none.
`[PLACEHOLDER: who approves the legal notice, the privacy policy and the form texts]`

### 4.7 "Redirects"

Forwards old addresses, e.g. after a page was renamed.

1. "Old address": the path only, with the language if needed (`/old-page`, `/en/old-page`).
2. "New target": a website page, a custom page or an address (URL).
3. "Permanent (for search engines)": search engines take over the new address. Without the tick,
   the redirect is temporary.

Rules: a redirect applies only where there is no page otherwise. Addresses of existing pages and
of the Control Center are refused, and so are loops. Addresses with a file ending (e.g.
`/alt.html`) are not redirected.

**From the statistics:** under "Insights" → "Statistics" there are "Addresses not found". The
button "Create redirect" opens the form with the address already filled in. It appears only for
people who may see statistics **and** edit content; with today's roles, that is the super
administrator.

---

## 5. Members, applications and messages

For "Super administrator", "Board administrator" and "Membership manager". Menu "Association".

### 5.1 "Membership applications"

The list has tabs by stage, with counts: "All open", "Received", "In review", "Consent pending",
"Accepted", "Rejected", "All". There is "Search" (name or e-mail), filters ("Type of membership",
"Assigned to", "Follow-up") and "Sort". On a phone, cards replace the table.

**Workflow** (area "Processing" in the application):

| Stage | Buttons |
|---|---|
| "Received" | "Start review" |
| "In review" | "Accept", "Reject" |
| "Consent pending" | "Reject" only |
| "Rejected" | "Reopen" (back to "In review") |
| "Accepted" | none; the application is locked |

1. **Review:** "Start review".
2. **Under 18:** "Consent pending" is not a status of its own. It means: the person is under 18
   and the date of consent is missing. The association obtains consent from the parent or guardian
   itself; the board decides which form is sufficient. Enter the date under "Consent received on"
   and save. Only then is "Accept" possible.
3. **Accept:** after the confirmation question, the person is entered in the members register
   automatically. The decision is then locked; changes to the membership are made in the members
   register.
4. **Reject:** rejected applications are deleted automatically six months after the decision.
5. **Reply:** applicants get no automatic e-mail. The association replies personally by e-mail.

**Further fields in the sidebar:**

- "Assigned to": one person for the processing. Only people whose role may process applications
  are offered. The person gets a notification. **An assignment grants no access.**
- "Follow up on": on this day the Control Center reminds the person assigned.
- "Internal notes": write down only what is necessary.
- "Decided on" and "Decided by" are set by the system.

**"History":** each application shows who changed what and when (stage from → to, consent,
assignment, follow-up, entry in the members register). Only the server writes it.

Only the super administrator can delete applications, and only with a code from the last five
minutes (section 3).

**Duplicate data after acceptance:** today an accepted application keeps its data next to the
members register entry. A proposal to keep the data only in the register is **switched off. Open
(decision 12).**

### 5.2 "Contact messages"

- "Status": "New", "Answered", "Closed".
- "Assigned to": as for applications; the person is notified.
- Reply by e-mail. The website sends no automatic replies.
- Messages are deleted automatically six months after they arrived.
- Deleting by hand: super administrator, board administrator and membership manager.

The menu shows the number of open applications and new messages.

### 5.3 "Members" (members register)

Separate from the applications. Entries are created when an application is accepted, or with
"Add member" (for earlier members).

- Tabs: "Active", "Ended", "Review due", "All".
- Fields: only the details from the application (name, e-mail, address, type of membership, the
  parent or guardian if under 18 when admitted), plus "Status", "Member since", "Ended on",
  "Entered by" ("Online application" or "By hand").
- "End membership" ends it as of today; "Reactivate" undoes it.
- **No automatic deletion.** The rule is the association's to set. **Open (decision 12).**

**"Review after the end":**

1. After the end, the entry is due for review: at once, or after the number of days in the
   settings (section 6.6). While it is due, the Control Center reminds once a day.
2. Under "What stays?", choose "All details" or "Minimal record only (name, type, dates,
   application); e-mail and address are deleted".
3. "Keep until": a date, at most 30 years ahead.
4. "Reason": "Legal obligation", "Accounting", "Evidence of the association’s decisions" or
   "Other reason" (then an "Explanation" is required, please no further personal data).
5. "Save review". Removing data needs a code; the super administrators are informed. An entry
   reduced this way cannot be reactivated.
6. On the chosen date the entry is due again.

If nothing is needed any more, a super administrator can delete the entry (with a code; the other
super administrators are informed).

### 5.4 Export of personal data

**Open.** Exports stay switched off in production until the association has decided its
processing purposes and their legal bases (CONTROL-CENTER.md §16). Without an approved purpose no
export is possible; the screen says so.

**Preparation by the super administrator:**

1. "Legal bases": the six legal bases of Art. 6(1) GDPR with an explanation. They cannot be
   deleted, only switched off with "Can be chosen for processing purposes". Their wording is to be
   compared with the official text before production (CONTROL-CENTER.md §16).
2. "Processing purposes": per purpose "Name", "Description", "Data" (membership applications or
   members), "Legal basis", "Why does this legal basis fit?" (at least 20 characters) and "Allowed
   columns".
3. After the association's decision: "Approve" with "Decision of the association" (e.g. date and
   item of the board decision) and a code.
4. Changing the data, legal basis, reasons or columns takes an approved purpose back to draft.
   "Retire" ends exports for a purpose; earlier exports stay in the register.

**Export (menu "Association" → "Export"):**

1. Choose the "Data".
2. Choose the "Processing purpose". Its legal basis, "The association’s reasons" and "Decision"
   appear.
3. "Columns": only those the purpose allows. Untick what you do not need.
4. "Selection": which entries.
5. "Specific occasion": what exactly it is for now, 10 to 300 characters, **no names**.
6. "Separator": "Semicolon – Excel in German, LibreOffice" or "Comma – Excel in English".
7. Tick the confirmation and choose "Download CSV". The Control Center asks for a code.

What happens then:

- The file is not kept on the server.
- The export is in the "Export register": person, time, data, purpose, legal basis, columns,
  number of rows, occasion. No personal data of members or applicants. The register cannot be
  changed or deleted.
- Super administrators, board administrators and auditors see all exports and are notified of
  each. Everyone else sees their own.
- Not tested yet: opening the CSV file in Microsoft Excel (CONTROL-CENTER.md §16).

### 5.5 "Notifications" and reminders

The bell at the top shows unread notices; "All notifications" opens the list. Notices contain
**no personal data**, only the kind, a number (e.g. "Application #12") and a link.

| Notice | Who gets it |
|---|---|
| "New membership application", "New contact message" | Everyone who sees applications and messages |
| "An application was assigned to you", "A message was assigned to you" | The person assigned |
| "Follow-up due", "Application waiting to be processed", "Consent still pending" | The person assigned, otherwise everyone who processes applications |
| "A former member is due for review" | Everyone who edits members |
| "New export in the register" | Everyone who reviews the export register (not the person exporting) |
| "A member entry was deleted", "Contact data of a former member removed" | The other super administrators |
| "Sign-in from a new device" | The account itself |
| Operations warnings and "E-mail delivery failed" | Section 8 |

**Daily reminders:** a job creates them once a day (06:00). A reminder is not repeated while the
previous one is unread. The super administrator sets the periods under "Security" → "Settings"
(section 6.6).

Read notices are deleted after 30 days, unread ones after 90 days.

In addition, new applications and messages send an e-mail without personal data to the
notification address (section 8.3). **Open (decision 17):** which addresses receive
notifications.

---

## 6. User accounts

Menu "Security" → "Users & roles".

### 6.1 Who may manage whom

| Role | May |
|---|---|
| "Super administrator" | Create, change, deactivate and delete every other account |
| "Board administrator" | Create, change and deactivate accounts of "Content editor" and "Membership manager" only |
| "Read-only auditor" | View accounts |
| Everyone else | Only their own account ("My security") |

There is no self sign-up, also not for the first account. The technical administrator creates the
first account on the server (operations guide, §3.6).

Real accounts are created only after the association has named the people. There are no test
accounts with admin rights in production (CONTROL-CENTER.md §14).

### 6.2 Creating an account

1. "Users & roles" → "Create New".
2. "Name", e-mail address, "Role", "Restrictions" if needed, an initial password (at least 12
   characters).
3. "Save"; the Control Center asks for a code.
4. Hand the initial password to the person in a safe way.
   `[PLACEHOLDER: how initial passwords are handed over]`
5. The person signs in, sets up the app (section 1.3) and changes the password.

The list shows in "Two-factor" whether the set-up is still pending. The dashboard counts accounts
"without two-factor (set-up pending)".

After an account is created, nobody sets its password any more. Someone who forgot their password
uses "Forgot password?".

### 6.3 Changing, deactivating, deleting

- Changing the role, "Restrictions", "Deactivated" or the e-mail address needs a code.
- "Deactivated": the person can no longer sign in; all sessions end at once.
- Deleting: super administrator only, with a code.

### 6.4 Resetting someone's second factor

In the person's account, area "Security of this account":

1. Choose "Reset two-factor" and confirm. The Control Center asks for a code.
2. All the person's sessions end. They get an e-mail and set up the app again at the next sign-in.
   Their permissions stay the same.

Who may: the super administrator for every other account, the board administrator only for
"Content editor" and "Membership manager". Nobody for themselves.

"End all sessions" (same area, with a code) signs the person out everywhere.

### 6.5 Protection of the last super administrator

The last active super administrator cannot be demoted, deactivated or deleted. The database checks
this too. The association needs at least two super administrators.

### 6.6 "Settings" (super administrator)

Menu "Security" → "Settings", group "Reminders":

| Field | Default | Range |
|---|---|---|
| "Application untouched after (days)" | 7 | 1–90 |
| "Consent pending after (days)" | 14 | 1–180 |
| "Review after a membership ends (days)" | 0 (at once) | 0–365 |

Changes are recorded in the audit log.

---

## 7. Audit log

Menu "Security" → "Audit log". Entries cannot be edited or deleted.

**What is recorded:** time, person (account id, name, role), "Area", "Action", "Object" (type, id
and, for content and accounts, the title or name), "Result" ("Succeeded", "Denied", "Failed"),
"Confirmed with code" and small "Details" (e.g. names of changed fields, old and new status).

**What is not recorded:** IP addresses and contents of forms or messages.

**Who sees which areas:**

| Role | Areas |
|---|---|
| "Super administrator", "Read-only auditor" | all: "Sign-in & security", "Users & roles", "Content", "Association", "Operations" |
| "Board administrator" | "Users & roles", "Content", "Association" |
| "Technical administrator" | "Operations" |
| "Content editor", "Membership manager" | no audit log; their own security events under "My security" |

The dashboard shows entries from your areas under "Recent activity".

Retention: 12 months (decided on 2026-10-20 as the initial setting; its legal adequacy is to be
reviewed before production). A nightly job deletes older entries.

---

## 8. Operations, e-mail and statistics

These screens are mainly for the technical administrator. For everyone else: look, and report
warnings. Technical procedures: [OPERATIONS.md](OPERATIONS.md).

`[PLACEHOLDER: technical contact person and how to reach them]`

### 8.1 Menu "Operations"

| Screen | What you see | Who |
|---|---|---|
| "Services & status" | Whether all services run, the server's load, the release, scheduled tasks. "Reachability from outside" is not set up (**Open, decision 8**) | Read: super administrator, board, technical administrator, auditor. Restart: super administrator, technical administrator |
| "Backups" | Last backup and last restore drill, schedule, history. "Back up now" and "Test a restore" (with a code). The live database deliberately cannot be restored here (**Open, decision 10**) | as above |
| "Logs" | The last lines of a service, masked. Every view is in the audit log | as above, read |
| "Domains & TLS" | The certificates of the website and the Control Center | as above, read |
| "E-mail" | Section 8.3 | super administrator, technical administrator |

**What to watch:** the dashboard shows running services, the last backup and the certificates.
Warnings go to the bell of those who may run operations actions: "Operations agent not
answering", "Service not running", "Backup failed", "No backup for more than 26 hours", "Restore
drill failed", "Restart failed", "TLS certificate expiring or invalid", "Disk almost full". The
same warning comes at most once a day. Report such warnings to the technical contact.

### 8.2 "Insights" → "Statistics"

For super administrator, board, technical administrator and auditor.

- Counted from the server logs: no cookies, no tracking script, no IP addresses stored.
- "Page views" and "Visits" for 7, 30 or 90 days. A visit is an entry from outside (search engine,
  link, direct). Someone who comes twice counts twice.
- "Most visited pages", "Languages" (the language version opened), "Sources" (the domain only).
- "Addresses not found" with "Create redirect" (section 4.7) and "Server errors" with "Open logs".
- "Uptime": not set up (**Open, decision 8**).
- The numbers appear from the first complete hour after the website runs on the server.

### 8.3 "E-mail"

For super administrator and technical administrator ("E-mail settings").

- "Edit settings": mail server, port, user name, sender, the address for "Notifications" and the
  address for "Technical warnings". Saving needs a code. Empty fields use the server settings.
  The mail server password is kept on the server only.
- "Test e-mail to me": goes only to your own address, at most five per hour.
- "Delivery log": no subject or content, recipient shortened, 90 days.
- A failed delivery is reported in the bell ("E-mail delivery failed"), once a day.
- Without a mail server nothing is sent; notices then appear in the bell only.

**Open (decision 5):** mail provider, sender address.
`[PLACEHOLDER: mail provider and sender address]`

---

## 9. Data protection in daily work

Facts from docs/privacy-notes.md and CONTROL-CENTER.md. This handbook does not set or change any
retention period.

### 9.1 Rules for daily work

- **Write down only what is necessary.** This applies to "Internal notes", the "Specific occasion"
  of an export (no names) and the "Explanation" in a review (no further personal data).
- **Notifications contain no personal data.** The details are in the linked entry, which only
  authorised people can open.
- **Exports only with an approved purpose**, a specific occasion and a code. Every export is in
  the export register. The file is then with you: keep it safe.
  `[PLACEHOLDER: the association's rule for handling exported files]`
- **Team and partners** appear on the website only with consent (section 4.4).
- **Form texts and legal texts** come from the association; have changes legally reviewed.
- **An assignment grants no access.** Only the role decides who sees personal data.

### 9.2 Retention as documented

"Proposal" means not yet decided by the association.

| Data | Retention |
|---|---|
| Contact messages | Six months after arrival, then deleted automatically |
| Rejected applications | Six months after the decision, then deleted automatically |
| Accepted and open applications | Not deleted automatically; what happens to accepted applications is **open (decision 12)** |
| Members register | No automatic deletion; a person reviews the entry after the end |
| Audit log and export register | 12 months (initial setting, legal review before production) |
| Ended sign-in records | 30 days |
| Notifications | Read 30 days, unread 90 days |
| E-mail delivery log | 90 days (proposal) |
| Visitor statistics | 13 months (proposal), counts only |
| Web server access logs | 7 days (proposal, decision 7) |
| Backups | Proposal: 7 daily, 4 weekly, 6 monthly (decision 9). Data deleted in the live database remain in backups until they expire (up to about six months) |

---

## 10. Help and contact

`[PLACEHOLDER: who helps with questions about the Control Center and how to reach them]`

- Questions about content: `[PLACEHOLDER: content contact]`
- Questions about membership and data protection: `[PLACEHOLDER: board contact]`
- Technical problems and warnings: `[PLACEHOLDER: technical contact]`
- Lost phone: section 1.6.
