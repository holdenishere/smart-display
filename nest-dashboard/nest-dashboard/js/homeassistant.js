/**
 * homeassistant.js
 * ---------------------------------------------------------------------------
 * Thin client for Home Assistant's WebSocket + REST APIs.
 *
 * - Opens one persistent WebSocket connection, authenticates, and
 *   subscribes to state_changed events.
 * - Keeps an in-memory mirror of all entity states (this.states).
 * - Emits events on a tiny pub/sub bus so feature modules (weather.js,
 *   spotify.js, etc.) can react without polling.
 * - Falls back to REST for one-off calls (services, forecasts, logbook,
 *   camera snapshots) where WS round-trips aren't a good fit.
 *
 * No external dependencies. Designed to be tiny and cheap to run on
 * weak hardware — one socket, no polling loops once connected.
 * ---------------------------------------------------------------------------
 */

class HomeAssistantClient {
  constructor(config) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.token = config.token;
    this.reconnectMinDelay = config.reconnectMinDelay || 1000;
    this.reconnectMaxDelay = config.reconnectMaxDelay || 30000;

    this.ws = null;
    this.msgId = 1;
    this.pending = new Map(); // id -> {resolve, reject}
    this.states = new Map(); // entity_id -> state object
    this.listeners = new Map(); // event name -> Set<fn>
    this._reconnectDelay = this.reconnectMinDelay;
    this._connected = false;
    this._authed = false;
  }

  // ---- pub/sub -----------------------------------------------------------

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event).delete(fn);
  }

  _emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[HA] listener error for "${event}"`, err);
      }
    }
  }

  // ---- connection lifecycle ----------------------------------------------

  connect() {
    const wsUrl = this.baseUrl.replace(/^http/, "ws") + "/api/websocket";
    this.ws = new WebSocket(wsUrl);

    this.ws.addEventListener("open", () => {
      this._connected = true;
      this._reconnectDelay = this.reconnectMinDelay;
    });

    this.ws.addEventListener("message", (ev) => this._handleMessage(JSON.parse(ev.data)));

    this.ws.addEventListener("close", () => {
      this._connected = false;
      this._authed = false;
      this._emit("connection", { status: "disconnected" });
      this._scheduleReconnect();
    });

    this.ws.addEventListener("error", () => {
      // close event will follow; nothing extra to do here.
    });
  }

  _scheduleReconnect() {
    setTimeout(() => this.connect(), this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, this.reconnectMaxDelay);
  }

  _handleMessage(msg) {
    switch (msg.type) {
      case "auth_required":
        this.ws.send(JSON.stringify({ type: "auth", access_token: this.token }));
        break;

      case "auth_ok":
        this._authed = true;
        this._emit("connection", { status: "connected" });
        this._afterAuth();
        break;

      case "auth_invalid":
        this._emit("connection", { status: "auth_failed", message: msg.message });
        break;

      case "event":
        if (msg.event && msg.event.event_type === "state_changed") {
          const { entity_id, new_state } = msg.event.data;
          if (new_state) this.states.set(entity_id, new_state);
          this._emit(`state:${entity_id}`, new_state);
          this._emit("state_changed", new_state);
        }
        break;

      case "result":
        this._resolvePending(msg);
        break;

      default:
        break;
    }
  }

  _resolvePending(msg) {
    const handler = this.pending.get(msg.id);
    if (!handler) return;
    this.pending.delete(msg.id);
    if (msg.success) handler.resolve(msg.result);
    else handler.reject(msg.error || new Error("HA command failed"));
  }

  async _afterAuth() {
    // Pull full current state once, then rely on the event stream.
    const states = await this.sendCommand({ type: "get_states" });
    for (const s of states) this.states.set(s.entity_id, s);
    this._emit("states_loaded", this.states);

    await this.sendCommand({ type: "subscribe_events", event_type: "state_changed" });
  }

  // ---- WS command helper ---------------------------------------------------

  sendCommand(command) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("HA socket not open"));
        return;
      }
      const id = this.msgId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ ...command, id }));
    });
  }

  // ---- convenience getters ------------------------------------------------

  getState(entityId) {
    return this.states.get(entityId) || null;
  }

  /** Read a numeric/string attribute, or the state string itself if attr is omitted. */
  read(entityId, attr) {
    const s = this.states.get(entityId);
    if (!s) return undefined;
    return attr ? s.attributes?.[attr] : s.state;
  }

  // ---- service calls (via WS, falls back to REST if socket is down) ------

  async callService(domain, service, serviceData = {}, target = {}) {
    try {
      return await this.sendCommand({
        type: "call_service",
        domain,
        service,
        service_data: serviceData,
        target,
      });
    } catch (err) {
      // REST fallback keeps taps working during a brief reconnect.
      return this.restCallService(domain, service, { ...serviceData, ...target });
    }
  }

  toggle(entityId) {
    const domain = entityId.split(".")[0];
    return this.callService(domain, "toggle", {}, { entity_id: entityId });
  }

  turnOn(entityId, extra = {}) {
    const domain = entityId.split(".")[0];
    return this.callService(domain, "turn_on", extra, { entity_id: entityId });
  }

  turnOff(entityId) {
    const domain = entityId.split(".")[0];
    return this.callService(domain, "turn_off", {}, { entity_id: entityId });
  }

  activateScene(entityId) {
    return this.callService("scene", "turn_on", {}, { entity_id: entityId });
  }

  // ---- REST helpers (for things WS doesn't do well) -----------------------

  async rest(path, options = {}) {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    if (!res.ok) throw new Error(`HA REST ${path} failed: ${res.status}`);
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : res;
  }

  restCallService(domain, service, data) {
    return this.rest(`/services/${domain}/${service}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getForecast(entityId, type = "hourly") {
    const result = await this.sendCommand({
      type: "call_service",
      domain: "weather",
      service: "get_forecasts",
      service_data: { type },
      target: { entity_id: entityId },
      return_response: true,
    });
    return result?.response?.[entityId]?.forecast || [];
  }

  async getCalendarEvents(entityId, start, end) {
    const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
    return this.rest(`/calendars/${entityId}?${params.toString()}`);
  }

  async getLogbook(sinceISO) {
    return this.rest(`/logbook/${sinceISO}`);
  }

  /** Returns a blob: URL for a camera's current still frame. */
  async getCameraSnapshotUrl(entityId) {
    const res = await fetch(
      `${this.baseUrl}/api/camera_proxy/${entityId}?token=${this.token}&t=${Date.now()}`,
      { headers: { Authorization: `Bearer ${this.token}` } }
    );
    if (!res.ok) throw new Error("Camera snapshot failed");
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  }

  /** Live MJPEG stream URL, for use directly as an <img src>. */
  getCameraStreamUrl(entityId) {
    return `${this.baseUrl}/api/camera_proxy_stream/${entityId}?token=${this.token}`;
  }
}

// Singleton — every module imports this same instance via a plain <script> tag.
window.HA = new HomeAssistantClient(window.DASHBOARD_CONFIG.homeAssistant);
