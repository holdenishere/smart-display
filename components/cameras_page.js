/**
 * components/cameras_page.js
 * ---------------------------------------------------------------------------
 * Full-page camera grid (Page 5). Reuses RingModule's fullscreen viewer and
 * the same loading/offline treatment as the home-page card.
 * ---------------------------------------------------------------------------
 */

const CamerasPage = (() => {
  const cfg = window.DASHBOARD_CONFIG.entities.cameras;

  function render() {
    const container = document.getElementById("page-cameras");
    if (!container) return;

    container.innerHTML = `
      <div class="page-heading">Cameras</div>
      <div class="camera-grid-page">
        ${cfg.entities
          .map(
            (c, i) => `
          <div class="camera-tile-large tap-scale is-loading" data-cam-index="${i}" tabindex="0" role="button"
            aria-label="Open ${DashUtils.escapeHtml(c.name)} camera">
            <img id="page-thumb-${i}" alt="${DashUtils.escapeHtml(c.name)}" loading="lazy" />
            <div class="camera-tile-label">${DashUtils.escapeHtml(c.name)}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;

    container.querySelectorAll("[data-cam-index]").forEach((el) => {
      const handler = () => window.RingModule?.openFullscreenFromPage?.(parseInt(el.dataset.camIndex, 10));
      el.addEventListener("click", handler);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          handler();
        }
      });
    });

    loadThumbnails();
  }

  async function loadThumbnails() {
    for (let i = 0; i < cfg.entities.length; i++) {
      const img = document.getElementById(`page-thumb-${i}`);
      const tile = img?.closest(".camera-tile-large");
      if (!img || !tile) continue;
      try {
        const url = await window.HA.getCameraSnapshotUrl(cfg.entities[i].entity);
        const prevUrl = img.dataset.blobUrl;
        img.src = url;
        img.dataset.blobUrl = url;
        img.onload = () => {
          tile.classList.remove("is-loading", "is-offline");
          if (prevUrl) URL.revokeObjectURL(prevUrl);
        };
      } catch (err) {
        tile.classList.remove("is-loading");
        tile.classList.add("is-offline");
      }
    }
  }

  return { render };
})();

window.CamerasPage = CamerasPage;
