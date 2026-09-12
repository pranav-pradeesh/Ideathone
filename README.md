# Ideathon 60 — registration site

A site for running a **one-hour ideathon**: team registration that collects into one
spreadsheet, a password-protected admin page, a published rule book, the minute-by-minute
split of the hour, and an AI policy that says exactly which phases AI tools are allowed in.

The front end is plain HTML, CSS and ES5 — no build step, no framework, no CDN. The only
dependency in the whole project is the Postgres driver used by the API.

**Deploying it: see [DEPLOY.md](DEPLOY.md).**

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Format, the seven-block schedule, role summary, AI policy, pod planner |
| `rulebook.html` | The rule book: per role — owns, delivers, failure modes, minute-by-minute. Print-friendly |
| `register.html` | Registration: branch, team name, member count, each member's name and phone |
| `admin.html` | **Password-protected.** Every team from the database, Excel + CSV export |
| `organiser.html` | Offline fallback: teams held on this device, import/merge, export |

| API route | What it does |
| --- | --- |
| `POST /api/register` | Public. Validates and stores one team |
| `GET/POST /api/admin/login` | Session status; exchanges the password for a session cookie |
| `POST /api/admin/logout` | Clears the session |
| `GET/DELETE /api/admin/registrations` | Signed-in only: read every team, or remove one |

| Script | What it does |
| --- | --- |
| `assets/js/data.js` | **All event content** — schedule, roles, branches, AI policy, config |
| `assets/js/xlsx.js` | Minimal `.xlsx` writer and reader (a ZIP of XML parts, written by hand) |
| `assets/js/registry.js` | The registration record: columns, storage, CSV, spreadsheet, import/merge |
| `assets/js/register.js` | The form |
| `assets/js/admin.js` | The admin view |
| `assets/js/organiser.js` | The offline organiser view |
| `api/_lib/auth.js` | Password check, signed session cookies, the admin guard |
| `api/_lib/db.js` | Postgres connection, schema, row mapping |
| `api/_lib/validate.js` | Server-side validation — the rules that actually hold |
| `api/_lib/rate.js` | Rate limiting, stored in the database so it survives cold starts |
| `assets/js/site.js` | Renders the schedule, role cards, rule book, pod planner |

## What registration collects

1. **Team name**
2. **Number of team members** — 1 to 3
3. **For each member: full name, branch of study, 10-digit mobile number** — blocks appear to
   match the count

Branch belongs to the **member**, not the team: a team can mix branches freely
(Mechatronics, Mechanical Engineering, CSE A, CSE B, CSE AI/ML, EEE, ECE).

One team is one row, thirteen columns:

| Reference | Registered at | Team name | Members | Member 1 name | Member 1 branch | Member 1 phone | … |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ID60-NIG-6536 | 2026-09-12 10:51 | Night Owls | 2 | Asha Menon | CSE AI/ML | 9876543210 | … |

Phone numbers are normalised to ten digits — `+91 98765 43210`, `098765 43210` and
`9876543210` all store identically — and written to the sheet as text so Excel cannot eat a
leading zero.

Rejected on both the client and the server: a blank name, a member with no branch, two
members sharing a name or a number, a phone that is not ten digits, an unknown branch, more
than three members, and a team name somebody has already used. The browser checks are a courtesy; `api/_lib/validate.js`
is the gate, because anything can POST to the endpoint.

There is a honeypot field for bots, and a limit of 12 registrations per hour per client.

## How the sheet reaches you

**With the database connected (the normal case).** Every registration goes straight to
Postgres, wherever it was submitted from. Open `/admin.html`, sign in, hit *Download Excel*.
That is the whole workflow — nobody has to send you anything.

**Without a database.** The form notices the API is unavailable — no database configured, no
network, or the page opened from disk — and keeps the entry on the device instead of losing
it. It says so plainly, and downloads the team's `.xlsx` so it can be emailed in. Collect
those files and merge them on `/organiser.html`, which deduplicates on reference and team
name. This is also the honest fallback if the venue Wi-Fi dies mid-event.

### Offline organiser page (`/organiser.html`)

- Live counts: teams, participants, branches represented, pitch pods needed.
- The master table, plus a per-branch breakdown.
- *Download master* as `.xlsx` or `.csv`.
- *Clear this device* — confirms first, cannot be undone.

Two limits worth knowing:

- It shows only what is in **that browser on that device** — it does not read the database.
  That is `/admin.html`'s job.
- A `.xlsx` that has been opened and re-saved by Excel is DEFLATE-compressed, and the
  importer (which only reads STORED entries) refuses it with a clear message. Export that
  file to CSV and import the CSV.

## Running it

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening the files directly (`file://`) works too — nothing is fetched.

## Deploying

See **[DEPLOY.md](DEPLOY.md)** — import the repo into Vercel, add a Neon Postgres store,
set `ADMIN_PASSWORD`, redeploy.

Without the API (plain static hosting, or opening the files directly) every page still
works; registrations stay on the device and `/organiser.html` is the collection point.

## Configuring the event

Everything lives at the top of `assets/js/data.js`:

