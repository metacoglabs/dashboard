# Tex Dashboard

Developer self-service dashboard for [Tex](https://getmetacognition.com) — sign up, mint API keys, and watch token usage.

Built with Next.js 15 (App Router), TypeScript, Tailwind, shadcn/ui, and Recharts.

## Local development

```bash
cp .env.example .env.local
# edit .env.local — point TEX_API_BASE_URL at a running integration backend
npm install
npm run dev
```

Open http://localhost:3000.

The dashboard is a thin BFF over the Tex integration backend. Browser → Next.js API routes → `TEX_API_BASE_URL`. Auth is a signed httpOnly cookie that wraps the user's API key; the key never reaches the browser after the one-time reveal at signup.

## Pages

| Route | Purpose |
| --- | --- |
| `/signup` | Create an org, reveal the first API key once |
| `/login` | Paste an existing API key to start a session |
| `/dashboard` | Overview cards, getting-started snippet, daily quota |
| `/dashboard/keys` | List, mint, and revoke keys |
| `/dashboard/usage` | Today's bars + 6-month chart |

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import it at https://vercel.com/new.
3. Set environment variables in Project Settings → Environment Variables:
   - `TEX_API_BASE_URL` → your integration backend URL
   - `SESSION_SECRET` → a random 32-byte string
4. Deploy. Add `app.getmetacognition.com` as a custom domain when ready.

## Backend contract

The dashboard expects these endpoints on `TEX_API_BASE_URL`:

- `POST /signup`, `GET /me`
- `GET/POST /me/api-keys`, `DELETE /me/api-keys/{id}`
- `GET /usage/today`, `GET /usage/summary?month=YYYY-MM`

All non-auth endpoints are called with `Authorization: Bearer <api_key>` extracted from the session cookie.
