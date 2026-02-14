/* ============================================
   Phase 7: Wrap in bubble → grow → zoom in
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.highlightResponse = (() => {
  'use strict';

  const { wait } = window.__editorHelpers;

  async function highlightResponse(response) {
    await wait(800);

    response.classList.add('chat-ai-response--wrapped');
    await wait(700);
    response.classList.add('chat-ai-response--grown');
    await wait(500);
    // NOTE: zoom is handled by dotDrawsGraph as one continuous motion.
    // No editor--zoomed-response here — avoids a two-step zoom.
    await wait(1000); // Hold for a moment before next phase
  }

  return highlightResponse;
})();
