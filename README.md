# TollyPlay — Premiere Night

**TollyPlay** is a social party-game web app for Telugu (Tollywood) movie fans. Families and friend groups play movie games together — in one living room with a single phone, or remotely over a shared room code — drawing on an archive of **5,252 Telugu films (1940–2026)**, including 45 Tamil blockbusters every Telugu family knows by their dub titles (Narasimha, Ghajini, Robo, Baasha…).

- **Live site:** https://sriharsha71187.github.io/tollyplay/
- **Platform:** Mobile-first responsive web app (PWA manifest included). Works on any modern phone browser; a desktop layout with a sidebar exists for every hub screen.
- **Audience:** Multi-generation Telugu families — grandparents who know 1950s classics through kids who know Pushpa. Every mode has era/difficulty controls so all generations can play together.

This document is the complete product + design reference: every screen, state, rule, number, and visual token in the app.

---

## 1. Design language — "Night-Show Cinema"

Dark, premium, playful — a modern streaming app crossed with a party game. NOT childish.

### Palette (exact tokens)

| Token | Hex | Use |
|---|---|---|
| `surface` | `#131121` | App background (deep midnight indigo) |
| `surface-lowest` | `#0e0c1b` | Mobile bottom-nav bar |
| `surface-low` | `#1c1a29` | Desktop sidebar |
| `surface-container` | `#201e2d` | Cards, list rows |
| `surface-high` | `#2a2838` | Inputs, secondary buttons, elevated cards |
| `surface-highest` | `#353343` | Chips, small pills |
| `on-surface` | `#e5dff5` | Primary text (soft lavender-white) |
| `on-variant` | `#d4c4af` | Secondary text (warm parchment) |
| `outline` | `#9c8f7b` | Hairlines |
| `gold` | `#f5b942` | Primary accent: CTAs, scores, active states |
| `gold-bright` | `#ffda9c` | Display headlines, marquee titles |
| `on-gold` | `#422d00` | Text on gold buttons |
| `urgent` | `#e4405f` | Timers under 10s, danger |
| `urgent-deep` | `#a20234` | Reject/error banner backgrounds |
| `urgent-soft` | `#ffb2b9` | Text on urgent backgrounds, banned-word chips |
| `success` | `#34c759` | Correct answers, "GOT IT!" button |
| `success-bright` | `#6efa85` | Success highlights |

### Typography
- **Display:** Anton (condensed, cinema-poster energy) — all headlines, timers, scores, buttons like "START GAME". Usually uppercase with wide tracking.
- **Body:** Hanken Grotesk 400/500/700 — everything else.
- **Icons:** Material Symbols Outlined (`home`, `quiz`, `groups`, `person`, `link`, `auto_stories`, `add_circle`…). Emoji used deliberately for flavor (👑 🎲 💡 ☠️ 🏆 ◆ 🎭).

### Texture & motion
- **Film grain:** fixed full-screen SVG turbulence overlay at 5% opacity on every screen.
- **Marquee glow:** gold box-shadow (`0 0 18px rgba(245,185,66,.3)`; strong variant `0 0 25px .5`) on active/primary elements.
- **Marquee tracks:** infinite horizontal auto-scroll strips on Home (50–60s loops).
- **Micro-interactions:** buttons scale to 0.95 on press; timer pulses red under 10s; `title-sheen`, `rise`, `glow-pulse` entrance animations. All animation disabled under `prefers-reduced-motion`.
- **Shape language:** rounded-3xl cards (24px), pill buttons (fully rounded), chunky bottom CTAs, poster thumbnails as rounded rects.

---

## 2. Navigation & information architecture

### Shell (hub screens `/`, `/daily`, `/rooms`, `/profile`)
- **Mobile:** top bar (🎭 avatar circle with gold ring, "TOLLYPLAY" wordmark, `PTS <n> ⭐` trivia-points chip) + fixed bottom tab bar with 4 tabs: **HOME · TRIVIA · ROOMS · PROFILE** (blur backdrop, gold glow on active tab).
- **Desktop (md+):** 64-wide left sidebar — wordmark + "PREMIERE NIGHT" tagline, vertical nav, and a gold **CREATE ROOM** button pinned at bottom.

