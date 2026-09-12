# Deploying to Vercel

Three steps. Budget ten minutes for the first one.

---

## 1. Import the repository

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** → pick this repo.
2. Framework preset: **Other**. Leave the build command and output directory empty —
   this is a static site with serverless functions, there is nothing to build.
3. **Deploy**.

The site comes up immediately. Registration will not save anything yet: the form falls
back to storing entries on the device and says so. That is fixed in step 2.

---

## 2. Add the database

In your project → **Storage** → **Create Database** → **Neon (Postgres)** → accept the free
plan → **Connect** to this project.

Vercel injects `DATABASE_URL` and friends automatically. The tables are created on first
use, so there is no migration to run.

> Any Postgres connection string works. The code reads the first of `DATABASE_URL`,
> `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL_NON_POOLING`.

---

## 3. Set the admin password

Project → **Settings** → **Environment Variables** → add:

| Name | Value | Environments |
| --- | --- | --- |
| `ADMIN_PASSWORD` | a long passphrase you have not used elsewhere | Production, Preview, Development |

Optional:

| Name | Value | Why |
| --- | --- | --- |
| `ADMIN_SESSION_SECRET` | 32+ random characters | Signs sessions with a key separate from the password. Without it the key is derived from the password, which is fine — it just means changing the password signs everyone out. |
| `EVENT_TIMEZONE` | e.g. `Asia/Kolkata` | Timestamps in the sheet. Defaults to `Asia/Kolkata`. |

**Redeploy after adding variables** (Deployments → ⋯ → Redeploy). Vercel does not apply new
environment variables to an existing deployment.

Generate a password worth using:

```bash
openssl rand -base64 24
```

---

## Check it worked

1. Open `/register.html` and register a test team. The confirmation should read
   *"The organisers have your registration"* — if it says *"Saved on this device only"*,
   the database is not connected.
2. Open `/admin.html`, sign in, and confirm the test team is listed.
3. Download the Excel file.
4. Delete the test team before the event (see below).

---

## The admin page

`/admin.html` — not linked from anywhere on the public site, marked `noindex`, and
disallowed in `robots.txt`.

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

Sign in, open the browser console on `/admin.html`, and run:

```js
await fetch('api/admin/registrations?ref=ID60-ABC-1234', { method: 'DELETE' })
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
npm install -g vercel
vercel dev
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
