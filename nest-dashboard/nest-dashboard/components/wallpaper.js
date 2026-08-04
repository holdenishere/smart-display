/**
 * components/wallpaper.js
 * ---------------------------------------------------------------------------
 * Resolves which wallpaper image to use, per config.wallpaper.mode:
 *   - "static"       always the first file in the list
 *   - "rotating"     a new file each calendar day, cycling through the list
 *   - "ambient-only" same resolution as static, but callers only apply it
 *                    inside Ambient Mode (dashboard itself stays solid dark)
 *   - "none"         no wallpaper — ambient falls back to a plain background
 *
 * Also builds the CSS `background` shorthand (image + readability scrim)
 * so callers don't duplicate gradient math.
 * ---------------------------------------------------------------------------
 */

const WallpaperModule = (() => {
  const cfg = window.DASHBOARD_CONFIG.wallpaper;

  function currentFile() {
    if (!cfg.files || !cfg.files.length) return null;
    if (cfg.mode === "none") return null;

    if (cfg.mode === "rotating") {
      // Stable per-day index: day-of-year mod file count.
      const start = new Date(new Date().getFullYear(), 0, 0);
      const diff = Date.now() - start.getTime();
      const dayOfYear = Math.floor(diff / 86400000);
      return cfg.files[dayOfYear % cfg.files.length];
    }

    // "static" and "ambient-only" both just use the first configured file.
    return cfg.files[0];
  }

  /** CSS background-image value: dark scrim gradient over the wallpaper. */
  function cssBackground() {
    const file = currentFile();
    const top = cfg.overlayOpacity?.top ?? 0.15;
    const bottom = cfg.overlayOpacity?.bottom ?? 0.6;
    if (!file) {
      return `linear-gradient(180deg, rgba(17,17,17,${top}), rgba(17,17,17,${bottom}))`;
    }
    return `linear-gradient(180deg, rgba(17,17,17,${top}), rgba(17,17,17,${bottom})), url('${file}')`;
  }

  function isEnabledForAmbient() {
    return cfg.mode !== "none";
  }

  return { currentFile, cssBackground, isEnabledForAmbient };
})();

window.WallpaperModule = WallpaperModule;
