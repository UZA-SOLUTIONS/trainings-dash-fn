# Training dashboard

Staff-only UI for cohorts, attendance, marks, issues, and reports.

This is separate from `trainings-fn` (public UZA site). Root `/` goes to login, then the dashboard. There is no public Home / Apply / Track site.

## Setup

1. Copy `.env.example` to `.env`
2. `npm install`
3. `npm run dev` — http://localhost:5173

Point `VITE_API_URL` at the dashboard API (`trainings-dash-bn`). Local default: `http://localhost:5000/api`.

On Vercel use **Config** (not Secret): `https://trainings-dash-bn.vercel.app/api`

Point the existing **trainings-dash-fn** project at this GitHub repo (`UZA-SOLUTIONS/trainings-dash-fn`), production branch `main`.
