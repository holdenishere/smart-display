/**
 * components/favorites.js
 * ---------------------------------------------------------------------------
 * Favorites card — large scene buttons that call scene.turn_on.
 * ---------------------------------------------------------------------------
 */

const FavoritesModule = (() => {
  function render() {
    const container = document.getElementById("card-favorites");
    if (!container) return;
    const scenes = window.DASHBOARD_CONFIG.entities.scenes;

    container.innerHTML = `
      <div class="card-title">Favorites</div>
      <div style="display:flex;flex-direction:column;gap:var(--space-2);flex:1;">
        ${scenes
          .map(
            (s) => `
          <button class="favorite-btn tap-scale" data-scene="${s.entity}">
            <span class="material-symbols-rounded">${s.icon}</span>
            <span class="flabel">${s.name}</span>
            <span class="material-symbols-rounded chev">chevron_right</span>
          </button>
        `
          )
          .join("")}
      </div>
    `;

    container.querySelectorAll("[data-scene]").forEach((btn) => {
      btn.addEventListener("click", () => window.HA.activateScene(btn.dataset.scene));
    });
  }

  function init() {
    render();
  }

  return { init, render };
})();
