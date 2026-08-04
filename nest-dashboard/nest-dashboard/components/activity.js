/**
 * components/activity.js
 * ---------------------------------------------------------------------------
 * Recent Activity card. HA's logbook has no WebSocket subscription for
 * "new entries" as such, so this polls the REST logbook endpoint on a
 * modest interval (see config.behavior.activityRefreshMs) and skips
 * re-rendering when nothing has actually changed.
 * ---------------------------------------------------------------------------
 */

const ActivityModule = (() => {
  const cfg = window.DASHBOARD_CONFIG;

  // icon + accent-tinted category, for at-a-glance scanning of the feed.
  const CATEGORY_MAP = {
    motion: { icon: "directions_run", color: "var(--md-warning)" },
    door: { icon: "door_front", color: "var(--md-accent-strong)" },
    lock: { icon: "lock", color: "var(--md-danger)" },
    unlock: { icon: "lock_open", color: "var(--md-success)" },
    light: { icon: "lightbulb", color: "var(--md-warning)" },
    vacuum: { icon: "smart_toy", color: "var(--md-accent-strong)" },
    camera: { icon: "videocam", color: "var(--md-accent-strong)" },
    default: { icon: "notifications", color: "var(--md-text-secondary)" },
  };

  function categoryFor(entry) {
    const id = entry.entity_id || "";
    if (id.startsWith("binary_sensor.") && /motion/.test(id)) return CATEGORY_MAP.motion;
    if (/door/.test(id)) return CATEGORY_MAP.door;
    if (/lock/.test(id)) return entry.state === "unlocked" ? CATEGORY_MAP.unlock : CATEGORY_MAP.lock;
    if (id.startsWith("light.")) return CATEGORY_MAP.light;
    if (id.startsWith("vacuum.")) return CATEGORY_MAP.vacuum;
    if (id.startsWith("camera.")) return CATEGORY_MAP.camera;
    return CATEGORY_MAP.default;
  }

  async function fetchEntries() {
    const since = new Date(Date.now() - cfg.behavior.activityMaxAgeMs).toISOString();
    try {
      const entries = await window.HA.getLogbook(since);
      return entries
        .filter((e) => e.name && (e.message || e.state))
        .sort((a, b) => new Date(b.when || b.last_changed) - new Date(a.when || a.last_changed))
        .slice(0, cfg.entities.activity.maxItems);
    } catch (err) {
      return null;
    }
  }

  function render(entries) {
    const container = document.getElementById("card-activity");
    if (!container) return;

    if (entries === null) {
      container.innerHTML = `<div class="card-title">Recent Activity</div>${DashUtils.offlineState(
        "history_toggle_off",
        "Activity feed unavailable"
      )}`;
      return;
    }

    if (!entries.length) {
      container.innerHTML = `<div class="card-title">Recent Activity</div>${DashUtils.emptyState(
        "check_circle",
        "No recent activity"
      )}`;
      return;
    }

    container.innerHTML = `
      <div class="card-title">
        Recent Activity
        <span class="material-symbols-rounded chev">chevron_right</span>
      </div>
      <div style="flex:1;overflow-y:auto;">
        ${entries
          .map((e) => {
            const cat = categoryFor(e);
            return `
          <div class="list-row">
            <div class="list-icon"><span class="material-symbols-rounded" style="color:${cat.color};">${cat.icon}</span></div>
            <div class="list-main">
              <div class="list-title">${DashUtils.escapeHtml(e.name)}</div>
              <div class="list-sub">${DashUtils.escapeHtml(e.message || e.state || "")}</div>
            </div>
            <div class="list-time">${DashUtils.fmtRelativeTime(e.when || e.last_changed)}</div>
          </div>
        `;
          })
          .join("")}
      </div>
      <button class="btn btn-ghost btn-block" id="btn-view-all-activity">
        View All Activity <span class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
      </button>
    `;
  }

  async function refresh() {
    const entries = await fetchEntries();
    const signature = entries === null ? "null" : entries.map((e) => `${e.entity_id}|${e.when || e.last_changed}`);
    if (!DashUtils.shouldRender("activity", signature)) return;
    render(entries);
  }

  function init() {
    refresh();
    setInterval(refresh, cfg.behavior.activityRefreshMs);
  }

  return { init, refresh };
})();

window.ActivityModule = ActivityModule;
