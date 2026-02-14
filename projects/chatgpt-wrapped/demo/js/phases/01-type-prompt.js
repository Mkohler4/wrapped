/* ============================================
   Phase 1: Type into input
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.typePrompt = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, jitter } = H;
  const { PROMPT, CHAR_MS, SPACE_EXTRA, PAUSE_WORDS } = CFG;

  async function typePrompt() {
    const { inputText, placeholder, editor, inputWrap, sendBtn } = STATE.dom;

    let typed = '';
    for (let i = 0; i < PROMPT.length; i++) {
      const ch = PROMPT[i];
      typed += ch;
      inputText.textContent = typed;

      if (i === 0 && !STATE.hasZoomed) {
        STATE.hasZoomed = true;
        placeholder.classList.add('editor__placeholder--hidden');
        editor.classList.add('editor--zoomed');
        inputWrap.classList.add('editor__input-wrap--expanded');
        sendBtn.classList.add('editor__send-btn--active');
      }

      let delay = jitter(CHAR_MS);
      if (ch === ' ') delay += SPACE_EXTRA;

      for (const [word, pause] of Object.entries(PAUSE_WORDS)) {
        if (typed.endsWith(word) && (i + 1 >= PROMPT.length || PROMPT[i + 1] === ' ')) {
          delay += pause;
        }
      }
      await wait(delay);
    }
  }

  return typePrompt;
})();
