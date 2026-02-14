/* ============================================
   Shared helper / utility functions
   ============================================ */
window.__editorHelpers = (() => {
  'use strict';

  const CFG = window.__editorConfig;

  // --- Core timing ---
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const jitter = (base, range = 12) => base + (Math.random() * range * 2 - range);

  // --- Animate a number counting up from 0 → target inside an element ---
  function animateCount(el, target, suffix = '', durationMs = 600) {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-out quad for a satisfying deceleration
      const eased = 1 - (1 - t) * (1 - t);
      const current = Math.round(eased * target);
      el.textContent = `${current.toLocaleString()}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // --- Number formatting ---
  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  // --- Animate counter with promise (used by hero stat, morph, etc.) ---
  function animateCounter(el, target, duration = 1500, from = 0) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const range = target - from;
      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(from + eased * range);
        el.textContent = formatNumber(value);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = formatNumber(target);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  // --- Hour formatting (for dot-draw graph) ---
  function fmtHour(h) {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  }

  // --- Compute message count per hour from normalized data ---
  const USAGE_SUM = CFG.USAGE_HOURS.reduce((a, b) => a + b, 0);
  function msgCountForHour(i) {
    return Math.round((CFG.USAGE_HOURS[i] / USAGE_SUM) * CFG.TOTAL_MESSAGES);
  }

  // --- Cascade easing (Phase 8) ---
  // Asymmetric easing: slow ramp-up, fast cruise, quick ease-out.
  function cascadeEasing(t) {
    const rampEnd = 0.28;    // 28% of duration: ease-in
    const decelStart = 0.88; // last 12% of duration: quick ease-out

    if (t <= rampEnd) {
      const p = t / rampEnd;
      const eased = p * p * p;
      return eased * 0.18;
    } else if (t <= decelStart) {
      const p = (t - rampEnd) / (decelStart - rampEnd);
      return 0.18 + p * 0.72;
    } else {
      const p = (t - decelStart) / (1 - decelStart);
      const eased = 1 - Math.pow(1 - p, 3);
      return 0.9 + eased * 0.1;
    }
  }

  // --- Catmull-Rom spline path builder (for line graphs) ---
  function buildCatmullRomPath(pts) {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  // --- Easing functions ---
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // --- Roll a square element to a target X position (Phase 20) ---
  async function rollSquareToCenter(el, size, targetX) {
    let currentX = parseFloat(el.style.left);
    const distance = targetX - currentX;
    if (Math.abs(distance) < 2) return;

    const direction = distance > 0 ? 1 : -1;
    const steps = Math.max(1, Math.round(Math.abs(distance) / size));
    const stepDist = distance / steps;

    const baseDuration = 300;

    for (let s = 0; s < steps; s++) {
      const progress = s / steps;
      const stepDuration = Math.round(baseDuration * (1 - progress * 0.4));

      if (direction > 0) {
        el.style.transformOrigin = `${size}px ${size}px`;
      } else {
        el.style.transformOrigin = `0px ${size}px`;
      }

      el.style.transition = `transform ${stepDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      el.style.transform = `rotate(${90 * direction}deg)`;

      await wait(stepDuration + 10);

      currentX += stepDist;
      el.style.transition = 'none';
      el.style.transform = 'rotate(0deg)';
      el.style.left = `${currentX}px`;

      el.offsetHeight; // force reflow
    }
  }

  return {
    wait,
    jitter,
    animateCount,
    formatNumber,
    animateCounter,
    fmtHour,
    msgCountForHour,
    cascadeEasing,
    buildCatmullRomPath,
    easeOutCubic,
    rollSquareToCenter,
    USAGE_SUM,
  };
})();
