# Ideathon 60 — registration site

A static site for running a **one-hour ideathon**: team registration that produces a
spreadsheet, a published role book, the minute-by-minute split of the hour, and an AI policy
that says exactly which phases AI tools are allowed in.

No build step, no dependencies, no CDN, no backend. Open `index.html` and it works.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Format, the seven-block schedule, role summary, AI policy, pod planner |
| `rolebook.html` | The role book: per role — owns, delivers, failure modes, minute-by-minute. Print-friendly |
| `register.html` | Registration: branch of study, team name, member count, member names |
| `organiser.html` | Master sheet: every team on this device, import/merge, Excel + CSV export |

| Script | What it does |
| --- | --- |
| `assets/js/data.js` | **All event content** — schedule, roles, branches, AI policy, config |
| `assets/js/xlsx.js` | Minimal `.xlsx` writer and reader (a ZIP of XML parts, written by hand) |
| `assets/js/registry.js` | The registration record: columns, storage, CSV, spreadsheet, import/merge |
| `assets/js/register.js` | The form |
| `assets/js/organiser.js` | The organiser view |
| `assets/js/site.js` | Renders the schedule, role cards, role book, pod planner |

## What registration collects

Four fields, nothing else:

1. **Branch of study** — dropdown: Mechatronics, Mechanical Engineering, CSE A, CSE B, EEE, ECE
2. **Team name**
3. **Number of team members** — 1 to 3
4. **Member names** — one box per member, appearing to match the count

Submitting saves the team on that device and downloads a real `.xlsx` of the entry. The
sheet has one row per team:

| Reference | Registered at | Branch of study | Team name | Members | Member 1 | Member 2 | Member 3 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ID60-NIG-6536 | 2026-09-12 10:51 | CSE B | Night Owls | 2 | Asha Menon | Bilal Rao | |

The form rejects a blank name, two members with the same name, and a team name already
registered on that device.

## How the spreadsheet actually reaches you

A web page in someone's browser cannot write to a file on your machine. That constrains the
workflow, so pick one of these deliberately:

**One registration desk (simplest, recommended).** Put `register.html` on one laptop and
register every team on it. Everything accumulates in that browser. Open `organiser.html`,
hit *Download master (Excel)*, and you have the whole event in one sheet.

**Teams register on their own phones.** Each team's entry is stored on *their* phone and
their `.xlsx` downloads to *their* device. They have to send you that file. Collect the
files, open `organiser.html`, and *Import team files* — drop in any number of `.xlsx` or
`.csv` files at once (or drag them anywhere on the page). Duplicates are skipped on both
reference and team name, so re-importing the same file is harmless.

**You want a real central database.** Neither of the above is that. Use a Google Form, or
put a small backend behind the form — `registry.js` already has one clean seam for it
(`add()`), so posting to a server is a few lines.

### Organiser page

- Live counts: teams, participants, branches represented, pitch pods needed.
- The master table, plus a per-branch breakdown.
- *Download master* as `.xlsx` or `.csv`.
- *Clear this device* — confirms first, cannot be undone.

Two limits worth knowing:

- The list lives in **that browser on that device**. Clearing site data wipes it. Download
  the master sheet after every import.
- A `.xlsx` that has been opened and re-saved by Excel is DEFLATE-compressed, and the
  importer (which only reads STORED entries) refuses it with a clear message. Export that
  file to CSV and import the CSV.

## Running it

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening the files directly (`file://`) works too — nothing is fetched.

## Deploying

Static files, so any host works:

- **GitHub Pages** — *Settings → Pages → Deploy from a branch*, pick the branch and `/ (root)`.
- **Netlify / Vercel / Cloudflare Pages** — no build command, publish directory `.`.

`organiser.html` is marked `noindex`, but it is **not** protected — anyone with the URL can
open it. It only ever shows data held in their own browser, so there is nothing of yours to
leak, but do not treat it as an admin login.

## Configuring the event

Everything lives at the top of `assets/js/data.js`:

```js
var config = { name, date, venue, contactEmail, maxTeamSize, minTeamSize, totalMinutes,
               pitchBlockMinutes, pitchMinutesPerTeam, qaMinutesPerTeam };
var branches = ['Mechatronics', 'Mechanical Engineering', 'CSE A', 'CSE B', 'EEE', 'ECE'];
```

The schedule, roles, team-size fallbacks and AI policy text are plain arrays in the same
file. Editing a branch name or adding one updates the form immediately.

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
- **Registration collects no contact details.** By design — but it means you cannot reach a
  team after they register. If you need that, add an email column as described above.
- **AI is allowed in Discover, Design and Deck; closed in Decide and the pitch.** That split
  is the only reason the judging means anything.

## Responsive and accessible

Verified at 320, 360, 390, 768, 1024 and 1440 px: no page scrolls horizontally and no
element exceeds the viewport. Tables collapse into labelled cards below 720 px rather than
scrolling sideways. All form controls are at least 40 px tall on a phone.

Semantic landmarks, labelled inputs, `aria-invalid` with inline error text, a skip link,
visible focus rings, `aria-live` status messages, and a `prefers-reduced-motion` opt-out.
Plain ES5, so anything from the last decade renders it.
