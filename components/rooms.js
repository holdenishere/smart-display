/**
 * components/rooms.js
 * ---------------------------------------------------------------------------
 * Living Room card (home page) + full Rooms page. Both are driven by the
 * same `renderDeviceGrid` helper so device-tile behavior stays consistent.
 * ---------------------------------------------------------------------------
 */

const RoomsModule = (() => {
  const cfg = window.DASHBOARD_CONFIG;
  let holdTimer = null;

  const ICONS = {
    light: "lightbulb",
    fan: "mode_fan",
    tv: "tv",
    outlet: "power",
    switch: "toggle_on",
  };

  function isOn(state) {
    return state && (state.state === "on" || state.state === "home" || state.state === "playing");
  }

  function statusLabel(device, state) {
    if (!state) return "—";
    if (device.type === "light" && state.attributes?.brightness && isOn(state)) {
      return "On";
    }
    if (device.type === "tv") return isOn(state) ? "On" : "Off";
    return isOn(state) ? "On" : "Off";
  }

  function deviceTile(device) {
    const state = window.HA.getState(device.entity);
    const on = isOn(state);
    return `
      <button class="device-tile tap-scale ${on ? "is-on" : ""}" data-entity="${device.entity}" data-type="${device.type}">
        <span class="material-symbols-rounded">${ICONS[device.type] || "toggle_on"}</span>
        <span class="dname">${device.name}</span>
        <span class="dstate">${statusLabel(device, state)}</span>
      </button>
    `;
  }

  function bindDeviceTiles(container) {
    container.querySelectorAll(".device-tile").forEach((tile) => {
      const entity = tile.dataset.entity;
      const type = tile.dataset.type;
      let longPressed = false;

      const start = () => {
        longPressed = false;
        holdTimer = setTimeout(() => {
          longPressed = true;
          if (type === "light") openBrightnessSheet(entity);
        }, 500);
      };
      const cancel = () => clearTimeout(holdTimer);
      const end = () => {
        clearTimeout(holdTimer);
        if (!longPressed) window.HA.toggle(entity);
      };

      tile.addEventListener("pointerdown", start);
      tile.addEventListener("pointerup", end);
      tile.addEventListener("pointerleave", cancel);
      tile.addEventListener("pointercancel", cancel);
    });
  }

  function openBrightnessSheet(entity) {
    const state = window.HA.getState(entity);
    const currentPct = state?.attributes?.brightness ? Math.round((state.attributes.brightness / 255) * 100) : 100;

    const sheet = document.createElement("div");
    sheet.style.cssText = `
      position:fixed; inset:0; z-index:200; background:var(--md-scrim);
      display:flex; align-items:flex-end; opacity:0; transition:opacity var(--duration-normal) var(--ease-standard);
    `;
    sheet.innerHTML = `
      <div class="card" style="width:100%;border-radius:var(--radius-lg) var(--radius-lg) 0 0;padding:var(--space-6);">
        <div class="card-title" style="margin-bottom:var(--space-4);">Brightness</div>
        <div class="volume-row">
          <span class="material-symbols-rounded" style="color:var(--md-text-secondary);">light_mode</span>
          <div class="slider-track" id="brightness-track"><div class="slider-fill" style="width:${currentPct}%;"></div></div>
        </div>
      </div>
    `;
    document.body.appendChild(sheet);
    requestAnimationFrame(() => (sheet.style.opacity = "1"));
    sheet.addEventListener("click", (ev) => {
      if (ev.target === sheet) closeSheet();
    });

    const track = sheet.querySelector("#brightness-track");
    track.addEventListener("click", (ev) => {
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((ev.clientX - rect.left) / rect.width, 0), 1);
      track.querySelector(".slider-fill").style.width = `${ratio * 100}%`;
      window.HA.turnOn(entity, { brightness_pct: Math.round(ratio * 100) });
    });

    function closeSheet() {
      sheet.style.opacity = "0";
      setTimeout(() => sheet.remove(), 220);
    }
    setTimeout(closeSheet, 6000);
  }

  function renderLivingRoomCard() {
    const container = document.getElementById("card-living-room");
    if (!container) return;
    const room = cfg.entities.livingRoom;
    const onCount = room.devices.filter((d) => isOn(window.HA.getState(d.entity))).length;

    container.innerHTML = `
      <span class="material-symbols-rounded lamp-illustration">table_lamp</span>
      <div class="card-title">
        Living Room
        <span class="material-symbols-rounded chev">chevron_right</span>
      </div>
      <div style="font:var(--type-caption);color:var(--md-text-secondary);">${onCount} Light${onCount === 1 ? "" : "s"} On</div>
      <div class="device-grid">
        ${room.devices.map(deviceTile).join("")}
      </div>
      <button class="btn btn-ghost btn-block" id="btn-view-all-devices">
        View All Devices <span class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
      </button>
    `;
    bindDeviceTiles(container);
    container
      .querySelector("#btn-view-all-devices")
      ?.addEventListener("click", () => window.Navigation?.goToPage("rooms"));
  }

  function renderRoomsPage() {
    const container = document.getElementById("page-rooms");
    if (!container) return;

    container.innerHTML = `
      <div class="page-heading">Rooms</div>
      ${cfg.entities.rooms
        .map(
          (room) => `
        <div class="room-section anim-fade-in">
          <div class="room-section-title">
            <span class="material-symbols-rounded">${room.icon}</span>
            <span>${room.name}</span>
          </div>
          <div class="card feature-card">
            <div class="device-grid" style="grid-template-columns:repeat(${Math.min(
              room.devices.length,
              4
            )}, 1fr);">
              ${room.devices.map(deviceTile).join("")}
            </div>
          </div>
        </div>
      `
        )
        .join("")}
    `;
    bindDeviceTiles(container);
  }

  function refreshAll() {
    renderLivingRoomCard();
    if (document.getElementById("page-rooms")?.classList.contains("is-active")) renderRoomsPage();
  }

  function init() {
    renderLivingRoomCard();
    const watched = new Set();
    for (const room of [cfg.entities.livingRoom, ...cfg.entities.rooms]) {
      for (const d of room.devices) watched.add(d.entity);
    }
    for (const entity of watched) {
      window.HA.on(`state:${entity}`, refreshAll);
    }
  }

  return { init, renderLivingRoomCard, renderRoomsPage };
})();

window.RoomsModule = RoomsModule;
