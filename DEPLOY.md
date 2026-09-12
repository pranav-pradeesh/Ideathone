# Deploying to Vercel

Three steps. Budget ten minutes for the first one.

---

## 1. Import the repository

[vercel.com/new](https://vercel.com/new) → **Import Git Repository** → select
`pranav-pradeesh/Ideathone`.

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

- **If the connect dialog offers an "environment variables prefix", leaving it blank is
  simplest.** Setting one produces `NEON_DATABASE_URL` instead of `DATABASE_URL`. The code
  handles that — it accepts any variable holding a `postgres://` URL — but only after a
  redeploy.
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
