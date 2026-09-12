# Deploying to Vercel

Three steps. Budget ten minutes for the first one.

---

## 1. Import the repository

[vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select this
repository.

### Every setting on the import screen

| Setting | Value | Why |
| --- | --- | --- |
| **Framework Preset** | **Other** | There is no framework. `vercel.json` sets `"framework": null`, so this is applied for you even if the dashboard guesses something else. |
| **Root Directory** | `./` (leave as is) | Everything is at the repo root. |
| **Build Command** | **empty**, Override **off** | Nothing to build. The HTML, CSS and JS ship as written. |
| **Output Directory** | **empty**, Override **off** | With no build, Vercel serves the repo root. Do not type `public` or `dist` — neither exists, and the deploy will fail or serve nothing. |
| **Install Command** | **empty**, Override **off** (runs `npm install`) | This must run. It installs `@neondatabase/serverless` for the API routes. |
| **Node.js Version** | **22.x** | Set in `package.json` (`engines.node`). Leave the dashboard default alone. |
| **Environment Variables** | add `ADMIN_PASSWORD` now if you like | You can also add it after the first deploy — see step 3. |

Then **Deploy**.

### What you should see

The build log ends with something like `Build Completed` after an install step and no
build step. Under **Functions** you should see four:

```
/api/register
/api/admin/login
/api/admin/logout
/api/admin/registrations
```

If that list is empty, the API did not deploy — check that `api/` is at the repo root and
the Root Directory setting is `./`.

The site works immediately, but registrations will not be saved anywhere yet: the form
falls back to storing entries on the device and says so on the confirmation screen. Step 2
fixes that.

### Settings you do not need to touch

Ignore anything about Framework Settings, Build & Development overrides, Serverless
Function Region (the default is fine — put it near your venue if you like), Deployment
Protection (leave **off**, or the public registration page will ask visitors to log in),
and Fluid Compute. `vercel.json` already pins the URL behaviour (`cleanUrls`,
`trailingSlash`) and security headers.

> **Do not enable Deployment Protection / Vercel Authentication** on Production. It puts a
> Vercel login in front of the whole site, including `/register`. The admin area has its
> own password; the rest is meant to be public.

## 2. Add the database

In your project → **Storage** → **Create Database** → **Neon (Postgres)** → accept the free
plan → **Connect** to this project.

Vercel injects `DATABASE_URL` and friends automatically. The tables are created on first
use, so there is no migration to run.

Two things that catch people out here:

- **A variable prefix is fine.** The connect dialog offers one; setting it to `storage`
  produces `storage_DATABASE_URL` instead of `DATABASE_URL`. The code handles any prefix —
  it ranks every variable holding a `postgres://` URL and takes the pooled one, ignoring
  the `_NO_SSL` and unpooled variants Neon also sets — but only after a redeploy.
- **Do not hand-create `DATABASE_URL` as a placeholder.** An empty or dummy value is
  ignored rather than shadowing the real one, but it makes the variable list confusing.
- **Redeploy after connecting.** An existing deployment does not pick up new variables.

If `/admin` still says no database is configured, sign in: the page lists exactly which
variable names the server checked and which database-related variables are present on the
deployment. Names only — no values are ever shown.

> Any Postgres connection string works. The code reads the first of `DATABASE_URL`,
> `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`.

---

## 3. Set the admin password

Project → **Settings** → **Environment Variables**.

| Name | Value | Environments | Required |
| --- | --- | --- | --- |
| `ADMIN_PASSWORD` | a long passphrase you have not used elsewhere | Production, Preview, Development | **Yes** — without it nobody can sign in to the admin area |
| `DATABASE_URL` | *(added for you by the Neon integration)* | all | **Yes** — added in step 2, do not set by hand |
| `ADMIN_SESSION_SECRET` | 32+ random characters | all | No. Signs sessions with a key separate from the password, so changing the password does not sign everyone out. |
| `EVENT_TIMEZONE` | e.g. `Asia/Kolkata` | all | No. Timezone for the timestamps in the sheet. Defaults to `Asia/Kolkata`. |

### Setting it from the dashboard

1. Project → **Settings** → **Environment Variables**
2. Key: `ADMIN_PASSWORD`
3. Value: your password
4. Tick **Production**, **Preview** and **Development**
5. **Save**

### Or from the CLI

```bash
vercel link                       # once, in the project directory
vercel env add ADMIN_PASSWORD production    # paste the password when prompted
vercel env add ADMIN_PASSWORD preview
vercel env add ADMIN_PASSWORD development
vercel --prod                     # redeploy so the variable takes effect
```

### The password never goes in this repository

It lives only in Vercel's environment variables. This repository is public: anything
committed to it — including a password in a config file, a comment, or a commit message —
is readable by anyone, forever, even after it is deleted in a later commit. `.env` and
`.env.local` are gitignored for the same reason. `.env.example` holds placeholders only.

If a password does end up committed, rotating it in Vercel is the fix; deleting the file is
not, because the old commit still has it.

Generating a stronger one, if you want:

```bash
openssl rand -base64 24
```

**Then redeploy** — Deployments → the latest one → ⋯ → **Redeploy**. Vercel does not apply
new environment variables to a deployment that already exists. This is the single most
common reason "it still says no password is set".

---

## Which build is live?

Open this in a browser — no sign-in needed:

```
https://<your-site>.vercel.app/api/admin/login
```

```json
{"ok":true,"authed":false,"configured":true,"database":true,
 "build":{"commit":"00b59f1","branch":"main","env":"production"}}
```

- `build.commit` is the commit currently serving. Compare it with the newest commit on
  `main`; if it is behind, the site is showing old content and old behaviour.
- `database` says whether the running build can see a database.
- `configured` says whether `ADMIN_PASSWORD` is set.

A change that "did not apply" — the rule book still saying something you removed, the admin
page reporting no database — is almost always this: the deployment predates the change.
**Redeploy**, then check the commit again.

---

## Check it worked

1. Open `/register` and register a test team.
   - Confirmation reads **"The organisers have your registration"** → database connected.
   - Confirmation reads **"Saved on this device only"** → it is not. Check `DATABASE_URL`
     exists and that you redeployed.
2. Open `/admin`. You should get a password prompt, not a table.
   - "No ADMIN_PASSWORD is set on this deployment" → step 3, then redeploy.
3. Sign in. The test team should be listed with its phone numbers.
4. Download the Excel file and open it.
5. Delete the test team before the event (see below).

---

## The admin page

`/admin` — not linked from anywhere on the public site, marked `noindex`, and disallowed
in `robots.txt`.

**Unlisted is not secure; the password is.** The page itself is public HTML and always
will be — what is protected is the API behind it. Signing in exchanges the password for a
signed, HttpOnly, Secure, SameSite=Strict cookie that expires after 8 hours. Without it,
`/api/admin/registrations` returns 401 and no data leaves the server.

What is in place:

- The password is never stored in the browser and never sent again after sign-in.
- Comparison is constant-time over hashes, so neither the password nor its length leaks.
- Eight failed attempts from one client in fifteen minutes locks that client out.
- Session cookies cannot be read by page scripts, and are not sent cross-site.
- Changing `ADMIN_PASSWORD` invalidates every existing session.

What is not, and you should know it:

- One shared password, no individual accounts, no audit trail of who downloaded what.
- No two-factor authentication.
- Anyone with the password has every participant's name and phone number.

For a college event that is a reasonable trade. Treat the password accordingly: don't put
it in a WhatsApp group.

### Removing a team

Sign in, open the browser console on `/admin`, and run:

```js
await fetch('/api/admin/registrations?ref=ID60-ABC-1234', { method: 'DELETE' })
```

Then hit **Refresh**.

---

## Data protection, briefly

You are collecting students' names and phone numbers. That is personal data.

- Collect it for this event and delete it afterwards. Dropping the Neon database removes
  everything.
- The registration page tells participants what the data is for. Keep that accurate.
- Don't paste the master sheet into a group chat.

---

## Local development

```bash
npm install          # installs the Postgres driver
npm install -g vercel
vercel dev           # serves the site and the API together on http://localhost:3000
```

`vercel dev` reads `.env.local`:

```
DATABASE_URL=postgres://…
ADMIN_PASSWORD=whatever-you-like-locally
```

Without a database the site still runs — registrations stay on the device and
`/organiser.html` merges exported files. See the README.

---

## Cost

The free tier covers this comfortably. A 200-team event is roughly 200 rows and a few
thousand function invocations — orders of magnitude inside the free allowances for both
Vercel and Neon. Neon's free databases suspend when idle and wake on the next query; the
first registration after a quiet period may take a second or two longer.

---

## Changing the URL

Vercel derives the production domain from the **project name**, not the repository name, so
a misspelt project name is fixed without touching the repo or the git history.

Project → **Settings** → **General** → **Project Name** → set it to `ideathon` → Save. The
site moves to `ideathon.vercel.app` within a few seconds; no redeploy is needed.

If that name is already taken by someone else's project — `*.vercel.app` names are global,
not per-account — Vercel will say so, and you can instead go to **Settings → Domains → Add**
and claim a different free subdomain such as `ideathon-ncerc.vercel.app`.

Two things to know:

- **The old URL stops working immediately.** Anything already shared — a QR code, a poster,
  a WhatsApp message — breaks. Rename before you circulate the link, not after.
- **The repository name does not matter.** Nothing in the code refers to it, and renaming
  the GitHub repo is not required to fix the URL.

---

## Matching the Google Form to the rule book

Registration is collected by a Google Form, so **the form is the gate, not this site**. The
validation in this repository never sees a response. Every rule the rule book states has to
be built into the form, or it is decorative.

What the rule book currently promises, and what the form needs to do about it:

| Rule | What the form must do |
| --- | --- |
| Team of 3 or 4 | Three required member blocks, one optional. A Google Form cannot make member 4's questions conditionally required, so mark them optional and check the sheet |
| Roles follow position | **Nothing.** Member 1 is the Team Lead, 2 the Presentation Maker, 3 the Researcher — by rule, not by choice. Label the questions "Member 1 (Team Lead)" and so on, and the form needs no role question |
| Member 4 picks Innovation Lead or Problem Analyst | One two-option dropdown, only for the fourth member |
| Every member has a branch, from seven | Seven-option dropdown per member, required |
| Every member has a 10-digit mobile number | Short answer with a regex response validation of `^[0-9]{10}$` |
| One entry per team | Turn off "Allow response editing"; deduplicate team names in the sheet |

Fixing the roles by position is what makes this work in a Google Form at all: cross-question
validation ("the team must contain a Researcher") is not something a form can express, but
"member 3 is the Researcher" needs no validation — it is true by the order of the questions.

Two settings worth checking before you share the link:

- **Do not require sign-in** unless every participant has a college Google account, or
  students will hit a login wall.
- **Link the form to a responses spreadsheet** (Responses → link to Sheets) so you have the
  data somewhere other than the form UI.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Registration says "Saved on this device only" | No `DATABASE_URL`, or added after the last deploy | Connect the Neon store, then redeploy |
| Admin page: "No ADMIN_PASSWORD is set" | Variable missing, or added after the last deploy | Add it, then redeploy |
| Admin page: "No database is connected" | `ADMIN_PASSWORD` is set but the store is not connected | Step 2, then redeploy |
| "Too many failed attempts" | Eight wrong passwords in fifteen minutes | Wait it out — it is doing its job |
| 404 on `/api/register` | `api/` not deployed, or Root Directory is wrong | Root Directory `./`; check the Functions list on the deployment |
| Admin says "No database is configured" after connecting a store | The store was connected with an **environment-variable prefix**, so the variable is `NEON_DATABASE_URL` rather than `DATABASE_URL` — or it was connected after the last deploy | The code now accepts any variable holding a `postgres://` URL, so **redeploy** first. Sign in to `/admin`: when no database is found it lists the variable names it checked and which database-related variables exist on the deployment (names only, never values) |
| Visitors are asked to log in to Vercel | Deployment Protection is on | Settings → Deployment Protection → off for Production |
| First registration after a quiet period is slow | Neon free databases suspend when idle | Normal. It wakes in a second or two |
| Build fails on Node version | `engines.node` conflicts with the dashboard setting | Leave the dashboard on the default; `package.json` pins `22.x` |