```js
var config = { name, date, venue, contactEmail, maxTeamSize, minTeamSize, totalMinutes,
               pitchBlockMinutes, pitchMinutesPerTeam, qaMinutesPerTeam };
var branches = ['Mechatronics', 'Mechanical Engineering', 'CSE A', 'CSE B', 'CSE AI/ML', 'EEE', 'ECE'];
```

The schedule, roles, team-size fallbacks and AI policy text are plain arrays in the same
file. Editing a branch name or adding one updates the form immediately — **and must be
mirrored in `BRANCHES` in `api/_lib/validate.js`**, which is what the server enforces. A
test asserts the two lists are identical, because if they drift, that branch's
registrations are rejected with "Unknown branch of study" and nobody notices until the
day.

Adding a column to the spreadsheet (a contact email, say) means adding one entry to
`COLUMNS` in `registry.js` and one field in `register.html` — the CSV, the `.xlsx`, the
organiser table and the importer all follow from that list.

If you change the schedule, keep the phases contiguous and summing to `totalMinutes`:

```bash
node -e "global.window={};require('./assets/js/data.js');
console.log(window.IDEATHON.schedule.reduce((a,p)=>a+p.minutes,0))"   # should print 60
```

## Things worth knowing before you run this

- **The pitch block is the capacity limit.** Twelve minutes at 2 min pitch + 1 min Q&A fits
  four teams. Beyond that you need parallel pods with a judge each — the planner on the
  schedule section, and the counter on the organiser page, both work it out.
- **The cap of three is load-bearing.** The five-minute Decide block does not survive a
  fourth opinion. If you raise `maxTeamSize`, lengthen that block and add a `Member 4`
  column to `COLUMNS`.
- **You are holding personal data.** Names and phone numbers of students. Collect it for
  the event, download what you need, and drop the database afterwards.
- **One shared admin password, no individual accounts.** Anyone who has it can see and
  export every participant's contact details. Don't put it in a group chat, and never
  commit it — this repository is public, and a committed secret stays in the history.
- **AI is allowed in Discover, Design and Deck; closed in Decide and the pitch.** That split
  is the only reason the judging means anything.

## Branding

The site carries NCERC and Nehru Group branding: the college crest in the header and hero,
the group lockup in the footer (`assets/img/`), and a palette taken from the marks
themselves — navy `#202080`, cyan `#00a0e0`, gold `#c0a060`.

Of those, only the navy passes WCAG AA as text, so it carries the buttons, links and
accents; the cyan and gold appear as fills, markers and the hairline under the header, never
as small type. Host names live in `config` in `data.js`.

The site is **light only**. `color-scheme: light` on `:root` keeps native controls — select
menus, scrollbars, autofill — light for a visitor whose phone is set to dark mode; without
it those controls render dark against the light page.

## Responsive and accessible

Verified at 320, 360, 390, 768, 1024 and 1440 px across all five pages: no page scrolls
horizontally and no element exceeds the viewport. Tables collapse into labelled cards below
900 px rather than scrolling sideways, and above that a hint appears only when a table
genuinely does scroll. All form controls are at least 40 px tall on a phone.

Semantic landmarks, labelled inputs, `aria-invalid` with inline error text, a skip link,
visible focus rings, `aria-live` status messages, and a `prefers-reduced-motion` opt-out.
An audit script checks every text/background pair on every page against WCAG AA — including
translucent panels, which it composites — and flags any text under 12px. It currently
reports zero.
Plain ES5, so anything from the last decade renders it.

## Tests

The suites live outside the repo (they need a browser and an in-process Postgres), but this
is what was run against this code:

| Suite | Covers |
| --- | --- |
| Sync | The client and server branch lists are identical, the team caps match, the schedule is contiguous and sums to 60, and the judging marks sum to 100 |
| Mixed branch | A team of three from three different branches registers end to end; a member left without a branch is blocked; the admin breakdown counts people rather than teams |
| Migrate | The guarded migration on a database created before branch moved to the member: a new insert fails against the old NOT NULL column, the migration frees it, existing rows survive, and it is a no-op on a fresh database |
| Schema | The exact DDL and every query, executed on a real Postgres engine: idempotent DDL, the unique index rejecting `  night owls  ` against `Night Owls`, jsonb round-trip, rate-window arithmetic |
| Auth | Password check, token signing and verification, tampered/expired/forged tokens, the guard's 401 and 503 paths, cookie flags, password rotation invalidating sessions, opaque client hashing |
| API | The real handlers end to end: 201/400/409/429/405 paths, honeypot, server-side cap and branch enforcement, admin endpoints refusing forged cookies, login lockout, logout |
| UI | The form against a live API, the admin sign-in boundary, the spreadsheet download, and the `hidden` attribute actually hiding things |
| Offline | Registration, download, CSV/xlsx round-trip and organiser merge with no API at all |
| Menu | The mobile menu: open, close, second tap, Escape with focus return, tap-outside, link navigation, the 720px boundary, and that widening the window does not leave it open |
| Responsive | Five pages × six viewport widths, plus tap-target heights |
| Contrast | Every text/background pair on every page against WCAG AA, compositing translucent panels, plus a 12px floor on text size |
| Type | The heading scale stays strictly descending, and no heading, legend, tagline or lede overflows its box, across five pages at five widths |
| Light-only | With the browser emulating a dark-mode system, every page still renders dark text on a light ground and reports `color-scheme: light` |
