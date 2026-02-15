/* ============================================
   Phase 9: Blur messages, then show gradient
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.compressAndBlur = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const T = CFG.TIMINGS.PHASE_9;

  async function compressAndBlur() {
    const { editorMain } = STATE.dom;

    // Step 1: Blur the messages (transition was pre-set via blur-ready class)
    STATE.chatMessages.style.filter = '';  // remove micro-blur so transition starts clean
    STATE.chatMessages.classList.add('chat-messages--blurred');

    // Step 2: Start the gradient overlay while the blur is still settling
    await wait(T.BLUR_SETTLE);

    const backdrop = document.createElement('div');
    backdrop.className = 'stat-backdrop';
    editorMain.appendChild(backdrop);

    await wait(T.BACKDROP_SETTLE);
    backdrop.classList.add('stat-backdrop--visible');

    // Let both transitions overlap — move on quickly
    await wait(T.OVERLAP_HOLD);
  }

  return compressAndBlur;
})();
