# TollyPlay — Stitch UX Brief

## Global style prompt (paste first, applies to every screen)

Design a mobile-first game app called **TollyPlay** — a social party game for Telugu (Tollywood) movie fans. Two game modes: "Chain" (players link movies through shared actors/directors) and "Katha" (guess the movie from a cryptic plot).

**Vibe:** Night-show cinema. Dark, premium, playful — NOT childish. Think a modern streaming app crossed with a party game.

- **Palette:** Deep midnight indigo background (#12101f), elevated card surfaces (#1e1b30). Primary accent: marquee gold (#f5b942) for CTAs and scores. Secondary accent: vibrant magenta-red (#e4405f) for timers/urgency. Success green only for correct answers.
- **Typography:** Bold condensed display type for titles (cinema-poster energy), clean geometric sans for body. Numbers (scores, timers) are big and expressive.
- **Texture:** Subtle film-grain on backgrounds, soft gold glow on active elements. Movie posters appear as rounded-corner cards with slight tilt when stacked.
- **Components:** Rounded pill buttons, chunky bottom-sheet modals, avatar circles with gold ring for active player. Bottom tab bar: Home, Daily, Rooms, Profile.
- **Motion cues (annotate, don't animate):** chain links snap together; timer ring drains around avatar; confetti on correct guess.

Design for iPhone-size mobile first; we'll ask for web/desktop variants of key screens after.

---

## Screen prompts (paste one at a time)

### 1. Home
Home screen. Big greeting with player avatar and streak flame badge. Hero card: today's **Daily Katha** puzzle (cryptic plot teaser blurred behind a "Play today's puzzle" CTA, streak count visible). Below, two large mode cards side by side: **Chain** (icon: linked film reels) and **Katha** (icon: closed storybook with a film clapper). Prominent "Create Party Room" gold button and a smaller "Join with code" text button. Friend leaderboard strip at the bottom showing top 3 avatars and weekly points.

### 2. Room lobby
Party room lobby screen. Room code displayed huge at top (6 letters, tap-to-copy, share button for WhatsApp). Grid of joined player avatars with names — host has a crown, empty slots shown as dashed circles ("Waiting…"). Mode selector segmented control: Chain / Katha. Collapsible settings panel: turn timer (15/30/45s), rounds, "link exhaustion" limit (each actor usable max 3×). Big gold "Start Game" button pinned at bottom (host only), others see "Waiting for host…".

### 3. Chain — gameplay
The core Chain game screen. Top: horizontal scrolling chain of movie poster cards, each connected to the next by a small **person chip** (photo + name of the shared actor/director) — the newest movie slides in from the right. Center: current player's avatar with a draining timer ring (gold → red as time runs out). Below: a search input "Name a movie…" with autocomplete dropdown showing poster thumbnails. Chips above the keyboard show the three valid link targets (hero, heroine, director of the last movie), each with a small "×2 uses left" counter. A red "Challenge!" button floats bottom-left for disputing the previous claim. Other players' avatars in a row at top with live scores.

### 4. Chain — link verdict (modal)
Bottom-sheet modal that appears after a movie is played. Poster on the left; big verdict stamp: **VALID LINK** (gold) or **BROKEN CHAIN** (red). Shows the proof: "Both feature **Prakash Raj**" with the person's photo, and the movie's year + director. Points earned with a rarity bonus callout: "+5 Deep Cut bonus — only 2% of players know this one". Auto-dismiss progress bar.

### 5. Chain — results
End-of-game results screen. Podium-style top 3 with avatars. Scrollable score breakdown per player: chain links made, deep-cut bonuses, challenges won/lost. A "Longest chain" showcase: the full movie chain rendered as small connected posters. Buttons: "Rematch" (gold), "Share result", "Back to room".

### 6. Katha — daily puzzle
Daily puzzle screen. A parchment-style card (dark theme, gold border) with today's cryptic plot in large type, e.g. "A ghost hires a body to finish his unfinished business." Guess input with movie autocomplete. Below, four hint tiles, locked with padlock icons, that unlock one at a time: Decade → Director → Hero → Famous dialogue. Each used hint dims a score star (start with 5 stars). After solving: reveal card with poster + confetti and a Wordle-style shareable result card (star row + streak) with a WhatsApp share button.

### 7. Katha — party (write & guess)
Two states of the party Katha screen. **State A — writing:** prompt "Disguise your movie!" with the player's secret assigned movie shown at top (poster, small), a large text area to write a cryptic one-line plot, character counter, and a "tips" hint row (no names, no songs, be sneaky). Timer at top. **State B — guessing:** another player's cryptic plot shown big on the parchment card, guess input with autocomplete, and player avatars below showing who has already guessed (checkmark) — writer's avatar highlighted. Scoring hint at bottom: "Best score when SOME players guess it — not all, not none."

### 8. Profile & stats
Profile screen. Avatar, editable display name, streak flame with count. Stat tiles: total wins, deep cuts played, best daily-puzzle streak, favorite era (e.g. "90s expert" badge). Row of earned badges (Deep Cut Hunter, Chain Breaker, Kathakudu). Friends list with head-to-head records. Settings gear.

---

## Web/desktop follow-up prompts

After the mobile set, re-request screens 1, 3, and 7 as **desktop web** layouts: same design system, chain rendered as a full-width horizontal timeline, room players in a right sidebar, guess input centered.

## Out of scope for Stitch

Auth screens, empty states, and the movie-detail sheet — I'll derive those from the design system in code.
