# Ideathon 60 — registration site

A static site for running a **one-hour ideathon**: registration for teams of up to three,
a published role book, the minute-by-minute split of the hour, and an AI policy that says
exactly which phases AI tools are allowed in.

No build step, no dependencies, no framework. Open `index.html` and it works.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | Format, the seven-block schedule, role summary, AI policy, pod planner |
| `rolebook.html` | The role book: per role — owns, delivers, failure modes, minute-by-minute. Print-friendly |
| `register.html` | Team registration form (1–3 members, one role each, AI declaration) |
| `assets/js/data.js` | **All event content lives here** — schedule, roles, themes, AI policy, config |
| `assets/js/site.js` | Renders the schedule, role cards, role book and pod planner |
| `assets/js/register.js` | Form building, validation, submission, organiser CSV export |

## Running it

```bash
python3 -m http.server 8000     # then open http://localhost:8000
```

Opening the files directly (`file://`) also works — there is no fetch of local assets.

## Deploying

It is a folder of static files. Any host will do:

- **GitHub Pages** — repository *Settings → Pages → Deploy from a branch*, pick the branch and `/ (root)`.
- **Netlify / Vercel / Cloudflare Pages** — drop the folder in; no build command, publish directory `.`.

## Configuring the event

Everything an organiser needs to change is at the top of `assets/js/data.js`:

```js
var config = {
  name: 'Ideathon 60',
  date: 'TBA',            // e.g. '12 October 2026'
  venue: 'TBA',
  contactEmail: '',       // appears in the footer when set
  maxTeamSize: 3,
  endpoint: '',           // see "Collecting registrations" below
  ...
};
```

The schedule, the three roles, the AI policy text, the theme list and the AI tool list are
all plain arrays in the same file. Edit them and every page updates — nothing is hard-coded
in the HTML.

If you change the schedule, keep the phases contiguous and summing to `totalMinutes`:

```bash
node -e "global.window={};require('./assets/js/data.js');
console.log(window.IDEATHON.schedule.reduce((a,p)=>a+p.minutes,0))"   # should print 60
```

## Collecting registrations

The form works in two modes.

### Local mode (default, `endpoint: ''`)

Submissions are stored in the submitting browser's `localStorage` and the team can download
their own entry as JSON. **This is fine for a demo and not fine for a real event** — entries
live only on the device that made them. Wire up an endpoint before you open registration.

For a small event you can still collect on one machine (a laptop at a registration desk).
Open the browser console on `register.html`:

```js
IdeathonAdmin.list()         // all entries on this device
IdeathonAdmin.csv()          // one CSV row per member
IdeathonAdmin.downloadCsv()  // download that CSV
IdeathonAdmin.clear()        // wipe local entries
```

### Endpoint mode (recommended)

Set `config.endpoint` to a URL that accepts `POST` with a JSON body. Anything that speaks
HTTP works — Formspree, Google Apps Script bound to a Sheet, an Airtable proxy, a serverless
function. The payload is:

```json
{
  "ref": "ID60-NIG-4821",
  "submittedAt": "2026-09-12T10:14:02.913Z",
  "teamName": "Night Owls",
  "institution": "Example College",
  "theme": "Accessibility",
  "teamSize": 3,
  "members": [
    { "position": 1, "isLead": true, "name": "…", "email": "…",
      "phone": "…", "course": "…", "roleId": "lead", "role": "Team Lead & Pitcher" }
  ],
  "aiTools": ["Claude", "Canva AI"],
  "agreements": { "teamSize": true, "clock": true, "aiPolicy": true, "noPriorWork": true }
}
```

A non-2xx response surfaces an error to the team and keeps the form filled in, so nobody
loses their entry to a flaky network.

Two things the endpoint must do, because the browser cannot:

- **Reject duplicate team names.** The client only detects duplicates submitted from the
  same device — it has no idea what other people have registered.
- **Enforce the cap.** Client-side validation is a convenience, not a gate. Re-check
  `teamSize <= 3` and role uniqueness server-side.

Also allow CORS from wherever the site is hosted, or the POST fails silently for the team.

## Things worth knowing before you run this

- **The pitch block is the capacity limit.** Twelve minutes at 2 min pitch + 1 min Q&A fits
  four teams. Beyond that you need parallel pods with a judge each — the planner on the
  schedule section works out how many. Nothing else in the format scales badly; this does.
- **The cap of three is load-bearing.** The five-minute Decide block does not survive a
  fourth opinion. If you raise `maxTeamSize`, lengthen that block too.
- **AI is allowed in Discover, Design and Deck; closed in Decide and the pitch.** That
  split is the only reason the judging means anything — if a model picks the idea and
  answers the questions, the judges are marking the model.
- **Disclosure is enforced by asking twice** — once on the registration form, once on the
  final slide. Neither is verifiable, both raise the cost of lying.

## Accessibility and browser support

Semantic landmarks, labelled inputs, `aria-invalid` and inline error text on failed
validation, a skip link, visible focus rings, and a `prefers-reduced-motion` opt-out.
Plain ES5 with no build step, so anything from the last decade renders it.
