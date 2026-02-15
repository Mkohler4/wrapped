/* ============================================
   Phase 8 V2: Pre-rendered Scroll Strip
   ============================================
   Architecture:
     1. Build all ~350 ghost bubbles into a single
        tall div BEFORE the animation starts.
     2. Wrap the strip in a mask (overflow: hidden +
        CSS gradient fade at bottom edge).
     3. Animate translateY via a velocity-based rAF loop:
          • Ramp  — quadratic ease-in to peak speed
          • Cruise — constant peak speed
          • Decel — smoothstep into drift speed
          • Drift — constant gentle speed behind blur
          Speed is ALWAYS continuous — no stop-start.
     4. Zero DOM mutations during the animation.
        Everything is GPU-composited.

   Returns { stop(), kill() }.
    stop()  — called by Phase 10; intentional NO-OP so the
              rAF drift keeps running (infinite staircase).
    kill()  — actually halts the rAF loop.  Called by
              Phase 11-v2 right before the exit animation.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.cascadeMessages = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const { SAMPLE_MESSAGES_USER, SAMPLE_MESSAGES_AI } = CFG;

  // --- Tuning knobs ---
  const TOTAL_BUBBLES    = 350;    // enough for ~7 800 px of strip
  const FAST_DURATION    = 3200;   // ms  (shorter burst)
  const PEAK_SPEED       = 1400;   // px/s at cruise (gentler peak)
  const DRIFT_PX_PER_SEC = 80;     // px/s — gentle drift behind blur

  // Velocity curve boundaries (as fraction of FAST_DURATION)
  const RAMP_END    = 0.25;  // first 25%: ease-in from 0 → PEAK_SPEED
  const DECEL_START = 0.80;  // last 20%: ease-out from PEAK_SPEED → DRIFT

  /* ------------------------------------------------
     getSpeed — continuous velocity at any point
     during the fast phase.  Returns px/s.
     Guarantees getSpeed(FAST_DURATION) === DRIFT_PX_PER_SEC
     so the handoff to drift is perfectly seamless.
     ------------------------------------------------ */
  function getSpeed(elapsedMs) {
    const t = Math.min(elapsedMs / FAST_DURATION, 1);

    if (t <= RAMP_END) {
      // Quadratic ease-in: 0 → PEAK_SPEED
      const p = t / RAMP_END;
      return PEAK_SPEED * p * p;
    } else if (t <= DECEL_START) {
      // Cruise at PEAK_SPEED
      return PEAK_SPEED;
    } else {
      // Smoothstep ease-out: PEAK_SPEED → DRIFT_PX_PER_SEC
      const p = (t - DECEL_START) / (1 - DECEL_START);
      const s = p * p * (3 - 2 * p);          // smoothstep 0→1
      return PEAK_SPEED + (DRIFT_PX_PER_SEC - PEAK_SPEED) * s;
    }
  }

  // Module-level handle to kill a previous animation (if restarted).
  let killPrevious = null;

  /* ------------------------------------------------
     buildStrip — pre-render all ghost bubbles
     ------------------------------------------------
     Returns a detached <div class="cascade-strip">
     filled with TOTAL_BUBBLES ghost-bubble elements.
     Because nothing is in the DOM yet, all appendChild
     calls are free (no layout / paint).
     ------------------------------------------------ */
  function buildStrip() {
    const strip = document.createElement('div');
    strip.className = 'cascade-strip';

    let userMsgIdx = 0;
    let aiMsgIdx   = 0;

    for (let i = 0; i < TOTAL_BUBBLES; i++) {
      const ghost    = document.createElement('div');
      const isUser   = Math.random() > 0.4;
      const sideClass = isUser ? 'ghost-bubble--user' : 'ghost-bubble--ai';
      const isFeatured = Math.random() < 0.15;

      if (isFeatured) {
        ghost.className = `ghost-bubble ${sideClass} ghost-bubble--featured`;
        ghost.textContent = isUser
          ? SAMPLE_MESSAGES_USER[userMsgIdx++ % SAMPLE_MESSAGES_USER.length]
          : SAMPLE_MESSAGES_AI[aiMsgIdx++ % SAMPLE_MESSAGES_AI.length];
        ghost.style.height = `${20 + Math.random() * 6}px`;
        ghost.style.width  = `${45 + Math.random() * 40}%`;
      } else {
        ghost.className = `ghost-bubble ${sideClass}`;
        ghost.style.width  = `${30 + Math.random() * 55}%`;
        ghost.style.height = `${12 + Math.random() * 6}px`;
      }

      strip.appendChild(ghost);
    }

    return strip;
  }

  /* ------------------------------------------------
     cascadeMessages — main entry point
     ------------------------------------------------ */
  async function cascadeMessages() {
    // Kill any previous instance still running
    if (killPrevious) killPrevious();

    // Shared abort flag — captured by the rAF closure and killPrevious
    let running = true;

    // Ready promise — resolved when the fast phase finishes
    // (so Phase 9 / 10 can start).  Also resolved by kill
    // so the await doesn't hang forever on restart.
    let resolveReady;
    const readyPromise = new Promise(r => { resolveReady = r; });

    killPrevious = () => {
      running = false;
      resolveReady();          // unblock if still in the fast phase
    };

    const { editor, editorMain } = STATE.dom;

    // Zoom back out (matches original Phase 8 behavior)
    editor.classList.remove('editor--zoomed-response');
    await wait(400);

    // Bail if killed during the wait (e.g. rapid restart)
    if (!running) return { stop() {} };

    // --- Footer overlay (same as original) ---
    const footer = document.querySelector('.editor__footer');
    if (footer) {
      footer.style.position    = 'absolute';
      footer.style.bottom      = '0';
      footer.style.left        = '0';
      footer.style.right       = '0';
      footer.style.zIndex      = '10';
      footer.style.transition  = 'opacity 0.6s ease';
    }

    // Keep existing chat content (graph / AI response) visible
    // behind the mask — it shows through until bubbles cover it.
    const oldContent = STATE.chatMessages;

    // =============================================
    // Pop-in intro — individual bubbles appear one
    // by one below the graph, pushing it upward via
    // normal document flow.  Uses a container with
    // the same layout as the cascade strip (gap, max-
    // width, padding) so bubbles look identical.
    // =============================================
    const INTRO_COUNT = 15;
    const INTRO_DELAY = 140;  // ms between first pop-ins

    // Container that matches cascade-strip layout exactly
    const introContainer = document.createElement('div');
    introContainer.style.cssText = [
      'display:flex',
      'flex-direction:column',
      'gap:6px',
      'width:100%',
      'max-width:680px',
      'margin:0 auto',
      'padding-top:8px',
    ].join(';');
    oldContent.appendChild(introContainer);

    for (let i = 0; i < INTRO_COUNT; i++) {
      if (!running) return { stop() {}, kill() {} };

      const ghost   = document.createElement('div');
      const isUser  = Math.random() > 0.4;
      const side    = isUser ? 'ghost-bubble--user' : 'ghost-bubble--ai';
      ghost.className = `ghost-bubble ${side}`;
      ghost.style.width   = `${30 + Math.random() * 55}%`;
      ghost.style.height  = `${12 + Math.random() * 6}px`;
      ghost.style.opacity = '0';
      ghost.style.transition = 'opacity 0.15s ease';

      introContainer.appendChild(ghost);

      // Scroll editorMain to keep the bottom visible
      editorMain.scrollTop = editorMain.scrollHeight;

      // Fade the bubble in
      ghost.offsetHeight;  // reflow
      ghost.style.opacity = '1';

      // Accelerate: delay shrinks as more bubbles appear
      const delay = Math.max(40, INTRO_DELAY - (i * 10));
      await wait(delay);
    }

    if (!running) return { stop() {}, kill() {} };

    // --- Build strip (all DOM mutations happen here, off-screen) ---
    const strip = buildStrip();

    // Grab all bubble elements for the reveal animation
    const bubbles = strip.children;

    // --- Assemble mask → strip → editorMain ---
    const mask = document.createElement('div');
    mask.className  = 'cascade-mask';
    mask.style.opacity = '0';            // start invisible for fade-in
    mask.appendChild(strip);
    editorMain.appendChild(mask);         // single DOM insertion

    // Reassign STATE.chatMessages so Phase 9 (blur) and
    // Phase 10 (stat + backdrop switch) target the strip.
    STATE.chatMessages = strip;

    // GPU pre-warm for Phase 9's blur transition
    strip.style.willChange = 'filter, opacity, transform';
    strip.style.filter     = 'blur(0.01px)';
    strip.classList.add('chat-messages--blur-ready');

    // --- Fade in the mask (concurrent with scroll start) ---
    mask.offsetHeight;                    // force layout — one-time cost
    mask.style.transition = 'opacity 0.3s ease';
    mask.style.opacity    = '1';

    // =============================================
    // Single continuous rAF loop — velocity-based
    // =============================================
    // Accumulate position from instantaneous speed
    // so there's NEVER a discontinuity.  The fast
    // phase decelerates smoothly into drift speed.
    // =============================================

    // Start the strip BELOW the mask so bubbles scroll
    // up into view from the bottom — matching the original
    // "append-at-bottom" illusion.  A negative offset means
    // translateY is positive, pushing the strip downward.
    const maskHeight = mask.getBoundingClientRect().height;
    let offset       = -maskHeight;

    // Reveal tracking — bubbles start at opacity 0 and
    // get .revealed one by one as they enter the viewport.
    // Average bubble height ≈ (height + gap) for estimation.
    const AVG_BUBBLE_H = 22;   // ~16px height + 6px gap
    let revealed       = 0;

    let footerFaded = false;
    let fastDone    = false;

    const startTime = performance.now();
    let   lastTick  = startTime;

    function tick(now) {
      if (!running) return;

      const dt      = (now - lastTick) / 1000;   // seconds
      const elapsed = now - startTime;            // ms

      // Speed is continuous: fast curve blends into drift
      const speed = elapsed < FAST_DURATION
        ? getSpeed(elapsed)
        : DRIFT_PX_PER_SEC;

      offset += speed * dt;

      // Fade the footer once we're clearly moving
      if (!footerFaded && elapsed > FAST_DURATION * 0.12) {
        footerFaded = true;
        if (footer) {
          footer.style.opacity       = '0';
          footer.style.pointerEvents = 'none';
        }
      }

      // Push the old content (graph / AI response) upward
      // in sync with the rising bubbles — physical scroll,
      // not a fade.  `entered` = how far bubbles have risen
      // into the visible mask area (0 at start).
      const entered = offset + maskHeight;
      if (oldContent && entered > 0) {
        oldContent.style.transform = `translateY(${-entered}px)`;
      }

      // Reveal bubbles as they scroll into the mask.
      // During the slow ramp they pop in one by one;
      // during cruise the reveals are too fast to see.
      if (entered > 0) {
        const shouldReveal = Math.min(
          bubbles.length,
          Math.ceil(entered / AVG_BUBBLE_H),
        );
        while (revealed < shouldReveal) {
          bubbles[revealed].classList.add('revealed');
          revealed++;
        }
      }

      // Signal downstream phases once the fast burst is over
      if (!fastDone && elapsed >= FAST_DURATION) {
        fastDone = true;
        if (footer) footer.style.display = 'none';
        // Old content is well off-screen by now — hide it
        if (oldContent) oldContent.style.display = 'none';
        resolveReady();
      }

      strip.style.transform = `translateY(${-offset}px)`;
      lastTick = now;
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Wait for the fast burst to finish
    await readyPromise;

    // If killed while awaiting, bail out
    if (!running) return { stop() {}, kill() {} };

    // Controller returned to the caller.
    // stop()  — intentional no-op so the drift never freezes.
    //           Phase 10 calls this, and the rAF keeps running.
    // kill()  — real shutdown, called by Phase 11-v2 at exit.
    const ctrl = {
      stop() { /* no-op — infinite staircase */ },
      kill() {
        running      = false;
        killPrevious = null;
      },
    };

    // Expose globally so Phase 11-v2 can reach it without
    // needing the controller threaded through every phase.
    window.__cascadeV2Ctrl = ctrl;

    return ctrl;
  }

  return cascadeMessages;
})();
