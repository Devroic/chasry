# Chasry — Project Goal & Requirements

This captures the original brief in full, as a reference for what the app is supposed to do and
why — separate from `README.md` (how to set it up) and the architecture plan used to build it.

## Goal

Give freelancers and small businesses a simple web app to log unpaid invoices once and have
Chasry automatically chase payment by email, on their behalf, until it's paid — funded by a
monthly subscription.

## Functional requirements

- A client (i.e. a freelancer/small business — the paying user of Chasry) logs in to the app.
- They can add **client details**: name, email, invoice amount, due date. ("Client" here means
  *their* customer who owes the money — the app internally calls this a `customer` to avoid
  confusion with Chasry's own subscribers, but the UI copy says "Client" to match how the user
  thinks about it.)
- The app sends **automatic reminder emails** at specific offsets relative to the due date —
  e.g. 7 days before, 3 days before, 1 day after — and this schedule is configurable, not fixed.
- Access is gated by a **monthly subscription**.

## Non-functional requirements

- **Production-ready**, not a prototype — this is the real app clients will use, not the landing
  page (that already exists separately at chasry.com for early sign-ups and isn't part of this
  build).
- **Low budget**: prefer free/low-cost tools. Target audience is freelancers/small businesses
  first, with room to expand later if it succeeds — infrastructure choices should reflect that,
  not assume scale from day one.
- **Security**: everything handling client data, invoice/payment info, and auth needs to be
  built securely — not an afterthought.
- **UX**: keep it as simple as possible; the user should have the best experience the scope
  allows.
- On brand: use the existing Chasry name, logo/icon set, and color palette (all in `brand/`) —
  don't invent new branding.

## What was asked of the build process itself

- Design the complete system architecture first, then build — covering system architecture,
  file structure, database schema, API endpoints, UI architecture, and production-ready code.
- Approach it as a senior full-stack engineer building a real startup, using whatever available
  tooling/skills would genuinely improve the result.

## Decisions made while turning this into a build (see the approved plan for full detail)

- **Stack**: Next.js (Server Actions + a couple of Route Handlers) on Vercel, Supabase
  (Postgres/Auth/RLS), Stripe Billing, Resend + React Email, Vercel Cron for the daily reminder
  job — chosen to fit the low-budget constraint (~$20–30/mo) while still being production-grade.
- **Pricing**: 7-day free trial, then a single €10/month plan (no tiers).
- **Domain/email**: reminders send from `reminders@chasry.com` once Resend's DNS records are
  added on Namecheap, alongside (not replacing) the existing `info@chasry.com` forwarding.

## Explicitly out of scope for this phase

- The marketing landing page — already built and live separately.
- Marketing content and account setup (Instagram, Facebook, TikTok, LinkedIn) — the agreed next
  phase, once the app itself is live.
