# Deploy AuraPOS to Cloudflare

AuraPOS runs on **Cloudflare Workers** (via the OpenNext adapter) with a **PostgreSQL** database
hosted elsewhere. Cloudflare doesn't host Postgres itself, so you need one database provider.
This build was tested locally in Cloudflare's runtime (`wrangler dev`): sign-up, login, products,
stock, labels and Excel/CSV import all work.

You need:
- A Cloudflare account (free plan is fine to start)
- A Postgres database — **Neon** (neon.tech, free tier) is the simplest; Supabase also works
- Node.js 20+ on your computer (only for the one-time database setup)

---

## Step 1 — Create the database (Neon)

1. Sign up at neon.tech → **Create project** → region close to your customers (e.g. *AWS Asia Pacific (Mumbai)* / Singapore).
2. Open **Connection details** and copy the connection string. It looks like:
   `postgresql://user:password@ep-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. Keep it private — it is your database password.

## Step 2 — Create the tables (one time, from your computer)

```bash
git clone https://github.com/goatmonish07-sketch/supermarket-crm.git aurapos
cd aurapos
git checkout claude/supermarket-crm-dashboard-ugmszi
npm install
DATABASE_URL="<your Neon connection string>" npx prisma migrate deploy
# optional: add the demo shop (Shop ID demo-boutique / owner@demo.aurapos.in / demo1234)
DATABASE_URL="<your Neon connection string>" npm run db:seed
```

On Windows PowerShell use `$env:DATABASE_URL="..."; npx prisma migrate deploy`.

Run `npx prisma migrate deploy` again whenever a new version adds database changes.

## Step 3 — Deploy the app

### Option A: Cloudflare dashboard (connects to GitHub, redeploys on every push)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** → choose
   `supermarket-crm` and branch `claude/supermarket-crm-dashboard-ugmszi`.
2. Build settings:
   - **Project / Worker name**: `aurapos` (must match `name` in `wrangler.jsonc`)
   - **Build command**: `npm run cf:build`
   - **Deploy command**: `npx opennextjs-cloudflare deploy`
3. **Settings → Variables and Secrets** → add as **Secret** (type: encrypt):
   - `DATABASE_URL` = your Neon connection string
   - `AUTH_SECRET` = a long random string — generate it on your own computer with `openssl rand -base64 32` or `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
4. Deploy. Your app will be at `https://aurapos.<your-subdomain>.workers.dev`.

### Option B: From your computer

```bash
npx wrangler login
npx wrangler secret put DATABASE_URL   # paste the Neon string
npx wrangler secret put AUTH_SECRET    # paste a random 32+ character string
npm run cf:deploy
```

## Step 4 — Custom domain (optional)

Workers & Pages → `aurapos` → **Settings → Domains & Routes → Add → Custom domain** → e.g. `app.aurapos.in`
(the domain must be on Cloudflare DNS).

---

## Check it works

1. Open the URL → **Free trial** → create a shop.
2. Add a product with sizes/colours, adjust stock, print labels.

## Troubleshooting

| Problem | Fix |
| ------- | --- |
| "DATABASE_URL is not set" / 500 errors | Secret missing or misspelled in Worker settings; redeploy after adding it |
| "AUTH_SECRET is not set" | Add the `AUTH_SECRET` secret |
| Login works but pages error about missing tables | Run Step 2 (`prisma migrate deploy`) against the same database |
| Slow first request | Normal cold start; Neon free tier also sleeps after inactivity |
| Build fails on Cloudflare | Make sure Build command is `npm run cf:build` and Node version ≥ 20 (set `NODE_VERSION=22` as a build variable if needed) |

## Local commands

| Command | What it does |
| ------- | ------------ |
| `npm run dev` | Normal local development (Node) |
| `npm run cf:preview` | Build for Cloudflare and run it locally in the Workers runtime (uses `.dev.vars`) |
| `npm run cf:deploy` | Build and deploy to Cloudflare |

`.dev.vars` (not committed) holds local secrets for `cf:preview`:

```
DATABASE_URL="postgresql://aura:aura@localhost:5432/aurapos"
AUTH_SECRET="any-long-random-string"
```
