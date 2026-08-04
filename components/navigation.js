/**
 * components/navigation.js
 * ---------------------------------------------------------------------------
 * Horizontal swipe-paged navigation + bottom Quick Controls dock.
 * Only `transform` is animated when changing pages (GPU-cheap).
 * ---------------------------------------------------------------------------
 */

const Navigation = (() => {
  const cfg = window.DASHBOARD_CONFIG;
  let track, dotsEl, dockEl;
  let currentIndex = 0;
  let startX = 0;
  let currentTranslate = 0;
  let dragging = false;

  const pageRenderers = {
    rooms: () => window.RoomsModule?.renderRoomsPage(),
    media: () => window.SpotifyModule?.renderMediaPage(),
    weather: () => window.WeatherModule?.renderWeatherPage(),
    cameras: () => window.CamerasPage?.render(),
    settings: () => window.SettingsPage?.render(),
  };

  function goToPage(pageId) {
    const idx = cfg.pages.findIndex((p) => p.id === pageId);
    if (idx >= 0) goToIndex(idx);
  }

  function goToIndex(idx) {
    idx = Math.max(0, Math.min(cfg.pages.length - 1, idx));
    currentIndex = idx;
    track.style.transform = `translateX(-${idx * 100}vw)`;

    document.querySelectorAll(".page").forEach((p, i) => p.classList.toggle("is-active", i === idx));
    document.querySelectorAll(".page-dot").forEach((d, i) => d.classList.toggle("is-active", i === idx));
    document.querySelectorAll(".dock-btn[data-page]").forEach((b) => {
      b.classList.toggle("is-active", b.dataset.page === cfg.pages[idx].id);
    });

    const pageId = cfg.pages[idx].id;
    pageRenderers[pageId]?.();
  }

  function bindSwipe() {
    track.addEventListener("pointerdown", (ev) => {
      dragging = true;
      startX = ev.clientX;
      track.style.transition = "none";
    });
    track.addEventListener("pointermove", (ev) => {
      if (!dragging) return;
      const dx = ev.clientX - startX;
      currentTranslate = -currentIndex * window.innerWidth + dx;
      track.style.transform = `translateX(${currentTranslate}px)`;
    });
    const endDrag = (ev) => {
      if (!dragging) return;
      dragging = false;
      track.style.transition = "";
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > cfg.behavior.swipeThresholdPx) {
        goToIndex(currentIndex + (dx < 0 ? 1 : -1));
      } else {
        goToIndex(currentIndex);
      }
    };
    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointerleave", (ev) => {
      if (dragging) endDrag(ev);
    });
  }

  // ---- Quick controls dock -------------------------------------------------

  const ACTIONS = {
    toggleAllLights: () => {
      const allLights = [
        ...cfg.entities.livingRoom.devices.filter((d) => d.type === "light"),
        ...cfg.entities.rooms.flatMap((r) => r.devices.filter((d) => d.type === "light")),
      ].map((d) => d.entity);
      const anyOn = allLights.some((e) => window.HA.getState(e)?.state === "on");
      for (const e of allLights) (anyOn ? window.HA.turnOff(e) : window.HA.turnOn(e));
    },
    goToScenes: () => goToPage("dashboard"), // scenes live on dashboard favorites card
    goToCameras: () => goToPage("cameras"),
    goToRoborock: () => goToPage("dashboard"),
    openVolumeSlider: () => goToPage("media"),
    openBrightnessSlider: () => goToPage("rooms"),
    toggleDND: (btn) => {
      const entity = cfg.entities.dndHelper;
      if (!entity) return;
      window.HA.toggle(entity);
    },
    goToSettings: () => goToPage("settings"),
  };

  function renderDock() {
    dockEl.innerHTML = cfg.entities.quickControls
      .map((c, i) => {
        const divider = i === 4 ? '<div class="dock-divider"></div>' : "";
        return `${divider}<button class="dock-btn" data-action="${c.action}" data-page="${
          pageForAction(c.action) || ""
        }">
          <span class="material-symbols-rounded">${c.icon}</span>
          <span class="dlabel">${c.label}</span>
        </button>`;
      })
      .join("");

    dockEl.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => ACTIONS[btn.dataset.action]?.(btn));
    });
  }

  function pageForAction(action) {
    const map = {
      goToCameras: "cameras",
      openVolumeSlider: "media",
      openBrightnessSlider: "rooms",
      goToSettings: "settings",
    };
    return map[action];
  }

  function renderDots() {
    dotsEl.innerHTML = cfg.pages
      .map(
        (p, i) =>
          `<div class="page-dot ${i === 0 ? "is-active" : ""}" tabindex="0" role="button" aria-label="Go to ${p.label}"></div>`
      )
      .join("");
    dotsEl.querySelectorAll(".page-dot").forEach((dot, i) => {
      dot.addEventListener("click", () => goToIndex(i));
      dot.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          goToIndex(i);
        }
      });
    });
  }

  function bindKeyboard() {
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "ArrowRight") goToIndex(currentIndex + 1);
      if (ev.key === "ArrowLeft") goToIndex(currentIndex - 1);
    });
  }

  function init() {
    track = document.getElementById("page-track");
    dotsEl = document.getElementById("page-dots");
    dockEl = document.getElementById("dock");
    renderDots();
    renderDock();
    bindSwipe();
    bindKeyboard();
    goToIndex(0);
  }

  return { init, goToPage, goToIndex };
})();

window.Navigation = Navigation;
