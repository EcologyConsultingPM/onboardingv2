# Ecology Consulting — Onboarding Workbook

New employee onboarding workbook for Ecology Consulting, with Learning &
Development Modules nested inside it as a sub-section. Built with Next.js
(App Router) so it can be pushed straight to Vercel.

## What's in here

- **Onboarding Workbook** — Employee Details, Pre-Commencement Checklist,
  Day 1 (People & Culture / IT & Systems / WHS), Week 1, Key Contacts,
  Important Links, and 30/60/90 Day Reviews. Each item has a complete
  checkbox, a date, notes, and hyperlinks.
- **Learning & Development Modules** — a sub-item in the same nav, pre-loaded
  with all 7 Month 1 modules and their sub-headings/SMEs. Add more months
  and modules any time; every sub-heading can carry notes, hyperlinks,
  video links, and attachment references.
- Export/Import buttons back up or move the whole workbook as a JSON file.
- Reset restores the original seeded content.

## Project structure

```
ecology-onboarding/
├── app/
│   ├── layout.js        Root layout, loads global styles
│   ├── page.js           Renders the workbook full-height
│   └── globals.css       Brand fonts (Quicksand + Newsreader), base resets
├── components/
│   └── OnboardingWorkbook.js   The whole app: nav, checklist sections,
│                                module library, all the editing UI
├── lib/
│   └── storage.js         Persistence layer (see below)
├── public/
│   └── logo.png            Ecology Consulting logo, transparent background
├── package.json
└── next.config.js
```

## Data & persistence

Right now `lib/storage.js` reads and writes the browser's `localStorage`,
so the app works standalone with no backend — data is per-browser,
per-device. That's fine for one person building out the library (e.g.
Aaron filling in Month 1 details), but it won't sync between an admin and
a new hire on different machines.

When you're ready for that, swap the three functions in `lib/storage.js`
for calls to a Supabase table (or an API route wrapping one) — everywhere
else in the app calls `getItem`/`setItem` with the same shape, so nothing
in `components/OnboardingWorkbook.js` needs to change.

## Running locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Deploying

This is a standard Next.js app — connect the repo to Vercel and it'll
deploy with no extra configuration.

## Pushing this to GitHub

This folder is already a git repo with an initial commit. To push it to
`SolumSafety/ecology-onboarding`:

```bash
git remote add origin https://github.com/SolumSafety/ecology-onboarding.git
git branch -M main
git push -u origin main
```

(If the remote already has commits, use `git pull --rebase origin main`
first, or push to a new branch instead.)
