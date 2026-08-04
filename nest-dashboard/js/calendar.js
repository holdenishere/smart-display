/**
 * calendar.js
 * ---------------------------------------------------------------------------
 * "Up Next" hero card + the full Calendar card on the home page. Pulls
 * events for the configured calendar.* entities via HA's REST calendar API
 * (WS has no calendar event endpoint as of current HA versions).
 * ---------------------------------------------------------------------------
 */

const CalendarModule = (() => {
  const cfg = window.DASHBOARD_CONFIG;
  const dotColors = ["var(--md-accent)", "#c58af9", "#f28b82", "#81c995", "#fdd663"];
  let cachedEvents = [];

  function isCurrent(event) {
    if (isAllDay(event)) return false;
    const now = Date.now();
    const s = new Date(event.start.dateTime).getTime();
    const e = new Date(event.end.dateTime).getTime();
    return now >= s && now <= e;
  }

  async function fetchAllEvents() {
    const now = new Date();
    const end = new Date(now.getTime() + 3 * 24 * 3600 * 1000); // next 3 days
    const results = [];
    for (const entityId of cfg.entities.calendar.entities) {
      try {
        const events = await window.HA.getCalendarEvents(entityId, now, end);
        for (const e of events) results.push({ ...e, entityId });
      } catch (err) {
        console.warn(`[calendar] failed to load ${entityId}`, err);
      }
    }
    results.sort((a, b) => new Date(startOf(a)) - new Date(startOf(b)));
    return results;
  }

  function startOf(event) {
    return event.start?.dateTime || event.start?.date;
  }

  function isAllDay(event) {
    return !event.start?.dateTime;
  }

  function fmtTime(event) {
    if (isAllDay(event)) return "All day";
    const d = new Date(event.start.dateTime);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function fmtRange(event) {
    if (isAllDay(event)) return "All day";
    const s = new Date(event.start.dateTime);
    const e = new Date(event.end.dateTime);
    const opts = { hour: "numeric", minute: "2-digit" };
    return `${s.toLocaleTimeString([], opts)} – ${e.toLocaleTimeString([], opts)}`;
  }

  function dayLabel(event, todayStr, tomorrowStr) {
    const d = new Date(startOf(event));
    const dStr = d.toDateString();
    if (dStr === todayStr) return "Today";
    if (dStr === tomorrowStr) return "Tomorrow";
    return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
  }

  async function renderUpNext(events) {
    const container = document.getElementById("card-upnext");
    if (!container) return;
    const next = events[0];

    if (!next) {
      container.innerHTML = `
        <div class="upnext-header">
          <div class="upnext-icon"><span class="material-symbols-rounded">event_available</span></div>
          <div>
            <div class="upnext-eyebrow">All Clear</div>
            <div class="upnext-title">No upcoming events</div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="upnext-header">
        <div class="upnext-icon"><span class="material-symbols-rounded">event</span></div>
        <div>
          <div class="upnext-eyebrow">Up Next</div>
          <div class="upnext-title">${DashUtils.escapeHtml(next.summary || "Untitled event")}</div>
          <div class="upnext-time">${fmtRange(next)}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-block" id="btn-view-calendar">
        View Full Calendar <span class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
      </button>
    `;
    document
      .getElementById("btn-view-calendar")
      ?.addEventListener("click", () => window.Navigation?.goToPage("dashboard"));
  }

  function renderCalendarCard(events) {
    const container = document.getElementById("card-calendar");
    if (!container) return;

    if (!events.length) {
      container.innerHTML = `<div class="card-title">Calendar</div>${DashUtils.emptyState(
        "event_busy",
        "No events in the next few days"
      )}`;
      return;
    }

    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    const todayStr = today.toDateString();
    const tomorrowStr = tomorrow.toDateString();

    const groups = new Map();
    for (const e of events.slice(0, 6)) {
      const label = dayLabel(e, todayStr, tomorrowStr);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(e);
    }

    let html = `
      <div class="card-title">
        Calendar
        <span class="material-symbols-rounded chev">chevron_right</span>
      </div>
      <div style="flex:1;overflow-y:auto;">
    `;

    let colorIdx = 0;
    for (const [label, evs] of groups) {
      html += `<div class="calendar-day-group">
        <div class="calendar-day-label">${label}</div>`;
      for (const e of evs) {
        const color = dotColors[colorIdx++ % dotColors.length];
        const currentClass = isCurrent(e) ? " is-current" : "";
        html += `
          <div class="cal-event${currentClass}">
            <span class="cal-time">${fmtTime(e)}</span>
            <div class="cal-dot-line"><span class="cal-dot" style="background:${color}"></span></div>
            <div>
              <div class="cal-title">${DashUtils.escapeHtml(e.summary || "Untitled event")}</div>
              ${e.location ? `<div class="cal-sub">${DashUtils.escapeHtml(e.location)}</div>` : ""}
            </div>
          </div>
        `;
      }
      html += `</div>`;
    }
    html += `</div>
      <button class="btn btn-ghost btn-block" id="btn-view-full-cal">
        View Full Calendar <span class="material-symbols-rounded" style="font-size:16px;">chevron_right</span>
      </button>
    `;
    container.innerHTML = html;
  }

  async function refresh() {
    const events = await fetchAllEvents();
    if (!DashUtils.shouldRender("calendar", events.map((e) => `${e.summary}|${startOf(e)}`))) return;
    cachedEvents = events;
    renderUpNext(events);
    renderCalendarCard(events);
  }

  function getCachedNextEvent() {
    return cachedEvents[0] || null;
  }

  function init() {
    refresh();
    setInterval(refresh, cfg.behavior.calendarRefreshMs);
    // Current-event highlight can flip true/false between refresh cycles
    // (e.g. a meeting just started) — re-render on a light interval too.
    setInterval(() => renderCalendarCard(cachedEvents), 60000);
  }

  return { init, refresh, getCachedNextEvent };
})();

window.CalendarModule = CalendarModule;