### Routes
| Route | Screen |
|---|---|
| `/` | Home (marquee strips, mode cards, "YOUR REEL" stats) |
| `/daily` | **Ek Niranjan** — endless solo trivia (tab labeled TRIVIA) |
| `/rooms` | Party Rooms — create/join with 5-letter code |
| `/room/:code` | Live room (lobby → Chain or Story game) |
| `/play/chain` | Pass-the-phone Chain (local multiplayer, no network) |
| `/play/living` | Living Room — team charades/taboo hybrid |
| `/profile` | Profile — account + stats |

Game screens (`/play/*`, `/room/*`) render full-bleed without the tab shell; each has a `← Exit` / `← Leave` link and its own header (game wordmark center, room code or live scores right).

---

## 3. The film archive (data)

**`movies.json`** — 5,252 films, 1940–2026, scraped from Wikipedia year lists plus a curated dub catalogue. Per film:
- `title`, `year`, `director` (comma-joined when multiple), `cast` (top-billed order; `cast[0]` ≈ hero, `cast[1]` ≈ heroine)
- `linked` — the film has its own Wikipedia article (fame proxy). Unlinked films are **deep cuts** (marked `◆ deep cut` in search results, worth 3 pts in Chain)
- `w` — Wikipedia article title (drives posters + real-plot rounds); for dubs it points at the ORIGINAL film's article
- `dub: true` — 45 Tamil films entered under their Telugu dub titles

**Derived intelligence (computed in-app):**
- **Marquee stars:** anyone with ≥20 top-2-billed roles across the archive (~92 people, NTR through Savitri to Prabhas). Powers popularity filters and dual-lead detection.
- **Popular movie:** `linked` AND a marquee star in top billing (~2,400 films) — the pool for Story-mode deals.
- **Pageview fame:** story rounds batch-query Wikipedia's 60-day pageviews and deal the most-looked-up film of a random dozen candidates.
- **Dual-star leads:** when the top two billings are same-gender marquee stars (RRR, Seethamma Vakitlo, Dalapathi), BOTH count as heroes for linking; the heroine shifts to `cast[2]`.
- **`genders.json`** (m/f per person) and **`photos.json`** (verified Wikipedia portrait URLs — only people whose article was confirmed to be the right film personality with a lead image; gates all photo features so a wrong face is never shown).

**Curated content:** 29 kathas (cryptic one-line plots, easy+hard tiers), 14 famous dialogues, 37 trivia questions (easy+hard tiers).

**Person identity:** names are compared through a normalization key (lowercase, dots/spacing/punctuation stripped) so "N.T. Rama Rao" = "N. T. Rama Rao".

---

## 4. Game mode: Party Rooms (`/rooms` → `/room/:code`)

Online realtime multiplayer for 2+ phones. One room code, two games (host picks): **Chain** and **Story**.

### 4.1 Rooms hub (`/rooms`)
- Hero card "PARTY ROOMS — One room code, everyone plays live — Chain or Story, host's pick."
- YOUR NAME input (persisted locally).
- Gold **CREATE ROOM** CTA (disabled until name entered) → generates a 5-letter code (A–Z minus lookalikes I/O).
- JOIN WITH CODE card: 5-char input (large, letter-spaced, uppercase) + JOIN button.
- If server keys are absent the screen says "Rooms are almost ready — waiting on server keys."

