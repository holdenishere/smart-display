/**
 * roborock.js
 * ---------------------------------------------------------------------------
 * Roborock card. Reads a vacuum.* entity (Roborock/Xiaomi Miio integration)
 * and issues start/pause/dock service calls. Battery is shown as a circular
 * ring (not just a number) so charge state reads at a glance.
 * ---------------------------------------------------------------------------
 */

const RoborockModule = (() => {
  const entityId = window.DASHBOARD_CONFIG.entities.vacuum.vacuum;
  const RING_RADIUS = 24;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  const STATE_LABELS = {
    docked: "Ready to clean",
    cleaning: "Cleaning",
    paused: "Paused",
    returning: "Returning to dock",
    error: "Error",
    idle: "Idle",
  };

  function batteryRing(pct, isCleaning) {
    const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
    return `
      <div class="battery-ring ${isCleaning ? "is-cleaning" : ""}">
        <svg viewBox="0 0 56 56">
          <circle class="track" cx="28" cy="28" r="${RING_RADIUS}"></circle>
          <circle class="fill" cx="28" cy="28" r="${RING_RADIUS}"
            stroke-dasharray="${RING_CIRCUMFERENCE}" stroke-dashoffset="${offset}"></circle>
        </svg>
        <div class="pct">${pct}%</div>
      </div>
    `;
  }

  function render() {
    const container = document.getElementById("card-roborock");
    if (!container) return;
    const state = window.HA.getState(entityId);

    if (!state) {
      container.innerHTML = `<div class="card-title">Roborock</div>${DashUtils.offlineState(
        "smart_toy",
        "Vacuum not found"
      )}`;
      return;
    }

    const battPct = DashUtils.clamp(state.attributes.battery_level ?? 0, 0, 100);
    const isCleaning = state.state === "cleaning";
    const room = state.attributes.current_room || state.attributes.status;
    const label = STATE_LABELS[state.state] || state.state;

    const signature = { s: state.state, battPct, room };
    if (!DashUtils.shouldRender("roborock", signature)) return;

    container.innerHTML = `
      <div class="card-title">
        Roborock
        <span class="material-symbols-rounded chev">chevron_right</span>
      </div>
      <div class="roborock-body">
        ${batteryRing(battPct, isCleaning)}
        <div style="flex:1;min-width:0;">
          <div class="roborock-status">${label}</div>
          <div class="roborock-sub">
            <span class="material-symbols-rounded ${isCleaning ? "icon-spin" : ""}">${isCleaning ? "autorenew" : "check_circle"}</span>
            <span>${room && isCleaning ? room : label}</span>
          </div>
        </div>
      </div>
      <button class="btn ${isCleaning ? "btn-ghost" : "btn-primary"} btn-block" id="btn-roborock-action">
        <span class="material-symbols-rounded" style="font-size:18px;">${isCleaning ? "pause" : "play_arrow"}</span>
        ${isCleaning ? "Pause" : "Start Cleaning"}
      </button>
    `;

    document.getElementById("btn-roborock-action")?.addEventListener("click", () => {
      if (isCleaning) {
        window.HA.callService("vacuum", "pause", {}, { entity_id: entityId });
      } else {
        window.HA.callService("vacuum", "start", {}, { entity_id: entityId });
      }
    });
  }

  function dock() {
    window.HA.callService("vacuum", "return_to_base", {}, { entity_id: entityId });
  }

  function init() {
    render();
    window.HA.on(`state:${entityId}`, render);
  }

  return { init, render, dock };
})();

window.RoborockModule = RoborockModule;
