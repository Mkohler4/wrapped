/* ============================================
   Phase 5: Thinking dots (left side)
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.showThinkingDots = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const T = CFG.TIMINGS.PHASE_5;

  async function showThinkingDots() {
    const thinking = document.createElement('div');
    thinking.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinking.appendChild(dot);
    }
    STATE.chatMessages.appendChild(thinking);

    // Normal thinking
    await wait(T.NORMAL_THINKING);

    // Intensify
    thinking.classList.add('chat-thinking--intense');
    await wait(T.INTENSIFY);

    return thinking;
  }

  return showThinkingDots;
})();
