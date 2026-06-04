/* ============================================
   Phase 27: Cursor moves to image button
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.moveCursorToImageBtn = (() => {
  'use strict';

  const { wait } = window.__editorHelpers;
  const STATE = window.__editorState;

  async function moveCursorToImageBtn() {
    const { editorMain, fakeCursor } = STATE.dom;
    const imageBtn = document.querySelector('.editor__attach-btn');
    const btnRect = imageBtn.getBoundingClientRect();

    // Show fake cursor near the centre of the main area
    const mainRect = editorMain.getBoundingClientRect();
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${mainRect.left + mainRect.width / 2}px`;
    fakeCursor.style.top = `${mainRect.top + mainRect.height * 0.6}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight;

    await wait(200);

    // Glide to the image button
    fakeCursor.style.transition =
      'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top = `${btnRect.top + btnRect.height / 2 - 3}px`;

    await wait(650);
  }

  return moveCursorToImageBtn;
})();
