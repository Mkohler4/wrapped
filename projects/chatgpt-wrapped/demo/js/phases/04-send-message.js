/* ============================================
   Phase 4: Zoom out + user message bubble
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.sendMessage = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const T = CFG.TIMINGS.PHASE_4;

  async function sendMessage() {
    const { inputText, placeholder, sendBtn, inputWrap, editor, editorMain } = STATE.dom;

    const messageText = inputText.textContent;

    // Clear input
    inputText.textContent = '';
    placeholder.classList.remove('editor__placeholder--hidden');
    sendBtn.classList.remove('editor__send-btn--active');
    inputWrap.classList.remove('editor__input-wrap--expanded');

    // Zoom out (only if the zoom-in was applied — skipped on mobile)
    if (editor.classList.contains('editor--zoomed')) {
      editor.classList.remove('editor--zoomed');
      await wait(T.ZOOM_OUT_WAIT);
    }

    // Hide welcome
    const welcome = document.querySelector('.editor__welcome');
    welcome.style.transition = `opacity ${T.WELCOME_FADE_TRANSITION / 1000}s ease`;
    welcome.style.opacity = '0';
    await wait(T.WELCOME_FADE_WAIT);
    welcome.style.display = 'none';

    // Set up the chat messages container
    editorMain.style.justifyContent = 'flex-start';
    editorMain.style.alignItems = 'stretch';

    STATE.chatMessages = document.createElement('div');
    STATE.chatMessages.className = 'chat-messages';
    editorMain.appendChild(STATE.chatMessages);

    // Add user bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = messageText;
    STATE.chatMessages.appendChild(bubble);

    await wait(T.BUBBLE_SETTLE);
    bubble.classList.add('chat-bubble--visible');
    await wait(T.BUBBLE_VISIBLE_HOLD);
  }

  return sendMessage;
})();
