/* ============================================
   Image Unfolding — 3D Sphere Animation
   ============================================
   Standalone module. Exposes window.__imageUnfold = { start }.

   Ported from test-image-unfold.html (sphere + images
   animation). That test file is the reference — this
   module wraps the same code so it can be triggered by
   the editor when the cursor clicks the image button.

   Entrance:
     1. Dark stage fades in over the editor content
     2. Scene wrapper scales from 0.08 → 1.0 (zoom from bg)
     3. Auto-play: 1→3→2→5→4 sphere rotation sequence

   NOTE: the old carousel code that was here before is
   preserved in git history. This replaces it entirely.
   ============================================ */

(() => {
  'use strict';

  // ============================================
  // Image sources
  // ============================================
  const MAIN_SRCS = [
    'images/img-01.webp',
    'images/img-02.webp',
    'images/img-03.webp',
    'images/img-04.webp',
    'images/img-05.webp',
  ];

  const BG_SRCS = [
    'images/sphere2-01.webp', 'images/sphere2-02.webp', 'images/sphere2-03.webp',
    'images/sphere2-04.webp', 'images/sphere2-05.webp', 'images/sphere2-06.webp',
    'images/sphere2-07.webp', 'images/sphere2-08.webp', 'images/sphere2-09.webp',
    'images/sphere2-10.webp', 'images/sphere2-11.webp', 'images/sphere2-12.webp',
  ];

  // Words displayed in the bubble during each rotation stop
  const IMG_WORDS = { 1: 'Bloomed', 3: 'Quietly', 2: 'Wander', 5: 'Drifted', 4: 'Gently' };

  // ============================================
  // State
  // ============================================
  let stageEl = null;       // covers editor__main
  let sceneEl = null;       // wrapper for scale-up entrance
  let stageW = 0, stageH = 0;
  let sf = 1;               // proportional scale factor

  // 3D constants (set in initGeometry)
  let R, R2, CAMERA_DIST, CX, CY;
  let SPHERE2_OFFSET_Z, SPHERE2_OFFSET_Y;

  // Rotation state
  let rot1 = 0;
  let rot2 = 0;
  let s2rot = 0;
  let animating = false;
  let renderLoopId = 0;

  // Axis constants
  let n1X, n1Y, d1Cos, d1Sin;
  let n2X, n2Y, d2Cos, d2Sin;

  // Sphere geometry
  let IMAGE_BASE_POSITIONS = [];
  let SPHERE2_POSITIONS = [];

  // DOM element arrays
  let mainImgEls = [];
  let bgImgEls = [];
  let circleDotEl = null;
  let bubbleEl = null;
  let bubbleTextEl = null;

  // Drift layers for organic idle wiggle
  let mainDriftLayers = [];
  let bgDriftLayers = [];

  // Circle dot
  let CIRCLE_R = 0;
  const DOT_ANGLE_IMG1 = -Math.PI / 3;
  const DOT_ANGLE_IMG3 = Math.PI * 2 / 3;
  const DOT_ANGLE_IMG2 = Math.PI / 6;
  const DOT_ANGLE_IMG5 = -Math.PI * 5 / 6;
  const DOT_ANGLE_IMG4 = Math.PI * 11 / 12;
  let currentDotAngle = DOT_ANGLE_IMG1;

  // Bubble offset math
  const BUBBLE_HALF_W = 80;
  const BUBBLE_HALF_H = 21;
  const BUBBLE_GAP = 40;

  // Wiggle
  const WIGGLE_DEPTH_THRESH = 0.82;
  const WIGGLE_MAX_PX_BASE = 30;

  // Entrance phase (images appear progressively)
  // 'hidden' → 'hero' → 'popIn' → 'ready'
  let entrancePhase = 'hidden';
  let popInVisible = 0;      // number of non-hero images currently visible during popIn
  let popInStartTimes = [];  // timestamp when each pop-in image began its scale-up
  const POP_SCALE_DUR = 300; // ms for each image to scale from 0 → 1

  // Card fan ending
  let countEl = null;        // DOM wrapper for count display
  let countNumEl = null;     // DOM element for the animated number
  let countLabelEl = null;   // DOM element for the subtitle label
  const IMAGE_COUNT = 211;   // number of images generated in 2025
  const FAN_CARD_SIZE = 140; // card size in the fan (before sf scaling)

  // ============================================
  // Helpers
  // ============================================
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  function easeInOutQuintic(t) {
    return t < 0.5
      ? 16 * t * t * t * t * t
      : 1 - Math.pow(-2 * t + 2, 5) / 2;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ============================================
  // 3D Math (identical to test-image-unfold.html)
  // ============================================
  function project(x3d, y3d, z3d) {
    const scale = CAMERA_DIST / (CAMERA_DIST - z3d);
    return {
      x: CX + x3d * scale,
      y: CY - y3d * scale,
      scale,
      z: z3d,
    };
  }

  function depthNorm(z3d) {
    return (z3d + R) / (2 * R);
  }

  function rotateAroundN(px, py, pz, axX, axY, phi) {
    const c = Math.cos(phi), s = Math.sin(phi);
    const dot = axX * px + axY * py;
    const cx = axY * pz;
    const cy = -axX * pz;
    const cz = axX * py - axY * px;
    return {
      x: px * c + cx * s + axX * dot * (1 - c),
      y: py * c + cy * s + axY * dot * (1 - c),
      z: pz * c + cz * s,
    };
  }

  function applyRotations(px, py, pz) {
    const r1 = rotateAroundN(px, py, pz, n1X, n1Y, rot1);
    return rotateAroundN(r1.x, r1.y, r1.z, n2X, n2Y, rot2);
  }

  // ============================================
  // Geometry setup
  // ============================================
  function initGeometry() {
    stageW = sceneEl.offsetWidth;
    stageH = sceneEl.offsetHeight;
    sf = Math.min(stageW, stageH) / 700;

    R  = 220 * sf;
    R2 = 220 * sf;
    CAMERA_DIST = 800 * sf;
    CX = stageW / 2;
    CY = stageH / 2;
    SPHERE2_OFFSET_Z = -350 * sf;
    SPHERE2_OFFSET_Y =  200 * sf;
    CIRCLE_R = 170 * sf;

    // --- Axis 1 (phase 1: 1→3→2) ---
    const DIAG_1 = Math.PI - Math.PI / 5;
    d1Cos = Math.cos(DIAG_1);
    d1Sin = Math.sin(DIAG_1);
    n1X = -d1Sin;
    n1Y =  d1Cos;

    // --- Axis 2 (phase 2: 2→5→4) ---
    const DIAG_2 = Math.PI / 4;
    d2Cos = Math.cos(DIAG_2);
    d2Sin = Math.sin(DIAG_2);
    n2X = -d2Sin;
    n2Y =  d2Cos;

    // Orbit position helpers
    function orbitPos1(theta) {
      return {
        x: R * Math.cos(theta) * d1Cos,
        y: R * Math.cos(theta) * d1Sin,
        z: R * Math.sin(theta),
      };
    }
    function orbitPos2(theta) {
      return {
        x: R * Math.cos(theta) * d2Cos,
        y: R * Math.cos(theta) * d2Sin,
        z: R * Math.sin(theta),
      };
    }

    // Main sphere image starting angles
    const ANGLES = [
      Math.PI / 2,        // Image 1: front
      0,                  // Image 2
      -Math.PI / 2,       // Image 3
      -2 * Math.PI / 3,   // Image 4
      2 * Math.PI / 3,    // Image 5
    ];

    // Images 4 & 5 live on circle 2 — compute base positions
    const img4On2 = orbitPos2(0);
    const img5On2 = orbitPos2(-Math.PI / 2);
    const img4Base = rotateAroundN(img4On2.x, img4On2.y, img4On2.z, n1X, n1Y, Math.PI / 2);
    const img5Base = rotateAroundN(img5On2.x, img5On2.y, img5On2.z, n1X, n1Y, Math.PI / 2);

    IMAGE_BASE_POSITIONS = [
      orbitPos1(ANGLES[0]),
      orbitPos1(ANGLES[1]),
      orbitPos1(ANGLES[2]),
      img4Base,
      img5Base,
    ];

    // Background sphere — 12 scattered positions
    const coords = [
      { lat:  0.23, lon:  0.41 }, { lat: -0.58, lon:  2.73 },
      { lat:  0.81, lon: -1.19 }, { lat: -0.12, lon:  1.87 },
      { lat:  0.47, lon: -2.54 }, { lat: -0.93, lon:  0.62 },
      { lat:  0.35, lon:  2.18 }, { lat: -0.71, lon: -0.33 },
      { lat:  0.64, lon:  1.05 }, { lat: -0.39, lon: -1.72 },
      { lat:  0.14, lon: -0.88 }, { lat: -0.52, lon:  3.01 },
    ];
    SPHERE2_POSITIONS = coords.map(c => ({
      x: R2 * Math.cos(c.lat) * Math.cos(c.lon),
      y: R2 * Math.sin(c.lat),
      z: R2 * Math.cos(c.lat) * Math.sin(c.lon),
    }));

    // --- Drift layers (organic idle wiggle) ---
    mainDriftLayers = [];
    for (let i = 0; i < 5; i++) {
      const layers = [];
      for (let l = 0; l < 3; l++) {
        layers.push({
          px: Math.random() * Math.PI * 2,
          py: Math.random() * Math.PI * 2,
          fx: (0.1 + Math.random() * 0.1) * (1 + l * 0.3),
          fy: (0.1 + Math.random() * 0.1) * (1 + l * 0.3),
          ax: 1 - l * 0.3,
          ay: 1 - l * 0.3,
        });
      }
      mainDriftLayers.push(layers);
    }

    bgDriftLayers = [];
    for (let i = 0; i < 12; i++) {
      const layers = [];
      for (let l = 0; l < 3; l++) {
        layers.push({
          px: Math.random() * Math.PI * 2,
          py: Math.random() * Math.PI * 2,
          fx: (0.005 + Math.random() * 0.005) * (1 + l * 0.3),
          fy: (0.005 + Math.random() * 0.005) * (1 + l * 0.3),
          ax: 1 - l * 0.3,
          ay: 1 - l * 0.3,
        });
      }
      bgDriftLayers.push(layers);
    }
  }

  // ============================================
  // Wiggle helpers
  // ============================================
  function getMainWiggle(idx, now) {
    const layers = mainDriftLayers[idx];
    const sec = now / 1000;
    let dx = 0, dy = 0;
    for (const L of layers) {
      dx += Math.sin(sec * L.fx * Math.PI * 2 + L.px) * L.ax;
      dy += Math.sin(sec * L.fy * Math.PI * 2 + L.py) * L.ay;
    }
    const norm = 1 / 2.1;
    const maxPx = WIGGLE_MAX_PX_BASE * sf;
    return { dx: dx * norm * maxPx, dy: dy * norm * maxPx };
  }

  function getBgWiggle(idx, now) {
    const layers = bgDriftLayers[idx];
    const sec = now / 1000;
    let dx = 0, dy = 0;
    for (const L of layers) {
      dx += Math.sin(sec * L.fx * Math.PI * 2 + L.px) * L.ax;
      dy += Math.sin(sec * L.fy * Math.PI * 2 + L.py) * L.ay;
    }
    const norm = 1 / 2.1;
    const maxPx = WIGGLE_MAX_PX_BASE * sf * 0.6;
    return { dx: dx * norm * maxPx, dy: dy * norm * maxPx };
  }

  // (computeUnfoldTargets removed — replaced by card fan ending)

  // ============================================
  // DOM creation
  // ============================================
  function createStage() {
    const main = document.querySelector('.editor__main');

    stageEl = document.createElement('div');
    stageEl.className = 'image-unfold-stage';
    main.appendChild(stageEl);

    sceneEl = document.createElement('div');
    sceneEl.className = 'image-unfold-scene';
    stageEl.appendChild(sceneEl);
  }

  function buildDOM() {
    mainImgEls = [];
    bgImgEls = [];

    // Background sphere images (low z-index, dim)
    for (let i = 0; i < BG_SRCS.length; i++) {
      const card = document.createElement('div');
      card.className = 'image-unfold-card';
      const img = document.createElement('img');
      img.src = BG_SRCS[i];
      img.draggable = false;
      card.appendChild(img);
      sceneEl.appendChild(card);
      bgImgEls.push(card);
    }

    // Main sphere orbit images (high z-index)
    for (let i = 0; i < MAIN_SRCS.length; i++) {
      const card = document.createElement('div');
      card.className = 'image-unfold-card';
      const img = document.createElement('img');
      img.src = MAIN_SRCS[i];
      img.draggable = false;
      card.appendChild(img);
      sceneEl.appendChild(card);
      mainImgEls.push(card);
    }

    // Circle dot
    circleDotEl = document.createElement('div');
    circleDotEl.className = 'image-unfold-dot';
    sceneEl.appendChild(circleDotEl);

    // Bubble + text
    bubbleEl = document.createElement('div');
    bubbleEl.className = 'image-unfold-bubble';
    bubbleTextEl = document.createElement('span');
    bubbleTextEl.className = 'image-unfold-bubble__text';
    bubbleTextEl.textContent = IMG_WORDS[1];
    bubbleEl.appendChild(bubbleTextEl);
    sceneEl.appendChild(bubbleEl);

    // Count wrapper (shown during unfold phase)
    countEl = document.createElement('div');
    countEl.className = 'image-unfold-count-wrap';
    countNumEl = document.createElement('div');
    countNumEl.className = 'image-unfold-count__number';
    countNumEl.textContent = '0';
    countLabelEl = document.createElement('div');
    countLabelEl.className = 'image-unfold-count__label';
    countLabelEl.textContent = 'images generated in 2025';
    countEl.appendChild(countNumEl);
    countEl.appendChild(countLabelEl);
    sceneEl.appendChild(countEl);
  }

  // ============================================
  // Rendering
  // ============================================
  function render(now) {
    if (!now) now = performance.now();

    // --- Background sphere ---
    const s2c = Math.cos(s2rot), s2s = Math.sin(s2rot);

    for (let i = 0; i < SPHERE2_POSITIONS.length; i++) {
      const sp = SPHERE2_POSITIONS[i];
      // Y-axis rotation + offset
      const rx = sp.x * s2c + sp.z * s2s;
      const rz = -sp.x * s2s + sp.z * s2c;
      const wy = sp.y + SPHERE2_OFFSET_Y;
      const wz = rz + SPHERE2_OFFSET_Z;

      const p = project(rx, wy, wz);
      const t2 = (wz - (SPHERE2_OFFSET_Z - R2)) / (2 * R2);

      // Sphere-computed values
      let imgSize = (30 + t2 * t2 * 100) * sf;
      let posX = p.x - imgSize / 2;
      let posY = p.y - imgSize / 2;
      let bright = 0.05 + t2 * 0.15;
      let zIdx = 10 + Math.round(t2 * 40);

      const w = getBgWiggle(i, now);
      let wdx = w.dx, wdy = w.dy;

      const card = bgImgEls[i];
      card.style.left   = posX + 'px';
      card.style.top    = posY + 'px';
      card.style.width  = imgSize + 'px';
      card.style.height = imgSize + 'px';
      card.style.borderRadius = Math.round(imgSize * 0.14) + 'px';
      card.style.zIndex  = zIdx;
      card.style.filter = `brightness(${bright.toFixed(2)})`;

      // Entrance visibility: bg images are pop-in indices 1..12 (i+1)
      if (entrancePhase === 'hidden' || entrancePhase === 'hero') {
        card.style.opacity = 0;
        card.style.transform = `translate3d(${wdx.toFixed(3)}px, ${wdy.toFixed(3)}px, 0) scale(0)`;
      } else if (entrancePhase === 'popIn') {
        const popIdx = i + 1;
        if (popIdx <= popInVisible) {
          const st = popInStartTimes[popIdx];
          const elapsed = st ? now - st : POP_SCALE_DUR;
          const sp = Math.min(elapsed / POP_SCALE_DUR, 1);
          const se = easeOutCubic(sp);
          card.style.opacity = 1;
          card.style.transform = `translate3d(${wdx.toFixed(3)}px, ${wdy.toFixed(3)}px, 0) scale(${se.toFixed(3)})`;
        } else {
          card.style.opacity = 0;
          card.style.transform = `translate3d(${wdx.toFixed(3)}px, ${wdy.toFixed(3)}px, 0) scale(0)`;
        }
      } else {
        card.style.opacity = 1;
        card.style.transform = `translate3d(${wdx.toFixed(3)}px, ${wdy.toFixed(3)}px, 0)`;
      }
    }

    // --- Main sphere ---
    for (let i = 0; i < MAIN_SRCS.length; i++) {
      const base = IMAGE_BASE_POSITIONS[i];
      const r = applyRotations(base.x, base.y, base.z);
      const p = project(r.x, r.y, r.z);
      const t = depthNorm(r.z);

      let wx = 0, wy = 0;
      if (t < WIGGLE_DEPTH_THRESH) {
        const strength = 1 - t / WIGGLE_DEPTH_THRESH;
        const w = getMainWiggle(i, now);
        wx = w.dx * strength;
        wy = w.dy * strength;
      }

      // Sphere-computed values
      let imgSize = (70 + t * t * 290) * sf;
      let posX = p.x - imgSize / 2;
      let posY = p.y - imgSize / 2;
      let bright = 0.15 + t * t * 0.85;
      let zIdx = 50000 + Math.round(t * 40000);

      const card = mainImgEls[i];
      // During hero/popIn phases, hero card (i=0) is managed by imageRevealEntrance
      if ((entrancePhase === 'hero' || entrancePhase === 'popIn') && i === 0) continue;

      card.style.left   = posX + 'px';
      card.style.top    = posY + 'px';
      card.style.width  = imgSize + 'px';
      card.style.height = imgSize + 'px';
      card.style.borderRadius = Math.round(imgSize * 0.14) + 'px';
      card.style.zIndex  = zIdx;
      card.style.filter = `brightness(${bright.toFixed(2)})`;

      // Entrance visibility: main[0] is hero, main[1..4] are pop-in indices 13..16
      if (entrancePhase === 'hidden' || entrancePhase === 'hero') {
        card.style.opacity = 0;
        card.style.transform = `translate3d(${wx.toFixed(3)}px, ${wy.toFixed(3)}px, 0) scale(0)`;
      } else if (entrancePhase === 'popIn') {
        if (i === 0) {
          card.style.opacity = 1;
          card.style.transform = `translate3d(${wx.toFixed(3)}px, ${wy.toFixed(3)}px, 0)`;
        } else {
          const popIdx = 12 + i;
          if (popIdx <= popInVisible) {
            const st = popInStartTimes[popIdx];
            const elapsed = st ? now - st : POP_SCALE_DUR;
            const sp = Math.min(elapsed / POP_SCALE_DUR, 1);
            const se = easeOutCubic(sp);
            card.style.opacity = 1;
            card.style.transform = `translate3d(${wx.toFixed(3)}px, ${wy.toFixed(3)}px, 0) scale(${se.toFixed(3)})`;
          } else {
            card.style.opacity = 0;
            card.style.transform = `translate3d(${wx.toFixed(3)}px, ${wy.toFixed(3)}px, 0) scale(0)`;
          }
        }
      } else {
        card.style.opacity = 1;
        card.style.transform = `translate3d(${wx.toFixed(3)}px, ${wy.toFixed(3)}px, 0)`;
      }
    }
  }

  function renderLoop(now) {
    if (!animating) render(now);
    renderLoopId = requestAnimationFrame(renderLoop);
  }

  // ============================================
  // Rotation animations
  // ============================================
  function animateRotation(fromAngle, toAngle, duration, setter) {
    if (animating) return Promise.resolve();
    animating = true;

    return new Promise(resolve => {
      const delta = toAngle - fromAngle;
      const t0 = performance.now();

      function tick(now) {
        const raw = Math.min((now - t0) / duration, 1);
        const eased = easeInOutQuintic(raw);
        setter(fromAngle + delta * eased);
        render(now);

        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          setter(toAngle);
          render(now);
          animating = false;
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  function animateRot1(from, to, dur) {
    return animateRotation(from, to, dur, v => { rot1 = v; });
  }

  function animateRot2(from, to, dur) {
    return animateRotation(from, to, dur, v => { rot2 = v; });
  }

  // Background sphere spins independently (fire-and-forget)
  function spinSmallSphere(from, to, dur) {
    const delta = to - from;
    const t0 = performance.now();
    function tick(now) {
      const raw = Math.min((now - t0) / dur, 1);
      const eased = easeInOutQuintic(raw);
      s2rot = from + delta * eased;
      if (raw < 1) requestAnimationFrame(tick);
      else s2rot = to;
    }
    requestAnimationFrame(tick);
  }

  // ============================================
  // Circle dot & bubble positioning
  // ============================================
  function bubbleOffsetForAngle(angle) {
    const ac = Math.max(Math.abs(Math.cos(angle)), 0.05);
    const as = Math.max(Math.abs(Math.sin(angle)), 0.05);
    const edgeDist = Math.min(BUBBLE_HALF_W / ac, BUBBLE_HALF_H / as, 55);
    return edgeDist + BUBBLE_GAP;
  }

  function positionDot(angle) {
    const dx = CX + CIRCLE_R * Math.cos(angle);
    const dy = CY + CIRCLE_R * Math.sin(angle);
    circleDotEl.style.left = dx + 'px';
    circleDotEl.style.top  = dy + 'px';
    currentDotAngle = angle;
  }

  function bubblePosForAngle(angle) {
    const dx = CX + CIRCLE_R * Math.cos(angle);
    const dy = CY + CIRCLE_R * Math.sin(angle);
    const offset = bubbleOffsetForAngle(angle);
    return {
      x: dx + offset * Math.cos(angle),
      y: dy + offset * Math.sin(angle),
    };
  }

  function positionBubbleAt(x, y) {
    bubbleEl.style.left = x + 'px';
    bubbleEl.style.top  = y + 'px';
  }

  function positionBubbleForAngle(angle) {
    const p = bubblePosForAngle(angle);
    positionBubbleAt(p.x, p.y);
  }

  function animateBubble(fromAngle, toAngle, duration) {
    const from = bubblePosForAngle(fromAngle);
    const to   = bubblePosForAngle(toAngle);
    const t0 = performance.now();

    function tick(now) {
      const raw = Math.min((now - t0) / duration, 1);
      const eased = easeInOutQuintic(raw);
      positionBubbleAt(
        from.x + (to.x - from.x) * eased,
        from.y + (to.y - from.y) * eased
      );
      if (raw < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function fadeTextOut() {
    bubbleTextEl.style.opacity = '0';
    return wait(300);
  }

  function fadeTextIn(word) {
    bubbleTextEl.textContent = word;
    bubbleTextEl.style.opacity = '1';
  }

  function animateDot(fromAngle, toAngle, duration) {
    return new Promise(resolve => {
      const t0 = performance.now();
      let delta = toAngle - fromAngle;
      while (delta >  Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;

      function tick(now) {
        const raw = Math.min((now - t0) / duration, 1);
        const eased = easeInOutQuintic(raw);
        positionDot(fromAngle + delta * eased);
        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          positionDot(fromAngle + delta);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  function swapTextDuring(duration, newWord) {
    setTimeout(() => fadeTextOut(), duration * 0.4);
    setTimeout(() => fadeTextIn(newWord), duration * 0.6);
  }

  // ============================================
  // Image reveal entrance (hero + staggered pop-in)
  // ============================================
  async function imageRevealEntrance() {
    const FADE_DUR = 400;     // stage fade-in
    const HERO_DUR = 600;     // hero image materializes
    const POP_DELAY = 60;     // ms between each image popping in
    const TOTAL_OTHERS = BG_SRCS.length + MAIN_SRCS.length - 1; // 16

    // --- 1. Stage fades in ---
    entrancePhase = 'hidden';
    stageEl.style.opacity = '0';
    sceneEl.style.transform = 'scale(1)';
    stageEl.offsetHeight; // reflow

    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / FADE_DUR, 1);
        stageEl.style.opacity = raw;
        if (raw < 1) requestAnimationFrame(tick);
        else { stageEl.style.opacity = '1'; resolve(); }
      }
      requestAnimationFrame(tick);
    });

    // --- 2. Hero image materializes at center and grows to full sphere size ---
    // Single animation: scale(0)+blur at 0px → scale(1)+sharp at 360*sf
    entrancePhase = 'hero';
    const heroCard = mainImgEls[0];
    const sphereHeroSize = (70 + 290) * sf; // front-image size at t=1
    heroCard.style.left = (CX - sphereHeroSize / 2) + 'px';
    heroCard.style.top  = (CY - sphereHeroSize / 2) + 'px';
    heroCard.style.width  = sphereHeroSize + 'px';
    heroCard.style.height = sphereHeroSize + 'px';
    heroCard.style.borderRadius = Math.round(sphereHeroSize * 0.14) + 'px';
    heroCard.style.zIndex = 90000;
    heroCard.style.filter = 'brightness(1) blur(12px)';
    heroCard.style.transform = 'scale(0)';
    heroCard.style.opacity = '1';
    heroCard.offsetHeight; // reflow

    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / HERO_DUR, 1);
        const eased = easeOutCubic(raw);
        const blur = 12 * (1 - eased);
        heroCard.style.transform = `scale(${eased.toFixed(3)})`;
        heroCard.style.filter = `brightness(1) blur(${blur.toFixed(1)}px)`;
        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          heroCard.style.transform = 'scale(1)';
          heroCard.style.filter = 'brightness(1)';
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    await wait(400);

    // --- 4. Remaining 16 images scale in at their sphere positions ---
    entrancePhase = 'popIn';
    popInVisible = 0;
    popInStartTimes = [];

    // Do an initial render pass so sphere positions are computed
    render();

    // Stagger pop-in: each image scales up from 0 with a recorded start time
    for (let n = 1; n <= TOTAL_OTHERS; n++) {
      popInVisible = n;
      popInStartTimes[n] = performance.now();
      await wait(POP_DELAY);
    }

    // Wait for the last image's scale animation to finish
    await wait(POP_SCALE_DUR);

    await wait(400);

    // --- 5. Hand off to render() — hero already at sphere size, no snap ---
    entrancePhase = 'ready';
    heroCard.style.transform = '';
    heroCard.style.filter = '';
    render();
  }

  // ============================================
  // Auto-play sequence (matches test-image-unfold)
  // ============================================
  async function runSequence() {
    // Show dot & bubble at image 1
    positionDot(DOT_ANGLE_IMG1);
    positionBubbleForAngle(DOT_ANGLE_IMG1);
    circleDotEl.classList.add('image-unfold-dot--visible');
    bubbleEl.classList.add('image-unfold-bubble--visible');
    fadeTextIn(IMG_WORDS[1]);

    await wait(800);

    // === PHASE 1: rotate around axis 1 ===

    // 1→3
    swapTextDuring(3000, IMG_WORDS[3]);
    animateDot(DOT_ANGLE_IMG1, DOT_ANGLE_IMG3, 3000);
    animateBubble(DOT_ANGLE_IMG1, DOT_ANGLE_IMG3, 3000);
    spinSmallSphere(0, Math.PI * 0.7, 3000);
    await animateRot1(0, -Math.PI, 3000);

    await wait(1200);

    // 3→2
    swapTextDuring(2000, IMG_WORDS[2]);
    animateDot(DOT_ANGLE_IMG3, DOT_ANGLE_IMG2, 2000);
    animateBubble(DOT_ANGLE_IMG3, DOT_ANGLE_IMG2, 2000);
    spinSmallSphere(Math.PI * 0.7, Math.PI * 1.1, 2000);
    await animateRot1(-Math.PI, -Math.PI / 2, 2000);

    await wait(1200);

    // === PHASE 2: rotate around axis 2 ===

    // 2→5
    swapTextDuring(3000, IMG_WORDS[5]);
    animateDot(DOT_ANGLE_IMG2, DOT_ANGLE_IMG5, 3000);
    animateBubble(DOT_ANGLE_IMG2, DOT_ANGLE_IMG5, 3000);
    spinSmallSphere(Math.PI * 1.1, Math.PI * 1.8, 3000);
    await animateRot2(0, -Math.PI, 3000);

    await wait(1200);

    // 5→4
    swapTextDuring(2000, IMG_WORDS[4]);
    animateDot(DOT_ANGLE_IMG5, DOT_ANGLE_IMG4, 2000);
    animateBubble(DOT_ANGLE_IMG5, DOT_ANGLE_IMG4, 2000);
    spinSmallSphere(Math.PI * 1.8, Math.PI * 2.2, 2000);
    await animateRot2(-Math.PI, -Math.PI / 2, 2000);

    // Done — leave on screen
  }

  // ============================================
  // Unfold animation (sphere → scattered layout + count)
  // ============================================
  // Counter animation (same approach as editor.js animateCounter)
  function animateCountUp(el, target, duration, from) {
    from = from || 0;
    return new Promise(resolve => {
      const t0 = performance.now();
      const range = target - from;
      function tick(now) {
        const elapsed = now - t0;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.round(from + eased * range);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = target;
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  async function unfoldImages() {
    // --- 1. Fade out dot & bubble ---
    circleDotEl.classList.remove('image-unfold-dot--visible');
    bubbleEl.classList.remove('image-unfold-bubble--visible');
    await wait(600);

    // --- 2. Stop render loop — we take manual control ---
    if (renderLoopId) {
      cancelAnimationFrame(renderLoopId);
      renderLoopId = 0;
    }

    // Snapshot current positions/sizes/brightness for all images
    function parseBrightness(card) {
      const m = (card.style.filter || '').match(/brightness\(([\d.]+)\)/);
      return m ? parseFloat(m[1]) : 1;
    }
    const bgSnaps = bgImgEls.map(card => ({
      left:   parseFloat(card.style.left),
      top:    parseFloat(card.style.top),
      width:  parseFloat(card.style.width),
      height: parseFloat(card.style.height),
      opacity: parseFloat(card.style.opacity) || 1,
      bright: parseBrightness(card),
    }));
    const mainSnaps = mainImgEls.map(card => ({
      left:   parseFloat(card.style.left),
      top:    parseFloat(card.style.top),
      width:  parseFloat(card.style.width),
      height: parseFloat(card.style.height),
      opacity: parseFloat(card.style.opacity) || 1,
      bright: parseBrightness(card),
    }));

    // Target: all images collect to center at uniform size
    const cardSize = FAN_CARD_SIZE * sf;
    const collectX = CX - cardSize / 2;
    const collectY = CY - cardSize / 2;

    // --- 3. Collect: all images animate to center stack ---
    const COLLECT_DUR = 1000;
    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / COLLECT_DUR, 1);
        const e = easeInOutQuintic(raw);

        // Background images → center + fade out
        for (let i = 0; i < bgImgEls.length; i++) {
          const card = bgImgEls[i];
          const s = bgSnaps[i];
          card.style.left   = (s.left   + (collectX - s.left) * e) + 'px';
          card.style.top    = (s.top    + (collectY - s.top) * e) + 'px';
          card.style.width  = (s.width  + (cardSize - s.width) * e) + 'px';
          card.style.height = (s.height + (cardSize - s.height) * e) + 'px';
          card.style.borderRadius = Math.round((s.width + (cardSize - s.width) * e) * 0.14) + 'px';
          card.style.opacity = Math.max(0, s.opacity * (1 - e * 1.4)); // fade out faster
          card.style.filter = `brightness(${(s.bright + (1 - s.bright) * e).toFixed(2)})`;
          card.style.transform = 'none';
        }

        // Main images → center stack
        for (let i = 0; i < mainImgEls.length; i++) {
          const card = mainImgEls[i];
          const s = mainSnaps[i];
          card.style.left   = (s.left   + (collectX - s.left) * e) + 'px';
          card.style.top    = (s.top    + (collectY - s.top) * e) + 'px';
          card.style.width  = (s.width  + (cardSize - s.width) * e) + 'px';
          card.style.height = (s.height + (cardSize - s.height) * e) + 'px';
          card.style.borderRadius = Math.round((s.width + (cardSize - s.width) * e) * 0.14) + 'px';
          card.style.opacity = 1;
          card.style.filter = `brightness(${(s.bright + (1 - s.bright) * e).toFixed(2)})`;
          card.style.zIndex = 90000 + i;
          card.style.transform = 'none';
        }

        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    // Hide bg images now that they've faded out
    for (const card of bgImgEls) {
      card.style.opacity = 0;
    }

    await wait(300);

    // --- 4. Fan out the 5 main images ---
    // Fan angles: cards spread symmetrically, pivot from bottom-center
    const FAN_ANGLES = [-20, -10, 0, 10, 20]; // degrees
    // Horizontal offset per card (pixels, proportional to angle)
    const FAN_SPREAD_X = 28 * sf;
    // The fan center sits slightly below screen center; we'll slide it down in step 5
    const fanCenterY = CY - cardSize / 2;
    const FAN_DUR = 600;

    // Snapshot stack state (all at collectX, collectY)
    const stackSnaps = mainImgEls.map(() => ({
      left: collectX,
      top:  collectY,
      rot:  0,
    }));

    // Compute fan targets
    const fanTargets = FAN_ANGLES.map((deg, i) => ({
      left: collectX + (i - 2) * FAN_SPREAD_X,
      top:  collectY,
      rot:  deg,
    }));

    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / FAN_DUR, 1);
        const e = easeOutCubic(raw);

        for (let i = 0; i < mainImgEls.length; i++) {
          const card = mainImgEls[i];
          const s = stackSnaps[i];
          const f = fanTargets[i];
          const curLeft = s.left + (f.left - s.left) * e;
          const curTop  = s.top  + (f.top  - s.top)  * e;
          const curRot  = s.rot  + (f.rot  - s.rot)  * e;

          card.style.left = curLeft + 'px';
          card.style.top  = curTop + 'px';
          // Rotate from bottom center (transform-origin)
          card.style.transformOrigin = 'center bottom';
          card.style.transform = `rotate(${curRot.toFixed(1)}deg)`;
          card.style.zIndex = 90000 + i;
          card.style.filter = 'brightness(1)';
        }

        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    await wait(200);

    // --- 5. Slide fan down to make room for the counter above ---
    const SLIDE_DOWN = 80 * sf;
    const SLIDE_DUR = 500;

    // Snapshot current fan positions
    const fanSnaps = mainImgEls.map(card => parseFloat(card.style.top));

    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / SLIDE_DUR, 1);
        const e = easeOutCubic(raw);

        for (let i = 0; i < mainImgEls.length; i++) {
          const card = mainImgEls[i];
          card.style.top = (fanSnaps[i] + SLIDE_DOWN * e) + 'px';
        }

        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    // --- 6. Position count above the fan and show it ---
    // Place the count wrapper above the fanned cards
    const fanTopEdge = parseFloat(mainImgEls[2].style.top); // center card top
    countEl.style.top = (fanTopEdge - 20 * sf) + 'px';
    countEl.style.left = '50%';
    countEl.style.transform = 'translate(-50%, -100%)';
    countEl.classList.add('image-unfold-count-wrap--visible');

    await wait(300);

    // --- 7. Count up 0→211 ---
    await animateCountUp(countNumEl, IMAGE_COUNT, 1400);

    // --- 8. Show subtitle ---
    await wait(300);
    countLabelEl.classList.add('image-unfold-count__label--visible');

    // Hold for a moment so the user can read
    await wait(2000);

    // --- 9. Fade out counter ---
    countEl.classList.remove('image-unfold-count-wrap--visible');
    countLabelEl.classList.remove('image-unfold-count__label--visible');
    await wait(600);

    // --- 10. Collect fan back to center stack ---
    const COLLECT_BACK_DUR = 500;
    const fanBackSnaps = mainImgEls.map(card => ({
      left: parseFloat(card.style.left),
      top:  parseFloat(card.style.top),
      rot:  parseFloat((card.style.transform.match(/rotate\(([-\d.]+)deg\)/) || [0, 0])[1]),
    }));

    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / COLLECT_BACK_DUR, 1);
        const e = easeInOutQuintic(raw);

        for (let i = 0; i < mainImgEls.length; i++) {
          const card = mainImgEls[i];
          const s = fanBackSnaps[i];
          card.style.left = (s.left + (collectX - s.left) * e) + 'px';
          card.style.top  = (s.top  + (collectY - s.top)  * e) + 'px';
          card.style.transform = `rotate(${(s.rot * (1 - e)).toFixed(1)}deg)`;
        }

        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    await wait(200);

    // --- 11. Shrink the stacked images down, then fade out ---
    const SHRINK_DUR = 600;
    const shrinkSnaps = mainImgEls.map(card => ({
      left:   parseFloat(card.style.left),
      top:    parseFloat(card.style.top),
      width:  parseFloat(card.style.width),
      height: parseFloat(card.style.height),
    }));
    const shrinkTarget = 24 * sf; // shrink to small icon-like size

    await new Promise(resolve => {
      const t0 = performance.now();
      function tick(now) {
        const raw = Math.min((now - t0) / SHRINK_DUR, 1);
        const e = easeInOutQuintic(raw);

        for (let i = 0; i < mainImgEls.length; i++) {
          const card = mainImgEls[i];
          const s = shrinkSnaps[i];
          const curW = s.width + (shrinkTarget - s.width) * e;
          // Keep centered as they shrink
          const curLeft = s.left + (s.width - curW) / 2;
          const curTop  = s.top  + (s.height - curW) / 2;
          card.style.left   = curLeft + 'px';
          card.style.top    = curTop + 'px';
          card.style.width  = curW + 'px';
          card.style.height = curW + 'px';
          card.style.borderRadius = Math.round(curW * 0.14) + 'px';
          // Only start fading in the last 30% of the animation
          const fadeProgress = Math.max(0, (raw - 0.7) / 0.3);
          card.style.opacity = (1 - fadeProgress).toFixed(2);
          card.style.transform = 'none';
        }

        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });

    // --- 12. Fade out the stage ---
    stageEl.style.transition = 'opacity 0.3s ease';
    stageEl.style.opacity = '0';
    await wait(350);
  }

  // ============================================
  // Preload all images
  // ============================================
  function preloadImages() {
    const allSrcs = [...MAIN_SRCS, ...BG_SRCS];
    return Promise.all(
      allSrcs.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload  = resolve;
        img.onerror = resolve;
        img.src = src;
      }))
    );
  }

  // ============================================
  // Cleanup
  // ============================================
  function cleanup() {
    if (renderLoopId) {
      cancelAnimationFrame(renderLoopId);
      renderLoopId = 0;
    }
    if (stageEl) {
      stageEl.remove();
      stageEl = null;
    }
    sceneEl = null;
    mainImgEls = [];
    bgImgEls = [];
    circleDotEl = null;
    bubbleEl = null;
    bubbleTextEl = null;
    rot1 = 0;
    rot2 = 0;
    s2rot = 0;
    animating = false;
    entrancePhase = 'hidden';
    popInVisible = 0;
    popInStartTimes = [];
    countEl = null;
    countNumEl = null;
    countLabelEl = null;
  }

  // ============================================
  // Main entry — called by editor.js
  // ============================================
  async function start() {
    cleanup();

    await preloadImages();

    createStage();
    initGeometry();
    buildDOM();

    // Initial render (image 1 at front of sphere)
    render();

    // Start continuous render loop (keeps wiggle alive)
    renderLoopId = requestAnimationFrame(renderLoop);

    // Entrance: hero image + staggered pop-in
    await imageRevealEntrance();

    // Run the full rotation sequence
    await runSequence();

    // Unfold: images spread outward, reveal count
    await wait(1200);
    await unfoldImages();
  }

  // ============================================
  // Expose
  // ============================================
  window.__imageUnfold = { start };
})();
