/* ============================================
   Phase 16: Cursor to input + type + send
   Three functions that work as a group for the
   "ask another question" flow.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

(() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, jitter } = H;
  const { CHAR_MS, SPACE_EXTRA } = CFG;

  // Phase 16a: Cursor travels to input field
  async function cursorToInput() {
    const { editor, editorMain, inputWrap, fakeCursor, placeholder, sendBtn, cursor } = STATE.dom;

    // Restore the footer — cascade (Phase 8) hides it via inline styles
    const footer = document.querySelector('.editor__footer');
    if (footer && (footer.style.display === 'none' || footer.classList.contains('editor__footer--hidden'))) {
      footer.classList.remove('editor__footer--hidden');
      footer.style.display = '';
      footer.style.position = '';
      footer.style.bottom = '';
      footer.style.left = '';
      footer.style.right = '';
      footer.style.zIndex = '';
      footer.style.pointerEvents = '';
      footer.style.opacity = '0';
      footer.offsetHeight;
      footer.style.transition = 'opacity 0.4s ease';
      footer.style.opacity = '1';
      await wait(400);
      footer.style.transition = '';
      footer.style.opacity = '';
    }

    const mainRect = editorMain.getBoundingClientRect();
    const inputRect = inputWrap.getBoundingClientRect();

    // Show fake cursor near chart center (mid-screen)
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${mainRect.left + mainRect.width / 2}px`;
    fakeCursor.style.top = `${mainRect.top + mainRect.height / 2}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(100);

    // Travel down to the input field
    fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${inputRect.left + inputRect.width / 2}px`;
    fakeCursor.style.top = `${inputRect.top + inputRect.height / 2}px`;
    await wait(650);

    // Click effect on input field
    inputWrap.style.transition = 'border-color 0.15s ease';
    inputWrap.style.borderColor = 'rgba(255, 255, 255, 0.25)';
    await wait(150);
    inputWrap.style.borderColor = '';

    // Fade cursor out as text cursor takes over
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(100);

    // Zoom in on input
    placeholder.classList.add('editor__placeholder--hidden');
    editor.classList.add('editor--zoomed');
    inputWrap.classList.add('editor__input-wrap--expanded');
    sendBtn.classList.add('editor__send-btn--active');
    cursor.classList.remove('editor__cursor--hidden');
    await wait(400);
  }

  // Phase 16b: Type prompt (parameterized)
  async function typeNewPrompt(text) {
    const { inputText } = STATE.dom;

    let typed = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      typed += ch;
      inputText.textContent = typed;

      let delay = jitter(CHAR_MS);
      if (ch === ' ') delay += SPACE_EXTRA;
      await wait(delay);
    }
  }

  // Phase 16b (cont): Send new message
  async function sendNewMessage() {
    const { editor, editorMain, inputText, placeholder, sendBtn, inputWrap, cursor } = STATE.dom;

    const messageText = inputText.textContent;

    // Clear input
    inputText.textContent = '';
    placeholder.classList.remove('editor__placeholder--hidden');
    sendBtn.classList.remove('editor__send-btn--active');
    inputWrap.classList.remove('editor__input-wrap--expanded');
    cursor.classList.add('editor__cursor--hidden');

    // Zoom out
    editor.classList.remove('editor--zoomed');
    await wait(400);

    // Ensure we have a chat messages container
    if (!STATE.chatMessages) {
      editorMain.style.justifyContent = 'flex-start';
      editorMain.style.alignItems = 'stretch';
      STATE.chatMessages = document.createElement('div');
      STATE.chatMessages.className = 'chat-messages';
      editorMain.appendChild(STATE.chatMessages);
    }

    // Add user bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = messageText;
    STATE.chatMessages.appendChild(bubble);

    await wait(50);
    bubble.classList.add('chat-bubble--visible');
    await wait(500);
  }

  window.__editorPhases.cursorToInput = cursorToInput;
  window.__editorPhases.typeNewPrompt = typeNewPrompt;
  window.__editorPhases.sendNewMessage = sendNewMessage;
})();