### 4.2 Lobby
- **ROOM CODE — TAP TO SHARE** card: giant letter-spaced code; tap = native share sheet (or clipboard + "Copied!").
- **PLAYERS (n)** chip list; host has 👑 and gold chip; "(you)" suffix on self.
- Host-only settings (others see "Waiting for the host to start…"):
  - **GAME:** Chain ⟷ Story toggle with one-line description of each.
  - Chain settings card: **LIVES** (`Sudden death` / `One second chance`), **VALID LINKS** (Hero / Heroine / Director toggles, at least one on), **WHO STARTS** (🎲 Random — default — or any player chip).
  - Story settings: **STORY SOURCE** (`Players write` / `Real plots` / `Mix`), **FROM THE ERA** (`Any year` / ≤70s / 80s / 90s / 2000s / Now).
- **START CHAIN / START STORY** CTA (disabled below 2 players: "WAITING FOR PLAYERS…").
- Anyone joining mid-game sees "👋 You're in the room — you'll be dealt in when the next game starts."

### 4.3 Chain (turn-based, last one standing)
**Rule:** name a movie sharing an enabled link role (hero/heroine/director) with the previous movie. **No per-person link cap** — one star can carry the whole chain all night.

- **Turn screen (top→bottom):**
  1. **Chain strip** — horizontal, newest first. The anchor (movie to chain onto) is a large gold-bordered card with poster thumbnail; the next two are normal cards; older links shrink, dim to 50%, and drop their posters. Via-person chips sit between cards. Empty state: "Open the chain with any movie."
  2. **LINKS USED** chips — usage counts for the anchor's link people (`Allu Arjun ×3`), informational only.
  3. Turn line: "Your turn!" / "<name>'s turn" + big Anton countdown (turn length 30s), pulsing red ≤10s.
  4. Player chips row: gold glow = on turn, strikethrough+dim = eliminated, `name · score`.
  5. Status banners (contextual): reject banner with the judge's REAL reason ("Baahubali is already in the chain", "No shared hero/heroine/director with Pushpa: The Rise"), ☠️ "You're out — <reason>. Watching the rest play out.", 💡 lifeline clue card.
  6. On your turn: search input ("Chain onto <title>…" / "Name any movie…") → live autocomplete (max 8; title + year + `◆ deep cut` badge) → tapping a result opens **LOCK IN YOUR ANSWER** confirm card ("Must link to <title>. If it doesn't, you're out.") with BACK / **🔒 LOCK IT IN**.
  7. **💡 KATHA LIFELINE (once per game)** — the app finds a valid chainable movie and shows its year + director + star as a clue; playing after a hint scores 1 pt max.
- **Scoring:** opener 0 · valid link 1 · deep cut 3 · after-lifeline 1.
- **Elimination:** a wrong lock or a timeout = strike; at the lives limit you're out. Turn passes in seating order, skipping the eliminated. Game runs until ONE player remains.
- **GAME OVER board:** survivor ranked first with 🏆 "Last one standing" (winner logic: alive > score > fewer strikes); every eliminated player shows ☠️ + why they went out ("ran out of time", the exact failed-link reason). Chain length shown; host gets BACK TO LOBBY.

### 4.4 Story (write & guess)
One round per player. Two round kinds:
- **Player round:** the writer is dealt a secret movie (title+year shown only conceptually — family game, no hiding UI) and has **90s** to write a disguised story (≤300 chars). Everyone else has **75s** and **2 tries** to guess via the same autocomplete.
- **Real-plot round** (source `Real plots`, or every 2nd round on `Mix`): the app deals a real Wikipedia plot — first ~3 sentences with the title, cast, director, and (for dubs) the original title blacked out as ▮▮▮ — and everyone guesses.
- **Movie dealing:** era-filtered → popular (marquee-star) pool → most Wikipedia-viewed of a random dozen. Never deals obscure films.
- **Scoring:** guessers — 3 pts first correct, 2 after; wrong guess feedback "Not it — one try left." / "Not it — out of tries!". Writer — `(guessers − correct) × 2 + 2`, but 0 if NOBODY guesses it (unguessable ≠ clever).
- **Reveal (8s):** poster + title + year + per-player points awarded, then next round. Header shows "STORY · ROUND n/players".

