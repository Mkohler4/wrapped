/* ============================================
   Phase 7: Wrap in bubble → grow → zoom in
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.highlightResponse = (() => {
  'use strict';

  const { wait } = window.__editorHelpers;
  const T = window.__editorConfig.TIMINGS.PHASE_7;

  async function highlightResponse(response) {
    await wait(T.INITIAL_HOLD);

    response.classList.add('chat-ai-response--wrapped');
    await wait(T.WRAP_SETTLE);
    response.classList.add('chat-ai-response--grown');
    await wait(T.GROW_SETTLE);
    // NOTE: zoom is handled by dotDrawsGraph as one continuous motion.
    // No editor--zoomed-response here — avoids a two-step zoom.
    await wait(T.FINAL_HOLD); // Hold for a moment before next phase
  }

  return highlightResponse;
})();
