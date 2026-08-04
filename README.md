# Smart Display Dashboard

A Nest Hub–style dashboard for Home Assistant, built as static HTML/CSS/JS
for GitHub Pages and tuned to run smoothly inside WallPanel on a 1st‑gen
Echo Show 5 (960×480).

## 1. Configure

Open `js/config.js` and fill in:

1. **`homeAssistant.baseUrl`** — your HA instance URL, reachable from the
   Echo Show (e.g. `http://homeassistant.local:8123`).
2. **`homeAssistant.token`** — a Long-Lived Access Token from your HA
   profile (Settings → your profile → Security → Long-Lived Access
   Tokens).
3. **`entities`** — every `entity_id` the dashboard reads from: weather,
   person, phone sensors, calendars, cameras, vacuum, media player, rooms,
   scenes, and quick controls. Nothing is hardcoded anywhere else in the
   codebase — if a card is blank, it's because an entity ID here doesn't
   match anything in your HA instance.

HA integrations this expects to already be set up: **OpenWeatherMap**
(as a `weather.*` entity), a **calendar** platform (Google Calendar,
CalDAV, local), the **HA Companion App** (for phone sensors), **Ring**,
a **Roborock/Xiaomi Miio** vacuum integration, and **Spotify** (via a
`media_player.*` entity).

> ⚠️ A Long-Lived Access Token grants full API access. This dashboard is
> designed for a trusted local network. If you expose it over the
> internet, put it behind your own auth (e.g. a reverse proxy) rather
> than relying on the token alone.

## 2. Run locally

No build step — just serve the folder:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## 3. Deploy to GitHub Pages

Push this folder to a repo and enable Pages (Settings → Pages → Deploy
from branch → `/` root). Point the Echo Show's WallPanel app at the
published URL.

## Architecture

```
/index.html            Page shell — all card containers, script tags
/css/themes.css         Design tokens (color, type, spacing, motion)
/css/styles.css         Layout + component styles
/js/config.js           Single source of truth for entities & settings
/js/homeassistant.js    WebSocket + REST client, state cache, pub/sub
/js/app.js              Boot sequence, theme, splash, clock, module init
/js/weather.js          Weather card + Weather page (keeps last-good data on fetch failure)
/js/calendar.js         Up Next card + Calendar card (current-event highlight)
/js/mobile.js           Phone status card (charging pulse, dynamic battery fill)
/js/ring.js             Ring cameras card + fullscreen viewer (skeleton + offline states)
/js/roborock.js         Roborock card (circular battery ring, animated cleaning state)
/js/spotify.js          Spotify card + Media page (album-art crossfade, unavailable dimming)
/components/utils.js         Shared escape/empty-state/dirty-check helpers
/components/wallpaper.js     Static / rotating / ambient-only / none wallpaper resolution
/components/rooms.js         Living Room card + Rooms page
/components/favorites.js     Scene buttons
/components/activity.js      Recent Activity feed (color-coded categories)
/components/ambient.js       Idle → ambient screen (clock, date, weather, next event)
/components/loading.js       Startup splash sequence
/components/navigation.js    Swipe paging + Quick Controls dock + keyboard nav
/components/cameras_page.js  Full camera grid page
/components/settings_page.js Settings page
/assets/wallpapers/          Wallpaper images (ambient mode)
```

## Theming

Set `theme` in `js/config.js` to one of: `"nestDark"` (default), `"blue"`,
`"green"`, `"purple"`, `"orange"`, `"monochrome"`. Only the accent color
changes — buttons, sliders, progress bars, active icons, selection states,
and healthy-battery fills. Surfaces, text, and safety colors (low-battery
warning/danger) are identical across every theme.

## Wallpapers

Configured under `wallpaper` in `js/config.js`:

- `mode: "static"` — always the first file in `wallpaper.files`
- `mode: "rotating"` — a new file each calendar day, cycling through the list
- `mode: "ambient-only"` (default) — same as static, shown only in Ambient Mode
- `mode: "none"` — no wallpaper; Ambient Mode falls back to a plain dark background

Drop images in `assets/wallpapers/` and list their paths in `wallpaper.files`.
A dark gradient scrim (`wallpaper.overlayOpacity`) is applied automatically
for text readability.

## Accessibility

- Touch targets sized to at least 40px.
- `prefers-reduced-motion` collapses all transitions/animations to near-instant.
- Left/Right arrow keys page through the dashboard for desktop testing;
  page dots and camera tiles are keyboard-focusable.
- Secondary text contrast tuned for AA against the dark surfaces.

## Performance notes

- One persistent WebSocket connection; no polling for entity state.
  (Logbook and camera thumbnails poll on modest intervals since HA has
  no push API for those.)
- Cards skip re-rendering when their underlying data hasn't changed
  (see `DashUtils.shouldRender`), so a 15s poll tick that returns
  identical data touches zero DOM nodes.
- Camera thumbnail blob URLs are revoked after each refresh to avoid
  unbounded memory growth over long uptimes.
- Sub-pages (Rooms, Media, Weather, Cameras, Settings) render lazily —
  only when the user actually swipes to them.
- All motion animates only `opacity`/`transform`.
- No `backdrop-filter`, no canvas, no build framework — plain DOM.
- Icons are Material Symbols Rounded, loaded as a **subsetted** webfont
  (only the icon names this dashboard actually uses), not the full set.