### 4.5 Multiplayer engineering (what makes rooms feel solid)
- Supabase Realtime channels; presence = roster. **Host phone is the referee** — all game logic runs there as pure functions (`referee.ts`).
- **Versioned state:** every broadcast carries a monotonic `v`; receivers drop stale/out-of-order copies. Host re-broadcasts every 4s (heartbeat), so a dropped packet self-heals within a beat.
- **Loss-tolerant actions:** every tap is sent 3× under one nonce; the referee processes each nonce once.
- **Buzzer grace:** the referee waits 1.2s past the deadline before striking anyone — an answer sent at the buzzer isn't eaten by latency.
- **Host adoption:** if the host vanishes from presence for ~8s, the lowest-id player silently adopts the room and rebuilds referee state from the shared chain.
- **Suggestion taps never miss:** result buttons prevent input blur, so the phone keyboard collapsing can't swallow a tap.

---

## 5. Game mode: Living Room (`/play/living`)

Same-place party game, one phone, two+ teams. Taboo/charades hybrid: the phone is game master, humans perform.

- **Setup:** team name inputs (default Team A/B) · **DIFFICULTY** Easy ("Well-known films from 1985 onwards") / Classic ("All famous films, every era") / Expert ("Everything — deep cuts included. True fans only.") · **MOVIE ERA** All/≤70s/80s/90s/2000s/Now with live "<n> films in this pool" count · **ROUND TIMER** 60/90s · **ROUNDS PER TEAM** 3/5.
- **Handoff:** "Round n of N" → huge team name → "Pick a clue-giver — only they see the phone." → GO.
- **Card screen:** header = team name, countdown, round score. Card shows a kind chip then, ask-first (the instruction is the big gold headline; the answer is subdued below):
  - 🗣️ **DESCRIBE** — "Describe the plot"; movie title + year below; up to 6 red BANNED word chips (lead first names, director, title words).
  - 🎵 **SING** — "Sing a song from the film" (no title words).
  - 🎭 **ACT** — "Act it out" (not a single word).
  - 🧠 **TRIVIA** — clue-giver reads an auto-generated clue ("1980 · directed by K. Viswanath · starring …"); answer line kept tiny.
  - 💬 **DIALOGUE** — perform a famous line (italic quote); team names the movie.
  - 🎞️ **CO-STARS** (photo builds only) — two verified star portraits shown to EVERYONE; "Name a movie starring BOTH"; answer hidden behind a "peek at answer" tap.
- Buttons: **PASS** (grey) / **GOT IT!** (green). Score = correct + last-card bonus − 1 per 2 passes (never below 0).
- **TIME!** summary → next team → final board: "<TEAM> WINS!" or "IT'S A TIE!", 👑 + glow on winner, DONE.
- Cards never repeat within a session (movie and curated-card de-dup). Curated dialogue/trivia cards are sprinkled in roughly every 4th card.

---

## 6. Game mode: Chain — pass the phone (`/play/chain`)

Local version of Chain for one room, one phone, 2–8 players.

- **Setup:** editable player names (add/remove, min 2) · VALID LINKS toggles · TURN TIMER 15/30/45s.
- **Handoff between every turn:** "Pass the phone to" → huge player name → "Chain a movie onto <title> (year)" / "Open the chain with any movie" → **I'M READY** (timer starts only then).
- **Turn:** same newest-first chain strip (anchor gold + prominent last three), countdown, inline reject reasons, autocomplete play (tap = instant play, no lock step). Wrong picks can be retried until the clock runs out; a timeout is a strike (sudden death default).
- Elimination in seating order, plays continue until one player remains → GAME OVER ranking with 👑, chain length, DONE.

---

## 7. Game mode: Ek Niranjan — endless trivia (`/daily`, tab "TRIVIA")

Solo run-based trivia. "ENDLESS TOLLY TRIVIA · HARDER EVERY LEVEL".

