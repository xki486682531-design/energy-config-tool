/* ======================================================
   LIQUID GLASS JS ENGINE — Minimal
   Stripped of SVG filters / caustics / ripple / particles
   Keeps only per-frame edge-angle update for static use
   ====================================================== */

(function() {
  'use strict';

  var LG = window.LiquidGlass = {};

  /* ── Performance Detection ───────────────────────── */
  function detectPerformance() {
    var cores = navigator.hardwareConcurrency || 4;
    if (cores < 3) {
      LG.lowPerf = true;
    }
  }

  /* ── Init ────────────────────────────────────────── */
  LG.init = function() {
    detectPerformance();
    /* Removed: SVG filter injection, canvas caustics,
       mouse ripple, click particles, animation loop */
  };

  /* DOM Ready auto-init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', LG.init);
  } else {
    LG.init();
  }

})();
