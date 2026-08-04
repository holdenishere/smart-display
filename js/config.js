/**
 * config.js
 * ---------------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for this dashboard.
 *
 * Every Home Assistant entity ID, connection detail, and tunable used
 * anywhere in the app is declared here. No other file should ever contain
 * a hardcoded entity_id — if you need a new one, add it here first.
 *
 * Copy this file, fill in your own values, and you're up and running.
 * ---------------------------------------------------------------------------
 */

window.DASHBOARD_CONFIG = {

  // ---------------------------------------------------------------------
  // Home Assistant connection
  // ---------------------------------------------------------------------
  homeAssistant: {
    // Base URL of your HA instance, no trailing slash.
    // e.g. "http://homeassistant.local:8123" or "https://ha.mydomain.com"
    baseUrl: "http://homeassistant.local:8123",

    // Long-Lived Access Token, created under your HA Profile > Security.
    // NOTE: for a kiosk device on a trusted local network this is the
    // simplest option. For anything internet-facing, put this dashboard
    // behind HA's built-in auth proxy or a reverse proxy with its own auth.
    token: "REPLACE_WITH_LONG_LIVED_ACCESS_TOKEN",

    // Reconnect backoff for the WebSocket connection (ms).
    reconnectMinDelay: 1000,
    reconnectMaxDelay: 30000,
  },

  // ---------------------------------------------------------------------
  // Entities — grouped by feature. Every card reads from here, never
  // from a hardcoded string in its render function.
  // ---------------------------------------------------------------------
  entities: {

    weather: {
      // A weather.* entity, ideally backed by HA's OpenWeatherMap
      // integration (Settings > Devices & Services > Add Integration >
      // OpenWeatherMap). Forecasts are pulled via weather.get_forecasts.
      weather: "weather.home",
    },

    person: {
      // The person entity used for the greeting name + presence.
      person: "person.alex",
      greetingName: "Alex",
    },

    phone: {
      battery: "sensor.alex_iphone_battery_level",
      charging: "binary_sensor.alex_iphone_charging",
      wifi: "binary_sensor.alex_iphone_wifi_connection",
      lastUpdated: "sensor.alex_iphone_last_update_trigger",
      // Optional — set to null to hide the "locate" affordance.
      deviceTracker: "device_tracker.alex_iphone",
    },

    calendar: {
      // One or more calendar.* entities. The soonest upcoming event
      // across all of them is shown as "Up Next".
      entities: ["calendar.family", "calendar.work"],
    },

    cameras: {
      // Ordered list — order here is the order they render in.
      entities: [
        { entity: "camera.front_door", name: "Front Door" },
        { entity: "camera.driveway", name: "Driveway" },
        { entity: "camera.backyard", name: "Backyard" },
      ],
    },

    vacuum: {
      vacuum: "vacuum.roborock",
    },

    media_player: {
      // Any HA media_player entity — Spotify integration, cast, etc.
      player: "media_player.spotify_alex",
    },

    livingRoom: {
      name: "Living Room",
      devices: [
        { entity: "light.living_room_lights", name: "Lights", type: "light" },
        { entity: "fan.living_room_fan", name: "Fan", type: "fan" },
        { entity: "media_player.living_room_tv", name: "TV", type: "tv" },
        { entity: "switch.living_room_outlet", name: "Outlet", type: "outlet" },
      ],
    },

    // Additional rooms shown on the "Rooms" page. Home screen only
    // shows `livingRoom` above, per the mockup.
    rooms: [
      {
        name: "Living Room",
        icon: "weekend",
        devices: [
          { entity: "light.living_room_lights", name: "Lights", type: "light" },
          { entity: "fan.living_room_fan", name: "Fan", type: "fan" },
          { entity: "media_player.living_room_tv", name: "TV", type: "tv" },
          { entity: "switch.living_room_outlet", name: "Outlet", type: "outlet" },
        ],
      },
      {
        name: "Bedroom",
        icon: "bed",
        devices: [
          { entity: "light.bedroom_lights", name: "Lights", type: "light" },
          { entity: "fan.bedroom_fan", name: "Fan", type: "fan" },
        ],
      },
      {
        name: "Kitchen",
        icon: "kitchen",
        devices: [
          { entity: "light.kitchen_lights", name: "Lights", type: "light" },
          { entity: "switch.kitchen_outlet", name: "Outlet", type: "outlet" },
        ],
      },
    ],

    scenes: [
      { entity: "scene.good_morning", name: "Good Morning", icon: "wb_twilight" },
      { entity: "scene.good_night", name: "Good Night", icon: "bedtime" },
      { entity: "scene.movie_time", name: "Movie Time", icon: "movie" },
      { entity: "scene.away", name: "Away", icon: "home" },
    ],

    // Quick Controls dock. `action` maps to a handler in navigation.js.
    quickControls: [
      { icon: "lightbulb", label: "Lights", action: "toggleAllLights" },
      { icon: "auto_awesome_mosaic", label: "Scenes", action: "goToScenes" },
      { icon: "videocam", label: "Cameras", action: "goToCameras" },
      { icon: "smart_toy", label: "Roborock", action: "goToRoborock" },
      { icon: "volume_up", label: "Volume", action: "openVolumeSlider" },
      { icon: "brightness_6", label: "Brightness", action: "openBrightnessSlider" },
      { icon: "dark_mode", label: "Do Not Disturb", action: "toggleDND", entity: "input_boolean.dashboard_dnd" },
      { icon: "settings", label: "Settings", action: "goToSettings" },
    ],

    // logbook / recent activity feed
    activity: {
      // HA logbook entities to watch. Leave empty to watch everything.
      watchEntities: [],
      maxItems: 6,
    },

    // Helper entity dashboard writes to when DND is toggled (optional).
    dndHelper: "input_boolean.dashboard_dnd",
  },

  // ---------------------------------------------------------------------
  // Theme — controls ONLY the accent color (buttons, sliders, progress
  // bars, icons in an active/selected state, selection highlights, graph
  // lines, and healthy-battery fills). Surfaces, text, and status colors
  // (success/warning/danger) never change between themes.
  // One of: "nestDark" | "blue" | "green" | "purple" | "orange" | "monochrome"
  // ---------------------------------------------------------------------
  theme: "nestDark",

  // ---------------------------------------------------------------------
  // Wallpaper — used by Ambient Mode (and, in "background" mode, faintly
  // behind the dashboard itself, since the spec calls for a solid dark
  // dashboard background).
  //
  // mode:
  //   "static"      — always show wallpaper.files[0]
  //   "rotating"    — a new wallpaper each day, cycling through wallpaper.files
  //   "ambient-only" — same as static, but scoped to ambient mode only (default)
  //   "none"        — no wallpaper; ambient falls back to a plain dark background
  // ---------------------------------------------------------------------
  wallpaper: {
    mode: "ambient-only",
    files: ["assets/wallpapers/ambient-default.jpg"],
    overlayOpacity: { top: 0.15, bottom: 0.6 }, // gradient scrim for text readability
  },

  // ---------------------------------------------------------------------
  // Behavior tuning
  // ---------------------------------------------------------------------
  behavior: {
    ambientTimeoutMs: 60000,      // idle time before ambient mode
    clockTickMs: 1000,            // clock update interval
    weatherRefreshMs: 10 * 60000, // 10 min
    calendarRefreshMs: 5 * 60000, // 5 min
    activityRefreshMs: 30000,     // 30s (logbook poll fallback)
    activityMaxAgeMs: 24 * 3600000,
    swipeThresholdPx: 60,
    units: "imperial",            // "imperial" | "metric" — affects only display formatting

    // Motion — Google-style: short, smooth, never flashy.
    transitionMs: 180,            // standard UI transition (buttons, toggles, sliders)
    pageTransitionMs: 220,        // page-to-page swipe/fade
    cardStaggerMs: 40,            // delay between successive card fade-ins on first paint

    // Loading splash sequence (ms per status line before it advances).
    splashStepMs: 550,
  },

  // ---------------------------------------------------------------------
  // Pages shown in the horizontal swipe nav, in order.
  // ---------------------------------------------------------------------
  pages: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "rooms", label: "Rooms", icon: "weekend" },
    { id: "media", label: "Media", icon: "music_note" },
    { id: "weather", label: "Weather", icon: "partly_cloudy_day" },
    { id: "cameras", label: "Cameras", icon: "videocam" },
    { id: "settings", label: "Settings", icon: "settings" },
  ],

};
