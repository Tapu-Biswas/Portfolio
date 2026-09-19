# Tapu Biswas — Portfolio

This is the approved design: a single self-contained `index.html`, plus one
small serverless function (`api/chat.js`) that powers the "ask about
publications" chat with your own Anthropic API key.

## What's in here

```
index.html      — the whole site (HTML/CSS/JS in one file)
api/chat.js     — serverless function powering the publications chat
.gitignore
README.md
```

There's no build step and no framework — this deploys as-is.

## 1. Push to GitHub

```bash
cd portfolio-site
git init
git add .
git commit -m "Portfolio site"
git branch -M main
git remote add origin https://github.com/Tapu-Biswas/Portfolio.git
git push -u origin main --force
```

Replace the remote URL if you want this in a different/new repo instead of
overwriting your existing `Tapu-Biswas/Portfolio`. If you're pushing to a
repo that already has commits you want to keep, drop `--force` and resolve
any conflicts normally instead.

## 2. Deploy on Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the GitHub repo.
2. Framework preset: choose **"Other"** (there's no framework here — it's
   static HTML + one API function, which Vercel supports natively).
3. Leave build settings empty (no build command, no output directory needed).
4. Before deploying, go to **Settings → Environment Variables** and add:
   - `ANTHROPIC_API_KEY` = your key from
     [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
5. Deploy.
6. Check **Settings → Deployment Protection** is set to **Public / None** —
   otherwise visitors hit a login wall instead of your site (this broke an
   earlier deployment of yours).

That's it — `index.html` serves as your homepage, and `api/chat.js`
automatically becomes a live endpoint at `/api/chat` with no extra config.

## How the chat works

1. `api/chat.js` holds your publication list (title, venue, authors,
   abstract) — this is the entire knowledge base, no database needed.
2. When someone asks a question, it does simple keyword-overlap scoring
   across the abstracts and picks the 3 most relevant papers.
3. Those 3 abstracts are sent to Claude as context, with a system prompt
   that says "answer only from this context." The reply comes back with the
   source papers attached so the chat can show which papers it drew from.

This keeps the whole thing running on Vercel's free tier with no extra
infrastructure (no vector DB, no separate backend).

## Keeping it up to date

- **New publication** → add an entry to the `PUBLICATIONS` array in
  `api/chat.js` (with a real, specific abstract — the chat only answers as
  well as the abstract you give it). Also add it to the `PUBLICATIONS` list
  inside `index.html` so it shows up in the visible list, not just the chat.
- **Health Risk Predictor live URL** → in `index.html`, search for
  `href="#" onclick="return false;"` under the health-risk-predictor
  project and swap in the real Streamlit Cloud URL once you have it.
- **New project** → duplicate one of the `.project` blocks in the Projects
  section of `index.html` and edit the text/links/tags.
- **Certifications / stats** → these are plain HTML in `index.html` (search
  for the section you want to change: `id="stats"`, `id="about"`, etc.) —
  no build step, so edits go live the moment you push.
