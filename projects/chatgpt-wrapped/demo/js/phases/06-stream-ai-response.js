/* ============================================
   Phase 6: AI response streams in word-by-word
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.streamAIResponse = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, jitter } = H;
  const { AI_RESPONSE_PARTS } = CFG;

  async function streamAIResponse(thinkingDots) {
    // Remove thinking dots
    thinkingDots.style.transition = 'opacity 0.2s ease';
    thinkingDots.style.opacity = '0';
    await wait(200);
    thinkingDots.remove();

    // Create the response element
    const response = document.createElement('div');
    response.className = 'chat-ai-response';

    const textContainer = document.createElement('span');
    response.appendChild(textContainer);

    const streamCursor = document.createElement('span');
    streamCursor.className = 'chat-ai-response__cursor';
    response.appendChild(streamCursor);

    STATE.chatMessages.appendChild(response);

    await wait(50);
    response.classList.add('chat-ai-response--visible');
    await wait(200);

    // Stream each part word-by-word
    for (const part of AI_RESPONSE_PARTS) {
      const words = part.text.split(/(\s+)/);

      for (const word of words) {
        if (!word) continue;

        if (part.cls) {
          const span = document.createElement('span');
          span.className = part.cls;
          span.textContent = word;
          textContainer.appendChild(span);
        } else {
          textContainer.appendChild(document.createTextNode(word));
        }

        if (word.trim()) {
          await wait(jitter(55, 20));
        }
      }
    }

    // Done streaming — hide cursor
    await wait(400);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    return response;
  }

  return streamAIResponse;
})();
