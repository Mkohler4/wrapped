/* ============================================
   Phase 10: Hero stat — 20,000 messages
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.showHeroStat = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, animateCounter } = H;
  const T = CFG.TIMINGS.PHASE_10;

  async function showHeroStat(cascadeCtrl) {
    const { editorMain } = STATE.dom;

    // chatMessages stays as the colorful backdrop (absolutely positioned)
    // stat display will also be absolutely centered on top

    // Build the stat display (sits on top via z-index)
    const statDisplay = document.createElement('div');
    statDisplay.className = 'stat-display';

    // Ambient glow behind the number
    const glow = document.createElement('div');
    glow.className = 'stat-hero__glow';

    // Hero number
    const heroNum = document.createElement('div');
    heroNum.className = 'stat-hero__number';
    heroNum.textContent = '0';

    // Label
    const heroLabel = document.createElement('div');
    heroLabel.className = 'stat-hero__label';
    heroLabel.textContent = 'messages in 2025';

    // Split
    const split = document.createElement('div');
    split.className = 'stat-split';

    // You
    const youItem = document.createElement('div');
    youItem.className = 'stat-split__item';
    const youNum = document.createElement('div');
    youNum.className = 'stat-split__number stat-split__number--user';
    youNum.textContent = '0';
    const youLabel = document.createElement('div');
    youLabel.className = 'stat-split__label';
    youLabel.textContent = 'You';
    youItem.appendChild(youNum);
    youItem.appendChild(youLabel);

    // Dot
    const dot = document.createElement('div');
    dot.className = 'stat-split__dot';

    // ChatGPT
    const aiItem = document.createElement('div');
    aiItem.className = 'stat-split__item';
    const aiNum = document.createElement('div');
    aiNum.className = 'stat-split__number stat-split__number--ai';
    aiNum.textContent = '0';
    const aiLabel = document.createElement('div');
    aiLabel.className = 'stat-split__label';
    aiLabel.textContent = 'ChatGPT';
    aiItem.appendChild(aiNum);
    aiItem.appendChild(aiLabel);

    split.appendChild(youItem);
    split.appendChild(dot);
    split.appendChild(aiItem);

    statDisplay.appendChild(glow);
    statDisplay.appendChild(heroNum);
    statDisplay.appendChild(heroLabel);
    statDisplay.appendChild(split);
    editorMain.appendChild(statDisplay);

    // Reveal the stat display + glow
    await wait(T.REVEAL_SETTLE);
    statDisplay.classList.add('stat-display--visible');
    glow.classList.add('stat-hero__glow--visible');

    // Let the reveal animation get underway
    await wait(T.ANIMATION_SETTLE);

    // Count up hero number  (cascade drift still running behind the blur)
    await animateCounter(heroNum, 20000, T.HERO_COUNTER_DURATION);

    // Show the label
    await wait(T.LABEL_DELAY);
    heroLabel.classList.add('stat-hero__label--visible');
    await wait(T.LABEL_VISIBLE_HOLD);

    // Show the split and count both
    split.classList.add('stat-split--visible');
    await wait(T.SPLIT_DELAY);
    await Promise.all([
      animateCounter(youNum, 8000, T.SPLIT_COUNTER_DURATION),
      animateCounter(aiNum, 12000, T.SPLIT_COUNTER_DURATION),
    ]);

    // Hold for a moment before transitioning
    await wait(T.FINAL_HOLD);

    // Stop the cascade drift, clear the JS-driven transform, and
    // switch chatMessages to absolute backdrop mode with CSS drift.
    if (cascadeCtrl && cascadeCtrl.stop) cascadeCtrl.stop();
    STATE.chatMessages.style.transform = '';
    STATE.chatMessages.classList.add('chat-messages--backdrop');
    STATE.chatMessages.classList.add('chat-messages--drifting');
  }

  return showHeroStat;
})();
