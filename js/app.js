/**
 * app.js
 * ---------------------------------------------------------------------------
 * Entry point. Applies the configured theme, runs the startup splash,
 * boots the HA connection, starts the clock, wires up the connection-status
 * banner, and initializes every feature module once the DOM is ready.
 * ---------------------------------------------------------------------------
 */

(function () {
  const cfg = window.DASHBOARD_CONFIG;

  function applyTheme() {
    document.documentElement.dataset.theme = cfg.theme || "nestDark";
  }

  function tickClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const [time, ampm] = timeStr.split(" ");
    const dateStr = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

    const clockEl = document.getElementById("clock-time");
    const ampmEl = document.getElementById("clock-ampm");
    const dateEl = document.getElementById("clock-date");
    if (clockEl) clockEl.textContent = time;
    if (ampmEl) ampmEl.textContent = ampm || "";
    if (dateEl) dateEl.textContent = dateStr;
  }

  function renderGreeting() {
    const el = document.getElementById("greeting-text");
    if (!el) return;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
    const name = cfg.entities.person.greetingName;
    const icon = hour < 12 ? "wb_twilight" : hour < 18 ? "sunny" : "bedtime";
    el.innerHTML = `${greeting}, <span class="name">${DashUtils.escapeHtml(
      name
    )}</span> <span class="material-symbols-rounded" style="font-size:18px;vertical-align:-3px;color:var(--md-warning);">${icon}</span>`;
  }

  function bindConnectionBanner() {
    const banner = document.getElementById("conn-banner");
    if (!banner) return;
    window.HA.on("connection", ({ status }) => {
      if (status === "connected") {
        banner.classList.remove("is-visible");
      } else if (status === "disconnected") {
        banner.innerHTML = `<span class="material-symbols-rounded">wifi_off</span><span>Reconnecting to Home Assistant…</span>`;
        banner.classList.add("is-visible");
      } else if (status === "auth_failed") {
        banner.innerHTML = `<span class="material-symbols-rounded">error</span><span>Home Assistant authentication failed</span>`;
        banner.classList.add("is-visible");
      } else if (status === "insecure_mismatch") {
        // A config problem, not a transient network blip — stays up and
        // uses a wider layout so the fix is actually readable.
        banner.classList.add("is-visible", "is-persistent");
        banner.innerHTML = `<span class="material-symbols-rounded">error</span><span>This page is HTTPS but Home Assistant's URL is http:// — update <code>homeAssistant.baseUrl</code> in config.js to https://. See Settings for details.</span>`;
      }
    });
  }

  // Every feature module is optional-chained: a module failing to init
  // (missing entity, bad config) never takes the rest of the dashboard
  // down with it — "never crash" per spec.
  function initFeatureModules() {
    const modules = [
      window.WeatherModule,
      window.CalendarModule,
      window.MobileModule,
      window.RingModule,
      window.RoborockModule,
      window.SpotifyModule,
      window.RoomsModule,
      window.FavoritesModule,
      window.ActivityModule,
    ];
    for (const mod of modules) {
      try {
        mod?.init();
      } catch (err) {
        console.error("[app] feature module failed to init", err);
      }
    }
  }

  function boot() {
    applyTheme();
    LoadingModule?.start();

    tickClock();
    renderGreeting();
    setInterval(tickClock, cfg.behavior.clockTickMs);
    setInterval(renderGreeting, 5 * 60000); // greeting only needs to change a few times a day

    bindConnectionBanner();
    window.HA.connect();

    // Give the initial state snapshot a beat to arrive before rendering
    // feature cards, so the first paint isn't full of empty states.
    const unsub = window.HA.on("states_loaded", () => {
      initFeatureModules();
      unsub();
    });

    // Fallback: if HA is unreachable, still render the shell (with empty
    // states) after a short timeout rather than leaving cards blank forever.
    setTimeout(() => {
      if (!window.HA._connected) initFeatureModules();
    }, 4000);

    Navigation.init();
    AmbientModule.init();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
