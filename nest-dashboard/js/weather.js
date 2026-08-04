/**
 * weather.js
 * ---------------------------------------------------------------------------
 * Weather card (home page) + full forecast page.
 * Data source: an HA weather.* entity (configured to use the OpenWeatherMap
 * integration server-side — see config.js). Current conditions come from
 * entity state/attributes; hourly + daily forecasts come from the
 * weather.get_forecasts service call.
 *
 * Resilience: if a forecast fetch fails, the card keeps showing the last
 * good data instead of blanking out (per the "if weather fails, keep
 * previous weather" requirement).
 * ---------------------------------------------------------------------------
 */

const WeatherModule = (() => {
  const cfg = window.DASHBOARD_CONFIG;
  const entityId = cfg.entities.weather.weather;
  let lastGoodHourly = [];
  let lastGoodDaily = [];

  // Maps HA weather condition strings to Material Symbols icon names.
  const ICON_MAP = {
    "clear-night": "bedtime",
    cloudy: "cloud",
    fog: "foggy",
    hail: "weather_hail",
    lightning: "thunderstorm",
    "lightning-rainy": "thunderstorm",
    partlycloudy: "partly_cloudy_day",
    pouring: "rainy",
    rainy: "rainy",
    snowy: "weather_snowy",
    "snowy-rainy": "weather_mix",
    sunny: "sunny",
    windy: "air",
    "windy-variant": "air",
    exceptional: "warning",
  };

  function iconFor(condition) {
    return ICON_MAP[condition] || "device_thermostat";
  }

  function labelFor(condition) {
    if (!condition) return "—";
    return condition
      .split("-")
      .map((w) => w[0].toUpperCase() + w.slice(1))
      .join(" ");
  }

  function fmtTemp(v) {
    if (v === undefined || v === null) return "--°";
    return `${Math.round(v)}°`;
  }

  function fmtHour(isoString) {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "numeric" }).replace(" ", "");
  }

  function fmtDay(isoString, index) {
    if (index === 0) return "Today";
    const d = new Date(isoString);
    return d.toLocaleDateString([], { weekday: "short" });
  }

  async function safeForecast(type, cache) {
    try {
      const result = await window.HA.getForecast(entityId, type);
      if (result && result.length) return result;
      return cache;
    } catch (err) {
      return cache; // keep last good data on failure
    }
  }

  async function renderHomeCard() {
    const container = document.getElementById("card-weather");
    if (!container) return;
    const state = window.HA.getState(entityId);

    if (!state) {
      container.innerHTML = DashUtils.emptyState("cloud_off", "Weather unavailable");
      return;
    }

    const hourly = (lastGoodHourly = await safeForecast("hourly", lastGoodHourly)).slice(0, 5);
    const daily = (lastGoodDaily = await safeForecast("daily", lastGoodDaily));
    const hi = daily[0]?.temperature ?? null;
    const lo = daily[0]?.templow ?? null;

    const signature = { s: state.state, t: state.attributes.temperature, hourly, hi, lo };
    if (!DashUtils.shouldRender("weather-home", signature)) return;

    container.innerHTML = `
      <div class="weather-now">
        <span class="material-symbols-rounded">${iconFor(state.state)}</span>
        <div class="weather-now-meta">
          <div class="temp">${fmtTemp(state.attributes.temperature)}</div>
        </div>
      </div>
      <div class="weather-now-meta">
        <div class="condition">${labelFor(state.state)}</div>
        <div class="hilo">${hi !== null ? `H ${fmtTemp(hi)}` : ""} ${lo !== null ? `L ${fmtTemp(lo)}` : ""}</div>
      </div>
      <div class="hourly-forecast">
        ${hourly
          .map(
            (h) => `
          <div class="hourly-item">
            <span class="hour">${fmtHour(h.datetime)}</span>
            <span class="material-symbols-rounded">${iconFor(h.condition)}</span>
            <span class="htemp">${fmtTemp(h.temperature)}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  async function renderWeatherPage() {
    const container = document.getElementById("page-weather");
    if (!container) return;
    const state = window.HA.getState(entityId);

    if (!state) {
      container.innerHTML = `<div class="page-heading">Weather</div>${DashUtils.emptyState(
        "cloud_off",
        "Weather entity not available"
      )}`;
      return;
    }

    const daily = (lastGoodDaily = await safeForecast("daily", lastGoodDaily));

    container.innerHTML = `
      <div class="page-heading">Weather</div>
      <div class="card weather-hero anim-fade-in">
        <span class="material-symbols-rounded">${iconFor(state.state)}</span>
        <div>
          <div class="temp" style="font:var(--type-clock);font-size:56px;">${fmtTemp(
            state.attributes.temperature
          )}</div>
          <div class="condition" style="margin-top:var(--space-1);">${labelFor(state.state)}</div>
        </div>
      </div>
      <div class="card feature-card anim-fade-in">
        <div class="card-title">7-Day Forecast</div>
        <div class="forecast-week">
          ${daily
            .slice(0, 7)
            .map(
              (d, i) => `
            <div class="forecast-day-row">
              <span class="fday-name">${fmtDay(d.datetime, i)}</span>
              <span class="material-symbols-rounded fday-icon">${iconFor(d.condition)}</span>
              <div class="fday-range">
                <span class="fday-lo">${fmtTemp(d.templow)}</span>
                <span>${fmtTemp(d.temperature)}</span>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function init() {
    renderHomeCard();
    window.HA.on(`state:${entityId}`, () => renderHomeCard());
    setInterval(renderHomeCard, cfg.behavior.weatherRefreshMs);
  }

  return { init, renderHomeCard, renderWeatherPage };
})();

window.WeatherModule = WeatherModule;
