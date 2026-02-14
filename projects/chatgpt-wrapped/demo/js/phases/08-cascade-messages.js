/* ============================================
   Phase 8: Ghost bubbles cascade (colorful)
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.cascadeMessages = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, cascadeEasing } = H;
  const { SAMPLE_MESSAGES_USER, SAMPLE_MESSAGES_AI } = CFG;

  async function cascadeMessages() {
    const { editor, editorMain } = STATE.dom;

    // Zoom back out so we can see the cascade filling
    editor.classList.remove('editor--zoomed-response');
    await wait(400);

    // --- Pop footer to overlay so bubbles can fill behind it ---
    const footer = document.querySelector('.editor__footer');
    const footerH = footer.offsetHeight;
    footer.style.position = 'absolute';
    footer.style.bottom = '0';
    footer.style.left = '0';
    footer.style.right = '0';
    footer.style.zIndex = '10';
    footer.style.transition = 'opacity 0.6s ease';

    // Reduce gap so ghosts pack tighter
    STATE.chatMessages.style.gap = '6px';

    // --- GPU pre-warm ---
    // Micro-blur forces the browser to promote chatMessages to its own
    // compositing layer NOW, so the real blur later doesn't stutter.
    STATE.chatMessages.style.willChange = 'filter, opacity';
    STATE.chatMessages.style.filter = 'blur(0.01px)';
    STATE.chatMessages.classList.add('chat-messages--blur-ready');

    // --- On-the-fly bubble creation + estimated scroll ---
    const totalBubbles = 200;
    const duration = 4800;
    const avgBubbleH = 21;  // ~15px avg height + 6px gap
    let bubbleCount = 0;
    let userMsgIdx = 0;
    let aiMsgIdx = 0;
    let footerFaded = false;

    // Read the initial content height and viewport ONCE before the loop.
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

    await new Promise(resolve => {
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = cascadeEasing(t);

        // Create any missing bubbles (they pop in via CSS ghostAppear)
        const targetCount = Math.min(totalBubbles, Math.ceil(eased * totalBubbles));
        while (bubbleCount < targetCount) {
          createBubble();
        }

        // Estimate total content height from bubble count — NO scrollHeight read.
        const estimatedH = initialContentH + bubbleCount * avgBubbleH;
        const scrollTarget = Math.max(0, estimatedH - viewportH);
        editorMain.scrollTop = scrollTarget;

        // Fade the footer at ~25% — reveals bubbles that were behind it
        if (!footerFaded && eased > 0.25) {
          footerFaded = true;
          footer.style.opacity = '0';
          footer.style.pointerEvents = 'none';
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Remove the footer entirely now that it's invisible
          footer.style.display = 'none';
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  }

  return cascadeMessages;
})();
