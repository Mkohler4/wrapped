/* ============================================
   Phase 8: Ghost bubbles cascade (colorful)
   ============================================
   One continuous rAF loop:
     • Fast burst  — 200 bubbles in 4.8s (eased)
     • Slow drift  — GPU-accelerated translateY
   The promise resolves at the end of the fast burst
   so Phase 9+ can start, but the rAF loop keeps
   running.  Returns { stop() } to kill the drift.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.cascadeMessages = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, cascadeEasing } = H;
  const { SAMPLE_MESSAGES_USER, SAMPLE_MESSAGES_AI } = CFG;
  const T = CFG.TIMINGS.PHASE_8;

  async function cascadeMessages() {
    const { editor, editorMain } = STATE.dom;

    // Zoom back out so we can see the cascade filling
    editor.classList.remove('editor--zoomed-response');
    await wait(T.ZOOM_OUT);

    // --- Pop footer to overlay so bubbles can fill behind it ---
    const footer = document.querySelector('.editor__footer');
    footer.style.position = 'absolute';
    footer.style.bottom = '0';
    footer.style.left = '0';
    footer.style.right = '0';
    footer.style.zIndex = '10';
    footer.style.transition = 'opacity 0.6s ease';

    // Reduce gap so ghosts pack tighter
    STATE.chatMessages.style.gap = '6px';

    // --- GPU pre-warm ---
    STATE.chatMessages.style.willChange = 'filter, opacity, transform';
    STATE.chatMessages.style.filter = 'blur(0.01px)';
    STATE.chatMessages.classList.add('chat-messages--blur-ready');

    // --- Shared state ---
    const avgBubbleH = 21;
    let bubbleCount = 0;
    let userMsgIdx = 0;
    let aiMsgIdx = 0;
    let footerFaded = false;

    const initialContentH = editorMain.scrollHeight;
    const viewportH = editorMain.clientHeight;

    function createBubble() {
      const ghost = document.createElement('div');
      const isUser = Math.random() > 0.4;
      const sideClass = isUser ? 'ghost-bubble--user' : 'ghost-bubble--ai';
      const isFeatured = Math.random() < 0.15;

      if (isFeatured) {
        ghost.className = `ghost-bubble ghost-bubble--active ${sideClass} ghost-bubble--featured`;
        if (isUser) {
          ghost.textContent = SAMPLE_MESSAGES_USER[userMsgIdx % SAMPLE_MESSAGES_USER.length];
          userMsgIdx++;
        } else {
          ghost.textContent = SAMPLE_MESSAGES_AI[aiMsgIdx % SAMPLE_MESSAGES_AI.length];
          aiMsgIdx++;
        }
        ghost.style.height = `${20 + Math.random() * 6}px`;
        ghost.style.width = `${45 + Math.random() * 40}%`;
      } else {
        ghost.className = `ghost-bubble ghost-bubble--active ${sideClass}`;
        ghost.style.width = `${30 + Math.random() * 55}%`;
        ghost.style.height = `${12 + Math.random() * 6}px`;
      }

      STATE.chatMessages.appendChild(ghost);
      bubbleCount++;
    }

    // =============================================
    // Single continuous rAF loop
    // =============================================
    const TOTAL_BUBBLES     = T.TOTAL_BUBBLES;
    const FAST_DURATION     = T.FAST_BURST_DURATION;
    const DRIFT_PX_PER_SEC  = T.DRIFT_PX_PER_SEC;

    let running = true;
    let phase = 'fast';       // 'fast' → 'drift'
    let driftOffset = 0;      // px shifted via translateY
    let resolveReady;

    const readyPromise = new Promise(r => { resolveReady = r; });
    const startTime = performance.now();
    let lastTick = startTime;

    function tick(now) {
      if (!running) return;

      if (phase === 'fast') {
        // ------- FAST BURST -------
        const elapsed = now - startTime;
        const t = Math.min(elapsed / FAST_DURATION, 1);
        const eased = cascadeEasing(t);

        const targetCount = Math.min(TOTAL_BUBBLES, Math.ceil(eased * TOTAL_BUBBLES));
        while (bubbleCount < targetCount) createBubble();

        // Estimated scroll
        const estimatedH = initialContentH + bubbleCount * avgBubbleH;
        const scrollTarget = Math.max(0, estimatedH - viewportH);
        editorMain.scrollTop = scrollTarget;

        if (!footerFaded && eased > 0.25) {
          footerFaded = true;
          footer.style.opacity = '0';
          footer.style.pointerEvents = 'none';
        }

        if (t >= 1) {
          footer.style.display = 'none';

          // Seamless hand-off to drift — no DOM additions, just translateY
          phase = 'drift';
          resolveReady();
        }
      } else {
        // ------- SLOW DRIFT (GPU-accelerated) -------
        const dt = (now - lastTick) / 1000;
        driftOffset += DRIFT_PX_PER_SEC * dt;
        STATE.chatMessages.style.transform = `translateY(-${driftOffset}px)`;
      }

      lastTick = now;
      requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    // Wait for the fast burst to finish
    await readyPromise;

    // Return controller so downstream phases can stop the drift
    return {
      stop() { running = false; },
    };
  }

  return cascadeMessages;
})();
