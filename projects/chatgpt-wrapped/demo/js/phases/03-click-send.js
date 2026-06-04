/* ============================================
   Phase 3: Click send button
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.clickSend = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const T = CFG.TIMINGS.PHASE_3;

  async function clickSend() {
    const { sendBtn, fakeCursor } = STATE.dom;

    sendBtn.classList.add('editor__send-btn--pressed');
    await wait(T.PRESS_HOLD);

    sendBtn.classList.remove('editor__send-btn--pressed');
    sendBtn.classList.add('editor__send-btn--released', 'editor__send-btn--ripple');
    sendBtn.style.position = 'relative';
    await wait(T.RELEASE_RIPPLE);

    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(T.CURSOR_FADE);

    sendBtn.classList.remove('editor__send-btn--ripple', 'editor__send-btn--released');
  }

  return clickSend;
})();
