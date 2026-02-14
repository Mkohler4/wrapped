/* ============================================
   Phase 5: Thinking dots (left side)
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.showThinkingDots = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;

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
    await wait(1500);

    // Intensify
    thinking.classList.add('chat-thinking--intense');
    await wait(600);

    return thinking;
  }

  return showThinkingDots;
})();
