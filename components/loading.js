/**
 * components/loading.js
 * ---------------------------------------------------------------------------
 * Premium startup sequence: current time, a spinner, and a short series of
 * status lines ("Connecting to Home Assistant…", "Checking weather…", etc.)
 * before fading into the dashboard. Purely cosmetic — it does not block
 * real data loading, which proceeds in parallel via app.js.
 * ---------------------------------------------------------------------------
 */

const LoadingModule = (() => {
  const cfg = window.DASHBOARD_CONFIG;
  const STEPS = [
    "Connecting to Home Assistant…",
    "Checking weather…",
    "Loading devices…",
    "Loading media…",
    "Ready.",
  ];

  let el, statusEl, clockEl;
  let stepIndex = 0;
  let stepTimer = null;

  function build() {
    el = document.createElement("div");
    el.id = "splash";
    el.innerHTML = `
      <div class="splash-clock" id="splash-clock">--:--</div>
      <div class="splash-spinner"></div>
      <div class="splash-status" id="splash-status"></div>
    `;
    document.body.appendChild(el);
    statusEl = el.querySelector("#splash-status");
    clockEl = el.querySelector("#splash-clock");
    tickClock();
  }

  function tickClock() {
    if (!clockEl) return;
    clockEl.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  function nextStep() {
    if (!statusEl) return;
    statusEl.style.opacity = "0";
    setTimeout(() => {
      statusEl.textContent = STEPS[stepIndex];
      statusEl.style.opacity = "1";
      stepIndex++;
      if (stepIndex < STEPS.length) {
        stepTimer = setTimeout(nextStep, cfg.behavior.splashStepMs);
      } else {
        setTimeout(hide, cfg.behavior.splashStepMs);
      }
    }, 120);
  }

  function hide() {
    if (!el) return;
    el.classList.add("is-hidden");
    setTimeout(() => el.remove(), 900);
  }

  function start() {
    build();
    nextStep();
    const clockInterval = setInterval(tickClock, 1000);
    setTimeout(() => clearInterval(clockInterval), STEPS.length * cfg.behavior.splashStepMs + 1500);
  }

  return { start, hide };
})();

window.LoadingModule = LoadingModule;