- **Sign-in gated** (when accounts configured): "🔒 Sign in to play — your points and best runs are saved to your account." Email/password or Google.
- **Run rules:** 3 ❤️ lives, no question cap. Level = 1 + floor(question/6), max 6; points = 10 × level (+5 on photo questions). Wrong answer costs a life; answers lock with green/red feedback for ~1.1s.
- **Question sources:** early levels serve curated warm-ups (trivia, dialogues, kathas — hard tiers join at level 2) until exhausted, then endless generated questions: 🎬 DIRECTOR, ⭐ LEAD, 📅 YEAR (±2–7 distractors), 🎭 CO-STAR (gender- and era-aware distractors: the hero's real other heroines first), 🎬 FILMOGRAPHY, and photo kinds 🎞️ CO-STARS + 📸 WHO IS THIS (verified portraits only). Four options each; distractors never the wrong gender.
- **Anti-repeat:** never within a run; a rolling 160-question per-account window avoids cross-run repeats.
- **Idle/Run-over screen:** RUN OVER card (big score, questions, level, "🏆 new best!"), Total points / Best run / Runs tiles, **START A RUN / RUN IT BACK** CTA, "How it works" card.

---

## 8. Profile (`/profile`)

Avatar (Google photo or 🎭), display name/email, ⭐ total trivia points, sign in / sign out (email+password with create-account mode, or "Continue with Google"), stat tiles: Best run · Runs played · Wins (—) · Deep cuts (—).

---

## 9. Home (`/`)

- Auto-scrolling marquee strips (film posters / star names) top and bottom.
- Hero: "TOLLYPLAY" title with sheen, tagline, glowing **PLAY** CTA.
- Mode cards: **PARTY ROOM** ("Friends anywhere — one code, phones out") and **LIVING ROOM** ("One phone, everyone shouts") plus links into Trivia.
- **YOUR REEL** — personal stat tiles.

---

## 10. Accounts, media, and privacy

- **Auth:** Supabase (email/password + Google OAuth). Only Ek Niranjan requires sign-in; rooms use device-local names/ids.
- **Media kill-switch:** `VITE_MEDIA=off` builds render zero images (no posters, no photos, photo card kinds disappear) for store-safe builds. Default is on.
- **Poster/photo sources:** Wikipedia REST thumbnails, cached in localStorage; person photos only from the verified `photos.json` set.

---

## 11. Tech, quality & delivery

- **Stack:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4; React Router 7; Supabase JS for realtime + auth. No server of our own — static hosting + Supabase + Wikipedia APIs.
- **Testing:** 24 vitest unit tests (turn rotation incl. elimination-skip regression, link judging, dual-star leads, full referee game simulations to last-one-standing) + a Playwright E2E that click-drives a real 4-player Chain game in headless Chromium (10 consecutive autocomplete taps must register; eliminations must pass the turn to the correct seat; GAME OVER only at one survivor). `npm test` / `npm run test:e2e`.
- **CI/CD:** GitHub Actions auto-builds and deploys to GitHub Pages (`gh-pages` branch) on every push to `main`. SPA fallback 404.html; base path `/tollyplay/`.
- **Repo layout:** `app/` (Vite app: `src/game` pure logic, `src/screens`, `src/lib`, `src/content` curated content, `src/data` genders/photos, `public/movies.json`) · `data/` source dataset · `scripts/` dataset builders (incl. `add_tamil_dubs.py`) · `docs/` design docs · `design/stitch/` earlier Stitch exports.

---

## 12. Copy voice

Warm, cinematic, a little cheeky. Examples in production: "Loading the film archive…", "The chain starts with you.", "Pass the phone to", "🔒 LOCK IT IN", "unguessable ≠ clever", "You emptied the vault — incredible.", "☠️ You're out — watching the rest play out.", "🏆 Last one standing". Telugu-cinema flavor words welcome (katha = story). Numbers are always big, gold, and Anton.
