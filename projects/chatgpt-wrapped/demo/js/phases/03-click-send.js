/* ============================================
   Phase 3: Click send button
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.clickSend = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;

  async function clickSend() {
    const { sendBtn, fakeCursor } = STATE.dom;

    sendBtn.classList.add('editor__send-btn--pressed');
    await wait(120);

    sendBtn.classList.remove('editor__send-btn--pressed');
    sendBtn.classList.add('editor__send-btn--released', 'editor__send-btn--ripple');
    sendBtn.style.position = 'relative';
    await wait(150);

    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(200);

    sendBtn.classList.remove('editor__send-btn--ripple', 'editor__send-btn--released');
  }

  return clickSend;
})();
