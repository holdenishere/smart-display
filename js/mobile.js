/**
 * mobile.js
 * ---------------------------------------------------------------------------
 * Phone status card. Reads sensors published by the Home Assistant
 * Companion App (battery, charging, wifi, last update).
 * ---------------------------------------------------------------------------
 */

const MobileModule = (() => {
  const cfg = window.DASHBOARD_CONFIG.entities.phone;

  function batteryColor(pct, isCharging) {
    if (isCharging) return "var(--md-battery-healthy)";
    if (pct <= 15) return "var(--md-danger)";
    if (pct <= 30) return "var(--md-warning)";
    return "var(--md-battery-healthy)";
  }

  function render() {
    const container = document.getElementById("card-phone");
    if (!container) return;

    const battState = window.HA.getState(cfg.battery);
    const chargingState = window.HA.getState(cfg.charging);
    const wifiState = window.HA.getState(cfg.wifi);

    if (!battState) {
      container.innerHTML = `<div class="card-title">Phone</div>${DashUtils.offlineState(
        "phonelink_erase",
        "Phone not found"
      )}`;
      return;
    }

    const pct = DashUtils.clamp(Math.round(parseFloat(battState.state)) || 0, 0, 100);
    const isCharging = chargingState?.state === "on";
    const isWifi = wifiState?.state === "on";
    const personName = window.DASHBOARD_CONFIG.entities.person.greetingName;

    const signature = { pct, isCharging, isWifi };
    if (!DashUtils.shouldRender("phone", signature)) return;

    const wifiIcon = isWifi ? "wifi" : "wifi_off";
    const statusIcon = isCharging ? "bolt" : wifiIcon;
    const statusLabel = isCharging ? "Charging" : isWifi ? "Connected" : "Not on Wi-Fi";

    container.innerHTML = `
      <div class="card-title">${personName}'s iPhone</div>
      <div class="phone-body">
        <div class="phone-icon"><span class="material-symbols-rounded">smartphone</span></div>
        <div class="phone-stats">
          <div class="battery-row">
            <span class="battery-pct">${pct}%</span>
            <div class="battery-bar"><div class="fill" style="width:${pct}%;background:${batteryColor(
      pct,
      isCharging
    )};"></div></div>
          </div>
          <div class="phone-status-line ${isCharging ? "is-charging" : ""}">
            <span class="material-symbols-rounded">${statusIcon}</span>
            <span>${statusLabel}</span>
          </div>
        </div>
      </div>
    `;
  }

  function init() {
    render();
    for (const entityId of [cfg.battery, cfg.charging, cfg.wifi]) {
      window.HA.on(`state:${entityId}`, render);
    }
  }

  return { init, render };
})();

window.MobileModule = MobileModule;
