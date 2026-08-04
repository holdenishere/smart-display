/**
 * spotify.js
 * ---------------------------------------------------------------------------
 * Spotify / media player card + full Media page. Works with any HA
 * media_player entity; labeled "Spotify" per the mockup but agnostic to the
 * underlying integration.
 *
 * - Album art crossfades (opacity only) when the track changes.
 * - The card dims to an "unavailable" treatment rather than disappearing
 *   when there's no active player, so the grid layout never shifts.
 * ---------------------------------------------------------------------------
 */

const SpotifyModule = (() => {
  const entityId = window.DASHBOARD_CONFIG.entities.media_player.player;
  let lastTrackKey = null;

  function estimateProgress(state) {
    const pos = state.attributes.media_position;
    const updatedAt = state.attributes.media_position_updated_at;
    const duration = state.attributes.media_duration;
    if (pos == null || duration == null) return { pos: 0, duration: 0, pct: 0 };

    let elapsed = pos;
    if (state.state === "playing" && updatedAt) {
      elapsed = pos + (Date.now() - new Date(updatedAt).getTime()) / 1000;
    }
    elapsed = DashUtils.clamp(elapsed, 0, duration);
    return { pos: elapsed, duration, pct: duration ? (elapsed / duration) * 100 : 0 };
  }

  function renderHomeCard() {
    const container = document.getElementById("card-spotify");
    if (!container) return;
    const state = window.HA.getState(entityId);

    if (!state || state.state === "unavailable" || state.state === "off") {
      container.classList.remove("is-unavailable");
      container.innerHTML = `<div class="card-title">Spotify</div>${DashUtils.emptyState(
        "music_off",
        "Nothing playing"
      )}`;
      container.classList.add("is-unavailable");
      return;
    }
    container.classList.remove("is-unavailable");

    const { pct } = estimateProgress(state);
    const isPlaying = state.state === "playing";
    const art = state.attributes.entity_picture;
    const trackKey = `${state.attributes.media_title}|${state.attributes.media_artist}`;
    const isNewTrack = trackKey !== lastTrackKey;
    lastTrackKey = trackKey;

    const signature = { trackKey, isPlaying, pctBucket: Math.floor(pct / 2) };
    if (!DashUtils.shouldRender("spotify-home", signature)) return;

    container.innerHTML = `
      <div class="card-title">Spotify</div>
      <div class="spotify-body">
        ${art ? `<img class="album-art ${isNewTrack ? "is-changing" : ""}" src="${art}" alt="Album art" loading="lazy" />` : `<div class="album-art"></div>`}
        <div class="track-meta">
          <div class="track-title">${DashUtils.escapeHtml(state.attributes.media_title || "Nothing playing")}</div>
          <div class="track-artist">${DashUtils.escapeHtml(state.attributes.media_artist || "")}</div>
          <div class="track-source"><span class="material-symbols-rounded">graphic_eq</span><span>Spotify</span></div>
        </div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%;"></div></div>
      <div class="media-controls">
        <button id="mc-prev" aria-label="Previous track"><span class="material-symbols-rounded">skip_previous</span></button>
        <button id="mc-play" class="media-btn-play tap-scale" aria-label="${isPlaying ? "Pause" : "Play"}">
          <span class="material-symbols-rounded">${isPlaying ? "pause" : "play_arrow"}</span>
        </button>
        <button id="mc-next" aria-label="Next track"><span class="material-symbols-rounded">skip_next</span></button>
      </div>
    `;

    const artEl = container.querySelector(".album-art");
    if (artEl && isNewTrack) {
      requestAnimationFrame(() => artEl.classList.remove("is-changing"));
    }

    bindTransportControls(container);
  }

  function bindTransportControls(container) {
    container.querySelector("#mc-prev")?.addEventListener("click", () =>
      window.HA.callService("media_player", "media_previous_track", {}, { entity_id: entityId })
    );
    container.querySelector("#mc-next")?.addEventListener("click", () =>
      window.HA.callService("media_player", "media_next_track", {}, { entity_id: entityId })
    );
    container.querySelector("#mc-play")?.addEventListener("click", () =>
      window.HA.callService("media_player", "media_play_pause", {}, { entity_id: entityId })
    );
  }

  function renderMediaPage() {
    const container = document.getElementById("page-media");
    if (!container) return;
    const state = window.HA.getState(entityId);

    if (!state || state.state === "unavailable") {
      container.innerHTML = `<div class="page-heading">Media</div>${DashUtils.emptyState(
        "music_off",
        "Nothing playing"
      )}`;
      return;
    }

    const { pct } = estimateProgress(state);
    const isPlaying = state.state === "playing";
    const art = state.attributes.entity_picture;
    const volume = Math.round((state.attributes.volume_level || 0) * 100);

    container.innerHTML = `
      <div class="page-heading">Media</div>
      <div class="card big-media-card anim-fade-in">
        ${art ? `<img class="big-album-art" src="${art}" alt="Album art" />` : `<div class="big-album-art"></div>`}
        <div style="flex:1;min-width:0;">
          <div class="track-title" style="font-size:24px;">${DashUtils.escapeHtml(
            state.attributes.media_title || "Nothing playing"
          )}</div>
          <div class="track-artist" style="font-size:15px;margin-top:var(--space-1);">${DashUtils.escapeHtml(
            state.attributes.media_artist || ""
          )}</div>
          <div class="progress-track" style="margin-top:var(--space-5);"><div class="progress-fill" style="width:${pct}%;"></div></div>
          <div class="media-controls" style="margin-top:var(--space-5);gap:var(--space-6);">
            <button id="mp-prev" aria-label="Previous track"><span class="material-symbols-rounded" style="font-size:28px;">skip_previous</span></button>
            <button id="mp-play" class="media-btn-play tap-scale" style="width:56px;height:56px;" aria-label="${isPlaying ? "Pause" : "Play"}">
              <span class="material-symbols-rounded" style="font-size:28px;">${isPlaying ? "pause" : "play_arrow"}</span>
            </button>
            <button id="mp-next" aria-label="Next track"><span class="material-symbols-rounded" style="font-size:28px;">skip_next</span></button>
          </div>
          <div class="volume-row">
            <span class="material-symbols-rounded" style="color:var(--md-text-secondary);">volume_up</span>
            <div class="slider-track"><div class="slider-fill" style="width:${volume}%;"></div></div>
            <span style="width:36px;text-align:right;font:var(--type-caption);color:var(--md-text-secondary);">${volume}%</span>
          </div>
        </div>
      </div>
    `;

    container.querySelector("#mp-prev")?.addEventListener("click", () =>
      window.HA.callService("media_player", "media_previous_track", {}, { entity_id: entityId })
    );
    container.querySelector("#mp-next")?.addEventListener("click", () =>
      window.HA.callService("media_player", "media_next_track", {}, { entity_id: entityId })
    );
    container.querySelector("#mp-play")?.addEventListener("click", () =>
      window.HA.callService("media_player", "media_play_pause", {}, { entity_id: entityId })
    );

    const track = container.querySelector(".slider-track");
    track?.addEventListener("click", (ev) => {
      const rect = track.getBoundingClientRect();
      const ratio = DashUtils.clamp((ev.clientX - rect.left) / rect.width, 0, 1);
      window.HA.callService("media_player", "volume_set", { volume_level: ratio }, { entity_id: entityId });
    });
  }

  function init() {
    renderHomeCard();
    window.HA.on(`state:${entityId}`, () => {
      renderHomeCard();
      if (document.getElementById("page-media")?.classList.contains("is-active")) renderMediaPage();
    });
    // Smoothly advance the progress bar between state updates (throttled —
    // no need to touch the DOM more often than this while playing).
    setInterval(() => {
      const state = window.HA.getState(entityId);
      if (state?.state === "playing") renderHomeCard();
    }, 15000);
  }

  return { init, renderHomeCard, renderMediaPage };
})();

window.SpotifyModule = SpotifyModule;
