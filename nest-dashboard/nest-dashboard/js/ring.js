/**
 * ring.js
 * ---------------------------------------------------------------------------
 * Ring Cameras card + full-screen camera viewer. Thumbnails are lazily
 * refreshed still frames (camera_proxy), not live MJPEG, to keep this cheap
 * on weak hardware — the live stream only loads once the user taps in.
 *
 * Loading state: a skeleton pulse shows until the first frame arrives.
 * Offline state: a muted "camera off" placeholder replaces a broken <img>.
 * ---------------------------------------------------------------------------
 */

const RingModule = (() => {
  const cfg = window.DASHBOARD_CONFIG.entities.cameras;
  const THUMB_REFRESH_MS = 15000;

  function renderHomeCard() {
    const container = document.getElementById("card-ring");
    if (!container) return;

    const cams = cfg.entities;
    const onlineCount = cams.filter((c) => {
      const s = window.HA.getState(c.entity);
      return s && s.state !== "unavailable";
    }).length;

    container.innerHTML = `
      <div class="card-title">
        Ring Cameras
        <span class="material-symbols-rounded chev">chevron_right</span>
      </div>
      <div class="camera-thumbs">
        ${cams
          .map(
            (c, i) => `
          <div class="camera-thumb tap-scale is-loading" data-cam-index="${i}" tabindex="0" role="button" aria-label="Open ${DashUtils.escapeHtml(
              c.name
            )} camera">
            <img id="thumb-${i}" alt="${DashUtils.escapeHtml(c.name)}" loading="lazy" />
          </div>
        `
          )
          .join("")}
      </div>
      <div class="card-footer-line">
        <span class="status-dot" style="background:${onlineCount ? "var(--md-success)" : "var(--md-danger)"};"></span>
        <span>${onlineCount} Camera${onlineCount === 1 ? "" : "s"} Online</span>
      </div>
    `;

    container.querySelectorAll("[data-cam-index]").forEach((el) => {
      const openHandler = () => openFullscreen(parseInt(el.dataset.camIndex, 10));
      el.addEventListener("click", openHandler);
      el.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openHandler();
        }
      });
    });

    loadThumbnails();
  }

  async function loadThumbnails() {
    const cams = cfg.entities;
    for (let i = 0; i < cams.length; i++) {
      const img = document.getElementById(`thumb-${i}`);
      const tile = img?.closest(".camera-thumb");
      if (!img || !tile) continue;
      try {
        const url = await window.HA.getCameraSnapshotUrl(cams[i].entity);
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
        img.removeAttribute("src");
      }
    }
  }

  function openFullscreen(index) {
    const cam = cfg.entities[index];
    if (!cam) return;

    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position:fixed; inset:0; z-index:200; background:#000;
      display:flex; flex-direction:column; opacity:0; pointer-events:auto;
      transition:opacity var(--duration-normal) var(--ease-standard);
    `;
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-4) var(--space-5);">
        <span style="font:var(--type-h1);font-size:18px;color:#fff;">${DashUtils.escapeHtml(cam.name)}</span>
        <button id="close-cam" style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;">
          <span class="material-symbols-rounded" style="color:#fff;">close</span>
        </button>
      </div>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;">
        <img id="cam-stream" style="max-width:100%;max-height:100%;object-fit:contain;" />
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => (overlay.style.opacity = "1"));

    const streamImg = overlay.querySelector("#cam-stream");
    streamImg.src = window.HA.getCameraStreamUrl(cam.entity);

    const close = () => {
      overlay.style.opacity = "0";
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector("#close-cam").addEventListener("click", close);
    document.addEventListener("keydown", function escClose(ev) {
      if (ev.key === "Escape") {
        close();
        document.removeEventListener("keydown", escClose);
      }
    });
  }

  function init() {
    renderHomeCard();
    for (const cam of cfg.entities) {
      window.HA.on(`state:${cam.entity}`, renderHomeCard);
    }
    setInterval(loadThumbnails, THUMB_REFRESH_MS);
  }

  return { init, renderHomeCard, openFullscreenFromPage: openFullscreen };
})();

window.RingModule = RingModule;
