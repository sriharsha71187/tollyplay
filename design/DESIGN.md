---
name: TollyPlay
colors:
  surface: '#131121'
  surface-dim: '#131121'
  surface-bright: '#3a3748'
  surface-container-lowest: '#0e0c1b'
  surface-container-low: '#1c1a29'
  surface-container: '#201e2d'
  surface-container-high: '#2a2838'
  surface-container-highest: '#353343'
  on-surface: '#e5dff5'
  on-surface-variant: '#d4c4af'
  inverse-surface: '#e5dff5'
  inverse-on-surface: '#312e3f'
  outline: '#9c8f7b'
  outline-variant: '#504535'
  surface-tint: '#f9bc45'
  primary: '#ffda9c'
  on-primary: '#422d00'
  primary-container: '#f5b942'
  on-primary-container: '#6a4a00'
  inverse-primary: '#7c5800'
  secondary: '#ffb2b9'
  on-secondary: '#67001e'
  secondary-container: '#a20234'
  on-secondary-container: '#ffacb4'
  tertiary: '#6efa85'
  on-tertiary: '#003911'
  tertiary-container: '#4fdd6c'
  on-tertiary-container: '#005d21'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdea8'
  primary-fixed-dim: '#f9bc45'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5e4200'
  secondary-fixed: '#ffdadb'
  secondary-fixed-dim: '#ffb2b9'
  on-secondary-fixed: '#40000f'
  on-secondary-fixed-variant: '#91002d'
  tertiary-fixed: '#72fe88'
  tertiary-fixed-dim: '#53e16f'
  on-tertiary-fixed: '#002107'
  on-tertiary-fixed-variant: '#00531c'
  background: '#131121'
  on-background: '#e5dff5'
  surface-variant: '#353343'
typography:
  display-xl:
    fontFamily: Anton
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 72px
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: 0.04em
  headline-lg-mobile:
    fontFamily: Anton
    fontSize: 28px
    fontWeight: '400'
    lineHeight: 34px
  headline-md:
    fontFamily: Anton
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 30px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.1em
  score-display:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 48px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  stack-gap: 16px
  section-gap: 32px
  card-inner: 24px
---

## Brand & Style

The design system is built around the "Night-Show" narrative—capturing the electric atmosphere of a high-energy Tollywood premiere. The personality is premium, cinematic, and socially dynamic. It avoids the flat, "utility-only" look of standard apps in favor of a lush, immersive environment that feels like a physical event.

The design style is **Modern Cinematic**, a hybrid of **Glassmorphism** and **Corporate Modern**. It uses deep, atmospheric layering to create depth, punctuated by glowing "marquee" accents. The emotional response should be one of excitement and exclusivity, positioning the user as the protagonist of their own movie night. Visual interest is maintained through subtle film-grain overlays and soft, directional glows that mimic theater lighting.

## Colors

This design system utilizes a "Lights Down" palette to ensure high contrast for gameplay elements.

- **Primary (Marquee Gold):** Reserved for high-priority actions (CTAs), scores, and winning states. It represents the "glitz" of the industry.
- **Secondary (Magenta-Red):** Used for high-urgency elements like countdown timers, wrong answers, or "Eliminated" states.
- **Tertiary (Success Green):** A crisp emerald green (#34C759) used exclusively for correct answers and player-ready indicators.
- **Background & Surfaces:** The base layer is a deep Midnight Indigo (#12101F). Interactive surfaces and cards use an Elevated Indigo (#1E1B30) to create a clear visual hierarchy without relying on harsh borders.

## Typography

The typography strategy balances "Cinema-Poster" impact with "App-Interface" legibility.

- **Headlines & Scores:** We use **Anton**. Its condensed, bold nature evokes classic movie titles and allows for large, impactful text even on narrow mobile screens. Use `display-xl` for winner announcements and `score-display` for active in-game points.
- **Body & Interface:** We use **Hanken Grotesk**. This geometric sans-serif provides a contemporary, sharp look that balances the expressive headlines. It remains highly legible in dense game lobbies or settings menus.
- **Visual Treatment:** Headlines should often be presented in uppercase to maximize the "poster" aesthetic.

## Layout & Spacing

The layout is **Mobile-First** and relies on a fluid vertical stack. 

- **The Grid:** A 4-column mobile grid with 20px side margins and 16px gutters. 
- **The Rhythm:** Spacing is strictly based on an 8px scale. `16px` for internal card padding, `24px` for prominent headers, and `32px` for section breaks.
- **Safe Areas:** Since this is a game app, interactive elements (buttons/chips) must maintain a minimum 48px hit-target area. 
- **Bottom-Sheets:** For menus and secondary actions, use "chunky" bottom-sheets that slide up, leaving 10% of the screen visible at the top to maintain the sense of immersion in the game room.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Luminous Accents** rather than traditional drop shadows.

1.  **Base (0dp):** Midnight Indigo background with a subtle, low-opacity film grain overlay (approx. 5% opacity).
2.  **Surface (1dp):** Elevated Indigo cards with no border. Depth is signaled by the color shift from the background.
3.  **Active State (2dp):** A "Marquee Glow." Active elements or the currently speaking player’s avatar receive a soft, outer-glow (15px-20px blur) using the Primary Gold color at 30% opacity.
4.  **Overlays:** Modal backgrounds use a backdrop-blur (20px) to desaturate the game board behind them, creating a focused "Theater-Spotlight" effect on the foreground content.

## Shapes

The shape language is bold and exaggerated to feel "friendly but premium."

- **Cards:** Use `rounded-3xl` (1.5rem / 24px) to create soft, chunky surfaces that feel modern and tactile.
- **Buttons:** All primary and secondary buttons must be **full-pill** (rounded-full).
- **Avatars:** Strictly circular. When a player is "active," the circle is encased in a 3px Gold Ring with a slight outer glow.
- **Inputs:** Text fields follow the `rounded-2xl` pattern to match the card aesthetic.

## Components

- **Primary Buttons:** Pill-shaped, Primary Gold background, black text (using Anton). These should have a slight "lift" on press.
- **Game Cards:** `rounded-3xl` using the Surface color. For trivia questions, the card should occupy 60% of the screen height.
- **Timer:** Large `display-xl` type centered at the top. When the timer hits &lt;10 seconds, it transitions from Gold to Secondary Magenta-Red with a subtle "pulsing" animation.
- **Avatars:** 64px circles for lobby view, 48px for in-game sidebars. Active players get the "Gold Marquee" ring.
- **Chips/Selection:** Used for multiple-choice answers. These should have a 1px stroke of the surface color when inactive, and fill with Tertiary Green or Secondary Red upon selection/validation.
- **Bottom-Sheets:** Heavily rounded top corners (32px). Use a "handle" indicator that is 40px wide and 4px tall, centered at the top of the sheet.