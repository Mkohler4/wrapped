/* ============================================
   Phase 18: Unwrite + restream AI text
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

(() => {
  'use strict';

  const H = window.__editorHelpers;
  const { wait, jitter } = H;

  // Phase 18a: Unwrite AI text — word-by-word in reverse
  async function unwriteText(textContainer, streamCursor) {
    // Show the stream cursor again so it looks like the AI is editing
    streamCursor.classList.remove('chat-ai-response__cursor--hidden');

    const nodes = Array.from(textContainer.childNodes);
    // Walk the list backwards
    for (let n = nodes.length - 1; n >= 0; n--) {
      const node = nodes[n];
      const isSpan = node.nodeType === Node.ELEMENT_NODE;
      const textNode = isSpan ? node.firstChild : node;
      if (!textNode || !textNode.textContent) {
        if (isSpan) node.remove();
        else node.remove();
        continue;
      }

      // Split into words (preserve whitespace tokens for faithful removal)
      let content = textNode.textContent;
      while (content.length > 0) {
        // Trim trailing whitespace first
        const trimmed = content.replace(/\s+$/, '');
        if (trimmed.length < content.length) {
          content = trimmed;
          textNode.textContent = content;
        }
        if (content.length === 0) break;

        // Find last word boundary
        const lastSpace = content.lastIndexOf(' ');
        if (lastSpace === -1) {
          // Last remaining word — remove it
          content = '';
          textNode.textContent = content;
        } else {
          content = content.substring(0, lastSpace);
          textNode.textContent = content;
        }
        await wait(jitter(40, 10));
      }

      // If the node is now empty, remove it from the DOM
      if (isSpan) node.remove();
      else node.remove();
    }

    // Ensure the container is fully empty
    textContainer.textContent = '';
  }

  // Phase 18b: Re-stream new AI text — word-by-word forward
  async function restreamText(textContainer, streamCursor, messageParts) {
    // Cursor should already be visible from unwriteText
    streamCursor.classList.remove('chat-ai-response__cursor--hidden');

    for (const part of messageParts) {
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
          await wait(jitter(55, 15));
        }
      }
    }

    streamCursor.classList.add('chat-ai-response__cursor--hidden');
  }

  window.__editorPhases.unwriteText = unwriteText;
  window.__editorPhases.restreamText = restreamText;
})();
