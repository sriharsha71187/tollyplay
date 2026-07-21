# TollyPlay — Game Design (v2, 2026-07-20)

Three ways to play, split by where the players are.

## 1. Party Rooms — online, friends anywhere

Realtime rooms (Supabase), room code shared on WhatsApp. Two games:

### Chain (turn-based)
- Players take turns naming a movie sharing a **hero / heroine / director** with
  the previous one. Valid link roles are configurable per room (any combination,
  at least one enabled).
- **Link exhaustion**: one person can be the link at most 3× per game.
- **Deep cut bonus**: movies without their own Wikipedia article score 3 vs 1.
- **Katha lifeline — once per player per game**: when stuck, the app picks a
  valid chainable movie and shows a cryptic story clue for it. Guess it within
  the turn and it plays (reduced points).
- Timer per turn; timeout = strike; strikes eliminate; last standing + top score.
- Challenge button: dispute the previous link, the database referees.

### Story mode (write & guess)
- Each round, one player gets a secret movie and writes a disguised/abstract
  story for it. Everyone else guesses (with autocomplete, limited tries).
- **Scoring — writer**: the fewer players who crack it, the more the writer
  scores. At least one player must guess it for the writer to score at all
  (unguessable ≠ clever).
- **Scoring — guessers**: correct guess scores; earlier guesses score more.

## 2. Living Room — same place, one phone

Taboo/charades hybrid; the phone is the game master, humans perform. Teams.
Timed rounds; a clue-giver draws challenge cards and makes their team guess
the movie:

- **DESCRIBE** — tell the plot; banned words shown (lead actors, director,
  words from the title).
- **SING** — hum/sing a song from the movie (the performer sings; the app never
  displays lyrics).
- **ACT** — dumb-charades it, no words.
- **TRIVIA** — auto-generated from the dataset ("1980, directed by
  K. Viswanath, starring J. V. Somayajulu — name it").

Correct = point + next card; pass = allowed, small penalty. Round timer
(60/90s), then the phone passes to the other team.

Movie pool: famous-biased (Wikipedia-linked subset), optional era filter
(70s/80s/90s/2000s+) so every generation can play.

## 3. Daily Katha — solo, retention

One cryptic plot a day, 3 tries, 4 unlockable hints (decade → director → hero →
dialogue) costing score stars. Streaks + shareable result card.

## Explicitly rejected
- Pass-the-phone Chain (2026-07-20): Chain is a remote-party game; same-room
  play is the Taboo-style mode instead.

## Data
- `data/movies.json` — 5,207 films (1940–2026) scraped from Wikipedia year
  lists: title/year/director/top-billed cast + `linked` popularity flag.
- Katha/lifeline story clues: curated + LLM-written for the linked subset,
  shipped as static JSON.
- Song challenges reference movie titles only — no lyrics are ever stored or
  displayed (copyright + it's more fun when humans sing).

## Media policy (2026-07-21)
- Posters + actor photos come from Wikipedia lead images, fetched on-demand
  in the browser (people.json maps names → articles), cached in localStorage.
- **Kill-switch**: build with `VITE_MEDIA=off` and no image is ever fetched
  or rendered (all call sites no-op; duo cards drop out of decks). REQUIRED
  for any public / store / monetized distribution — posters are studio
  copyright and actor likenesses carry personality rights (see Delhi HC
  injunctions); family-scope use is the only place media stays on.
- Family build (default): media on. Public build command:
  `VITE_MEDIA=off DEPLOY_BASE=/tollyplay/ npm run build`.
