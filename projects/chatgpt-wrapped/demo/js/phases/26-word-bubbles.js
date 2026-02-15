/* ============================================
   Phase 26: Square → circle word bubble morph
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.morphCellToWordBubble = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, jitter } = H;
  const { WORD_FREQUENCY_DATA, WORDS_RESPONSE_PARTS } = CFG;

  async function morphCellToWordBubble(cell) {
    const { editor, editorMain, fakeCursor } = STATE.dom;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wordData = WORD_FREQUENCY_DATA[0];
    const targetSize = 180;

    // --- Step 1: Morph square → circle ---
    cell.style.transition =
      'border-radius 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
    cell.style.borderRadius = '50%';

    await wait(900);

    // --- Step 2: Grow circle + morph style + bring back editor with header ---
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    const sidebar = document.getElementById('sidebar');

    sidebar.classList.remove('editor__sidebar--open');
    editor.classList.remove('editor--sidebar-open');
    footer.style.display = 'none';
    editorMain.innerHTML = '';
    editorMain.style.justifyContent = 'flex-start';
    editorMain.style.alignItems = 'stretch';
    editorMain.style.overflow = 'hidden';

    // Create chat container for the AI message
    STATE.chatMessages = document.createElement('div');
    STATE.chatMessages.className = 'chat-messages';
    STATE.chatMessages.style.paddingTop = '24px';
    editorMain.appendChild(STATE.chatMessages);

    // Reset editor to invisible
    editor.style.transition = 'none';
    editor.style.transform = 'none';
    editor.style.transformOrigin = '';
    editor.style.opacity = '0';
    header.style.transition = 'none';
    header.style.opacity = '1';
    editor.offsetHeight;

    // Grow the circle AND morph from solid fill → transparent border style
    cell.style.transition =
      'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'height 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'top 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'background 1s ease, ' +
      'border 1s ease, ' +
      'box-shadow 1s ease';

    cell.style.width = `${targetSize}px`;
    cell.style.height = `${targetSize}px`;
    cell.style.left = `${(vw - targetSize) / 2}px`;
    cell.style.top = `${(vh - targetSize) / 2}px`;
    cell.style.background = 'rgba(16, 185, 129, 0.08)';
    cell.style.border = '2px solid rgba(16, 185, 129, 0.40)';
    cell.style.boxShadow =
      '0 0 20px rgba(16, 185, 129, 0.10), ' +
      'inset 0 0 20px rgba(16, 185, 129, 0.06)';

    // Simultaneously fade the editor back in
    editor.style.transition = 'opacity 1s ease';
    editor.style.opacity = '1';

    await wait(1400);

    // --- Step 3: Add word text + count inside the cell ---
    cell.style.display = 'flex';
    cell.style.flexDirection = 'column';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    cell.style.overflow = 'hidden';

    const textEl = document.createElement('span');
    textEl.className = 'word-bubble__text';
    textEl.style.fontSize = '20px';
    textEl.textContent = wordData.word;
    cell.appendChild(textEl);

    const countEl = document.createElement('span');
    countEl.className = 'word-bubble__count';
    countEl.style.fontSize = '13px';
    countEl.textContent = wordData.displayCount;
    cell.appendChild(countEl);

    await wait(50);
    textEl.classList.add('word-bubble__text--visible');
    await wait(300);
    countEl.classList.add('word-bubble__count--visible');

    await wait(800);

    // --- Step 4: Thinking dots → AI message streams in + bubbles pop out ---
    const TOTAL_EXTRA = 5;
    const viewport = document.getElementById('viewport');
    const allBubbles = [{ el: cell, txtEl: textEl, cntEl: countEl }];

    // Compute sizes for extra bubbles proportional to the first
    const bubbleMeta = [];
    for (let i = 1; i <= TOTAL_EXTRA; i++) {
      const d = WORD_FREQUENCY_DATA[i];
      const size = Math.round(targetSize * (d.count / wordData.count));
      bubbleMeta.push({ data: d, size });
    }

    // Pre-compute non-overlapping final positions
    const placed = [];
    const firstR = targetSize / 2;

    function findPosition(r) {
      const padding = 14;
      const zoneLeft   = vw * 0.20;
      const zoneRight  = vw * 0.80;
      const zoneTop    = vh * 0.30;
      const zoneBottom = vh * 0.75;
      let bestX, bestY, tries = 0;
      do {
        bestX = zoneLeft + r + Math.random() * (zoneRight - zoneLeft - 2 * r);
        bestY = zoneTop  + r + Math.random() * (zoneBottom - zoneTop - 2 * r);
        tries++;
        const overlaps = placed.some(p => {
          const dx = bestX - p.cx;
          const dy = bestY - p.cy;
          return Math.sqrt(dx * dx + dy * dy) < (r + p.r + padding);
        });
        if (!overlaps) break;
      } while (tries < 120);
      return { cx: bestX, cy: bestY };
    }

    // Place the first bubble
    const firstPos = findPosition(firstR);
    placed.push({ cx: firstPos.cx, cy: firstPos.cy, r: firstR });

    // Place all extra bubbles
    const extraPositions = [];
    for (const bm of bubbleMeta) {
      const r = bm.size / 2;
      const pos = findPosition(r);
      placed.push({ cx: pos.cx, cy: pos.cy, r });
      extraPositions.push(pos);
    }

    // Show thinking dots
    const thinking = document.createElement('div');
    thinking.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinking.appendChild(dot);
    }
    STATE.chatMessages.appendChild(thinking);

    await wait(1500);
    thinking.classList.add('chat-thinking--intense');
    await wait(600);

    // Remove thinking dots
    thinking.style.transition = 'opacity 0.2s ease';
    thinking.style.opacity = '0';
    await wait(200);
    thinking.remove();

    // Create AI response element
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

    const firstCX = parseFloat(cell.style.left) + firstR;
    const firstCY = parseFloat(cell.style.top) + firstR;

    // --- Schedule bubble spawns at random points during streaming ---
    let totalWords = 0;
    for (const part of WORDS_RESPONSE_PARTS) {
      const ws = part.text.split(/(\s+)/);
      for (const w of ws) { if (w && w.trim()) totalWords++; }
    }

    const spawnAtWord = [];
    const spawnRange = Math.floor(totalWords * 0.85);
    const usedIndices = new Set();
    for (let i = 0; i < TOTAL_EXTRA; i++) {
      let idx;
      do {
        idx = 2 + Math.floor(Math.random() * spawnRange);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      spawnAtWord.push(idx);
    }
    spawnAtWord.sort((a, b) => a - b);

    // Helper: create and launch a bubble
    let spawnIdx = 0;
    function spawnBubble() {
      if (spawnIdx >= TOTAL_EXTRA) return;
      const { data, size } = bubbleMeta[spawnIdx];
      const pos = extraPositions[spawnIdx];
      const r = size / 2;

      const bubble = document.createElement('div');
      bubble.style.position = 'fixed';
      bubble.style.borderRadius = '50%';
      bubble.style.zIndex = '100';
      bubble.style.willChange = 'transform, opacity';
      bubble.style.pointerEvents = 'none';
      bubble.style.display = 'flex';
      bubble.style.flexDirection = 'column';
      bubble.style.alignItems = 'center';
      bubble.style.justifyContent = 'center';
      bubble.style.overflow = 'hidden';
      bubble.style.background = 'rgba(16, 185, 129, 0.08)';
      bubble.style.border = '2px solid rgba(16, 185, 129, 0.40)';
      bubble.style.boxShadow =
        '0 0 20px rgba(16, 185, 129, 0.10), inset 0 0 20px rgba(16, 185, 129, 0.06)';

      bubble.style.width = '10px';
      bubble.style.height = '10px';
      bubble.style.left = `${firstCX - 5}px`;
      bubble.style.top = `${firstCY - 5}px`;
      bubble.style.opacity = '0';

      const txtEl = document.createElement('span');
      txtEl.className = 'word-bubble__text';
      txtEl.style.fontSize = `${Math.max(12, Math.min(20, size * 0.14))}px`;
      txtEl.textContent = data.word;
      bubble.appendChild(txtEl);

      const cntEl = document.createElement('span');
      cntEl.className = 'word-bubble__count';
      cntEl.style.fontSize = `${Math.max(9, size * 0.14 * 0.65)}px`;
      cntEl.textContent = data.displayCount;
      bubble.appendChild(cntEl);

      viewport.appendChild(bubble);
      bubble.offsetHeight;

      const travelTime = 0.8 + Math.random() * 0.6;

      bubble.style.transition =
        `width ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        `height ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        `left ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        `top ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        'opacity 0.35s ease';
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${pos.cx - r}px`;
      bubble.style.top = `${pos.cy - r}px`;
      bubble.style.opacity = '1';

      allBubbles.push({ el: bubble, txtEl, cntEl });
      spawnIdx++;
    }

    // --- Stream text word by word, spawning bubbles at scheduled words ---
    let wordCount = 0;
    let nextSpawn = 0;

    for (const part of WORDS_RESPONSE_PARTS) {
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
          wordCount++;
          if (nextSpawn < spawnAtWord.length && wordCount >= spawnAtWord[nextSpawn]) {
            spawnBubble();
            nextSpawn++;
          }
          await wait(jitter(55, 20));
        }
      }
    }

    // Spawn any remaining bubbles
    while (spawnIdx < TOTAL_EXTRA) {
      spawnBubble();
      await wait(200);
    }

    // Done streaming — hide cursor
    await wait(400);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    await wait(800);

    response.classList.add('chat-ai-response--wrapped');

    await wait(600);

    // --- Step 5: Reveal text + count on all extra bubbles ---
    for (let i = 1; i < allBubbles.length; i++) {
      const b = allBubbles[i];
      b.txtEl.classList.add('word-bubble__text--visible');
      await wait(80);
      b.cntEl.classList.add('word-bubble__count--visible');
      await wait(150);
    }

    await wait(1000);

    // --- Step 6: Gentle drift on all bubbles ---
    function applyDrift(el) {
      const dx1 = (Math.random() - 0.5) * 40;
      const dy1 = (Math.random() - 0.5) * 30;
      const dx2 = (Math.random() - 0.5) * 35;
      const dy2 = (Math.random() - 0.5) * 25;
      el.style.setProperty('--drift-duration', `${6 + Math.random() * 4}s`);
      el.style.setProperty('--drift-delay', `${Math.random() * 2}s`);
      el.style.setProperty('--drift-x1', `${dx1}px`);
      el.style.setProperty('--drift-y1', `${dy1}px`);
      el.style.setProperty('--drift-x2', `${dx2}px`);
      el.style.setProperty('--drift-y2', `${dy2}px`);
      el.style.setProperty('--drift-x3', `${dx1 * 0.5}px`);
      el.style.setProperty('--drift-y3', `${dy1 * -0.6}px`);
      el.style.transition = 'none';
      el.offsetHeight;
      el.classList.add('word-bubble--drifting');
    }

    for (const b of allBubbles) {
      applyDrift(b.el);
    }

    // Hold while the viewer absorbs everything
    await wait(5000);

    // --- Step 7: Unbubble + fade AI text, drop bubbles, restore footer ---
    response.classList.remove('chat-ai-response--wrapped');

    const responseText = response.querySelector('span');
    if (responseText) {
      responseText.style.transition = 'opacity 0.4s ease, max-height 0.6s ease';
      responseText.style.opacity = '0';
      setTimeout(() => {
        responseText.style.maxHeight = '0';
        responseText.style.overflow = 'hidden';
      }, 250);
    }

    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    await wait(600);

    // Drop each bubble off the bottom
    const dropOrder = [...allBubbles].sort(() => Math.random() - 0.5);

    for (const b of dropOrder) {
      const el = b.el;
      el.classList.remove('word-bubble--drifting');
      el.style.animation = 'none';
      el.offsetHeight;

      const fallDuration = 0.8 + Math.random() * 0.6;
      const overshoot = vh + 100 + Math.random() * 200;
      const drift = (Math.random() - 0.5) * 100;

      el.style.transition =
        `top ${fallDuration}s cubic-bezier(0.55, 0, 1, 0.45), ` +
        `left ${fallDuration}s ease, ` +
        `opacity ${fallDuration * 0.6}s ease ${fallDuration * 0.4}s`;
      el.style.top = `${overshoot}px`;
      el.style.left = `${parseFloat(el.style.left) + drift}px`;
      el.style.opacity = '0';

      await wait(120 + Math.random() * 180);
    }

    await wait(1600);

    // Clean up
    for (const b of allBubbles) {
      b.el.remove();
    }

    STATE.chatMessages.style.transition = 'opacity 0.5s ease';
    STATE.chatMessages.style.opacity = '0';
    await wait(500);
    STATE.chatMessages.remove();

    // Restore the footer
    const footer2 = document.querySelector('.editor__footer');
    if (footer2) {
      footer2.style.display = '';
      footer2.style.position = '';
      footer2.style.bottom = '';
      footer2.style.left = '';
      footer2.style.right = '';
      footer2.style.zIndex = '';
      footer2.style.pointerEvents = '';
      footer2.style.opacity = '0';
      footer2.offsetHeight;
      footer2.style.transition = 'opacity 0.4s ease';
      footer2.style.opacity = '1';
      await wait(400);
      footer2.style.transition = '';
      footer2.style.opacity = '';
    }

    await wait(500);

    return allBubbles;
  }

  return morphCellToWordBubble;
})();
