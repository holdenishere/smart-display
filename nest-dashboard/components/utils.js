/**
 * components/utils.js
 * ---------------------------------------------------------------------------
 * Small shared helpers used across feature modules. Centralized so every
 * card renders empty/loading/error states the same way, and so we don't
 * repeat the same three lines of DOM-escaping in eight files.
 * ---------------------------------------------------------------------------
 */

const DashUtils = (() => {
  /** Escape untrusted text before dropping it into innerHTML. */
  function escapeHtml(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  /** Standard "nothing to show" card body. */
  function emptyState(icon, message) {
    return `
      <div class="empty-state">
        <span class="material-symbols-rounded">${icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  /** Standard skeleton/loading placeholder (opacity-only pulse — GPU cheap). */
  function loadingState(message = "Loading…") {
    return `
      <div class="empty-state skeleton-pulse">
        <span class="material-symbols-rounded">hourglass_empty</span>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  /** Card body shown when a card's data source is unavailable/offline. */
  function offlineState(icon, message) {
    return `
      <div class="empty-state is-offline">
        <span class="material-symbols-rounded">${icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
    `;
  }

  function fmtRelativeTime(isoString) {
    const d = new Date(isoString);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (sameDay) return time;
    const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
    return `${d.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
  }

  /**
   * Skip a re-render if the data driving it hasn't changed since last time.
   * Each card keeps its own signature in a WeakMap-free closure via the key.
   * Returns true if the caller SHOULD render (signature changed or is new).
   */
  const signatures = new Map();
  function shouldRender(key, signatureValue) {
    const sig = JSON.stringify(signatureValue);
    if (signatures.get(key) === sig) return false;
    signatures.set(key, sig);
    return true;
  }

  /** Clamp a number between min/max. */
  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  /** Respect the user's reduced-motion preference. */
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  return {
    escapeHtml,
    emptyState,
    loadingState,
    offlineState,
    fmtRelativeTime,
    shouldRender,
    clamp,
    prefersReducedMotion,
  };
})();

window.DashUtils = DashUtils;
