/* ============================================
   Phase 9: Blur messages, then show gradient
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.compressAndBlur = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;

  async function compressAndBlur() {
    const { editorMain } = STATE.dom;

    // Step 1: Blur the messages (transition was pre-set via blur-ready class)
    STATE.chatMessages.style.filter = '';  // remove micro-blur so transition starts clean
    STATE.chatMessages.classList.add('chat-messages--blurred');

    // Wait for the 0.8s blur+opacity CSS transition to fully complete
    await wait(900);

    // Step 2: Fade in the gradient overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'stat-backdrop';
    editorMain.appendChild(backdrop);

    await wait(50); // let browser paint the element at opacity 0
    backdrop.classList.add('stat-backdrop--visible');

    // Wait for the 0.6s opacity transition to complete
    await wait(700);
  }

  return compressAndBlur;
})();
