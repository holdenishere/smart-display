/**
 * components/settings_page.js
 * ---------------------------------------------------------------------------
 * Settings page (Page 6). Connection diagnostics + a couple of dashboard-
 * level toggles. Deliberately light — most real settings live in HA itself.
 * ---------------------------------------------------------------------------
 */

const SettingsPage = (() => {
  const cfg = window.DASHBOARD_CONFIG;

  function render() {
    const container = document.getElementById("page-settings");
    if (!container) return;

    const dndEntity = cfg.entities.dndHelper;
    const dndOn = dndEntity ? window.HA.getState(dndEntity)?.state === "on" : false;

    container.innerHTML = `
      <div class="page-heading">Settings</div>

      <div class="card feature-card anim-fade-in" style="margin-bottom:var(--card-gap);">
        <div class="card-title">Connection</div>
        <div class="settings-list">
          <div class="list-row">
            <div class="list-icon"><span class="material-symbols-rounded">home</span></div>
            <div class="list-main">
              <div class="list-title">Home Assistant</div>
              <div class="list-sub">${cfg.homeAssistant.baseUrl}</div>
            </div>
            <span class="status-dot" id="settings-conn-dot"></span>
          </div>
        </div>
      </div>

      <div class="card feature-card anim-fade-in" style="margin-bottom:var(--card-gap);">
        <div class="card-title">Dashboard</div>
        <div class="settings-list">
          <div class="list-row" id="row-dnd">
            <div class="list-icon"><span class="material-symbols-rounded">dark_mode</span></div>
            <div class="list-main">
              <div class="list-title">Do Not Disturb</div>
              <div class="list-sub">Mute activity notifications</div>
            </div>
            <div class="toggle-pill ${dndOn ? "is-on" : ""}" id="dnd-toggle"><div class="knob"></div></div>
          </div>
          <div class="list-row">
            <div class="list-icon"><span class="material-symbols-rounded">brightness_6</span></div>
            <div class="list-main">
              <div class="list-title">Ambient Mode</div>
              <div class="list-sub">Fades after ${Math.round(cfg.behavior.ambientTimeoutMs / 1000)}s idle</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card feature-card anim-fade-in">
        <div class="card-title">About</div>
        <div class="settings-list">
          <div class="list-row">
            <div class="list-icon"><span class="material-symbols-rounded">info</span></div>
            <div class="list-main">
              <div class="list-title">Smart Display Dashboard</div>
              <div class="list-sub">v1.0.0 · Running on WallPanel</div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#dnd-toggle")?.addEventListener("click", () => {
      if (dndEntity) window.HA.toggle(dndEntity);
    });

    const dot = document.getElementById("settings-conn-dot");
    if (dot) dot.style.background = window.HA._connected ? "var(--md-success)" : "var(--md-danger)";
  }

  return { render };
})();

window.SettingsPage = SettingsPage;
