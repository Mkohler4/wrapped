/* ============================================
   Phase 10b: Morph stat → conversations count
   The hero number counts down from 20,000 to 847,
   the label cross-fades, split stats fade out.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.morphToConversations = (() => {
  'use strict';

  const CFG = window.__editorConfig;
  const H   = window.__editorHelpers;

  const { wait, animateCounter } = H;
  const T = CFG.TIMINGS.PHASE_10B;

  async function morphToConversations() {
    const heroNum   = document.querySelector('.stat-hero__number');
    const heroLabel = document.querySelector('.stat-hero__label');
    const split     = document.querySelector('.stat-split');
    const glow      = document.querySelector('.stat-hero__glow');

    if (!heroNum || !heroLabel) return;

    // --- Step 1: Fade out the You / ChatGPT split ---
    if (split) {
      split.classList.remove('stat-split--visible');
      split.style.opacity = '1';
      split.style.transform = 'translateY(0)';
      split.offsetHeight; // reflow

      split.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      split.style.opacity = '0';
      split.style.transform = 'translateY(8px)';
    }
    await wait(T.SPLIT_FADE_WAIT);

    // --- Step 2: Count down hero number  totalMessages → conversations ---
    await animateCounter(heroNum, CFG.CONVERSATIONS, T.COUNTDOWN_DURATION, CFG.TOTAL_MESSAGES);

    // --- Step 3: Cross-fade the label ---
    heroLabel.classList.remove('stat-hero__label--visible');
    heroLabel.style.opacity = '1';
    heroLabel.offsetHeight; // reflow

    heroLabel.style.transition = `opacity ${T.LABEL_FADE_OUT / 1000}s ease`;
    heroLabel.style.opacity = '0';
    await wait(T.LABEL_FADE_OUT);

    // Swap text and fade in
    heroLabel.textContent = 'conversations in 2025';
    heroLabel.style.transition = `opacity ${T.LABEL_FADE_IN / 1000}s ease`;
    heroLabel.style.opacity = '1';
    await wait(T.LABEL_FADE_IN);

    // --- Step 4: Subtle glow color shift (optional flourish) ---
    if (glow) {
      glow.style.transition = `background ${T.GLOW_TRANSITION / 1000}s ease`;
      glow.style.background = `radial-gradient(
        ellipse at center,
        rgba(96, 165, 250, 0.22) 0%,
        rgba(192, 132, 252, 0.14) 40%,
        transparent 70%
      )`;
    }

    // Hold on the conversations number
    await wait(T.FINAL_HOLD);
  }

  return morphToConversations;
})();
