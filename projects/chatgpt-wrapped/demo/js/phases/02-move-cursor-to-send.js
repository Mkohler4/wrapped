/* ============================================
   Phase 2: Fake cursor → send button
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.moveCursorToSend = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;

  async function moveCursorToSend() {
    const { cursor, sendBtn, inputText, fakeCursor } = STATE.dom;

    cursor.classList.add('editor__cursor--hidden');

    const btnRect = sendBtn.getBoundingClientRect();
    const textRect = inputText.getBoundingClientRect();

    fakeCursor.style.left = `${textRect.right + 10}px`;
    fakeCursor.style.top = `${textRect.top + textRect.height / 2}px`;
    fakeCursor.style.transition = 'none';
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight;

    fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top = `${btnRect.top + btnRect.height / 2 - 3}px`;

    await wait(650);
  }

  return moveCursorToSend;
})();
