# Vercel Deployment (Lumina / Project IT Life)

## 1. Prerequisites
- GitHub/GitLab/Bitbucket repo connected to Vercel (recommended), or Vercel CLI.
- Node `>= 20.19.0` (matches `package.json#engines` and Vite 7).
- Supabase project with schema/RLS/storage applied as in `supabase_schema.sql` (especially `faculty-files`, `assignment-submissions`, and related policies).

## 2. Vercel project settings
`vercel.json` is configured:
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- SPA rewrite: non-asset routes → `/index.html` (does not intercept `/api/*` or static assets)

In Vercel dashboard, confirm:
- **Root Directory**: repository root (where `package.json` and `vercel.json` live)
- **Node.js Version**: 20.x or newer

## 3. Environment variables (Vercel → Project → Settings → Environment Variables)
Add for **Production** (and Preview/Development if needed), then **Redeploy**:

| Name | Value | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | your Supabase project URL | client-side; e.g. `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase publishable/anon key | client-side; required by `src/lib/supabaseClient.js` |
| `GROQ_API_KEY` | Groq API key | **server-side only** (no `VITE_` prefix). Read by `api/groq/chat.js`; never exposed to browser. |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | optional server-side override |
| `GROQ_BASE_URL` | `https://api.groq.com/openai/v1/chat/completions` | optional server-side override |

Do **not** set `VITE_GROQ_API_KEY` in Vercel — `VITE_*` vars are embedded in the client bundle. The AI quiz feature uses the `/api/groq/chat` Vercel Function, which keeps the Groq key server-side.

## 4. Supabase production checklist
- Apply `supabase_schema.sql` (tables, RLS, triggers, storage buckets/policies) to the production Supabase project.
- In Supabase Auth → URL Configuration, add your Vercel domain(s) to **Site URL** / **Redirect URLs** (e.g. `https://<app>.vercel.app` and custom domain).
- Confirm storage buckets exist and policies allow intended faculty/student access: `faculty-files`, `assignment-submissions`.
- Verify PDF/file URLs and storage access work from the deployed Vercel domain (CORS/policy issues often appear only after deploy).

## 5. Local verification
```powershell
$env:Path = "C:\Program Files\nodejs;$env:Path"
npm ci
npm run build
npm run preview   # static preview (no /api)
```
For local AI quiz generation you can either run `npx vercel dev` (exercises `/api/groq/chat` with `GROQ_API_KEY` in your environment) or keep a gitignored `.env` with `VITE_GROQ_API_KEY` for the dev-only fallback.

## 6. Deploy
- **Git integration (recommended):** push to the connected branch; Vercel builds automatically.
- **CLI:**
```bash
npm i -g vercel
vercel
vercel --prod
```

## 7. Post-deploy smoke test
- Load the app on the Vercel URL (SPA routes refresh correctly).
- Login/signup works against the production Supabase project (Auth redirect URLs configured).
- Faculty: upload/open lesson files; generate AI quiz (server-side `GROQ_API_KEY` configured).
- Faculty: create assignment with attached PDF; Student: preview card opens PDF in a new tab and download works.
- Check browser console/network for CORS, storage policy, missing-env, or `/api/groq/chat` errors.
