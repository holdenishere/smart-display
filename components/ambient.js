/**
 * components/ambient.js
 * ---------------------------------------------------------------------------
 * After N seconds of no touch input, fades to a minimal ambient screen:
 * large clock, small date, current weather, next calendar event, over a
 * wallpaper. Any tap restores the full dashboard. Only opacity is animated
 * (GPU-cheap), and the fade itself is deliberately slow (see
 * --duration-ambient) rather than the snappy 150-200ms used elsewhere.
 * ---------------------------------------------------------------------------
 */

const AmbientModule = (() => {
  const cfg = window.DASHBOARD_CONFIG;
  let idleTimer = null;
  let el = null;
  let active = false;

  function build() {
    el = document.createElement("div");
    el.id = "ambient";
    if (window.WallpaperModule) {
      el.style.backgroundImage = window.WallpaperModule.cssBackground();
    }
    el.innerHTML = `
      <div class="ambient-content">
        <div class="ambient-clock" id="ambient-clock">--:--</div>
        <div class="ambient-date" id="ambient-date"></div>
        <div class="ambient-sub" id="ambient-weather">
          <span class="material-symbols-rounded">sunny</span><span>--°</span>
        </div>
        <div class="ambient-sub" id="ambient-event"></div>
      </div>
    `;
    document.body.appendChild(el);
  }

  function updateContent() {
    if (!el) return;
    const now = new Date();

    const clockEl = document.getElementById("ambient-clock");
    if (clockEl) clockEl.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

    const dateEl = document.getElementById("ambient-date");
    if (dateEl) dateEl.textContent = now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });

    const weatherState = window.HA.getState(cfg.entities.weather.weather);
    const weatherEl = document.getElementById("ambient-weather");
    if (weatherEl && weatherState) {
      const temp = Math.round(weatherState.attributes.temperature || 0);
      weatherEl.innerHTML = `<span class="material-symbols-rounded">sunny</span><span>${temp}°</span>`;
    }

    const eventEl = document.getElementById("ambient-event");
    if (eventEl && window.CalendarModule?.getCachedNextEvent) {
      const next = window.CalendarModule.getCachedNextEvent();
      eventEl.innerHTML = next
        ? `<span class="material-symbols-rounded">event</span><span>${DashUtils.escapeHtml(next.summary || "")}</span>`
        : "";
    }
  }

  function show() {
    if (!el) build();
    if (window.WallpaperModule) el.style.backgroundImage = window.WallpaperModule.cssBackground();
    updateContent();
    el.classList.add("is-visible");
    active = true;
  }

  function hide() {
    if (!el) return;
    el.classList.remove("is-visible");
    active = false;
  }

  function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (active) hide();
    idleTimer = setTimeout(show, cfg.behavior.ambientTimeoutMs);
  }

  function init() {
    build();
    ["pointerdown", "pointermove", "keydown"].forEach((evt) =>
      document.addEventListener(evt, resetIdleTimer, { passive: true })
    );
    el.addEventListener("pointerdown", (ev) => {
      ev.stopPropagation();
      hide();
      resetIdleTimer();
    });
    resetIdleTimer();
    setInterval(() => {
      if (active) updateContent();
    }, 15000);
  }

  return { init, show, hide };
})();

window.AmbientModule = AmbientModule;
