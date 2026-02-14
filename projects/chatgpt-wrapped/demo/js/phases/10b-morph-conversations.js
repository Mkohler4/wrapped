/* ============================================
   Phase 10b: Morph stat → conversations count
   The hero number counts down from 20,000 to 847,
   the label cross-fades, split stats fade out.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.morphToConversations = (() => {
  'use strict';

  const H = window.__editorHelpers;

  const { wait, animateCounter } = H;

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
    await wait(400);

    // --- Step 2: Count down hero number  20,000 → 847 ---
    await animateCounter(heroNum, 847, 1200, 20000);

    // --- Step 3: Cross-fade the label ---
    heroLabel.classList.remove('stat-hero__label--visible');
    heroLabel.style.opacity = '1';
    heroLabel.offsetHeight; // reflow

    heroLabel.style.transition = 'opacity 0.3s ease';
    heroLabel.style.opacity = '0';
    await wait(300);

    // Swap text and fade in
    heroLabel.textContent = 'conversations in 2025';
    heroLabel.style.transition = 'opacity 0.4s ease';
    heroLabel.style.opacity = '1';
    await wait(400);

    // --- Step 4: Subtle glow color shift (optional flourish) ---
    if (glow) {
      glow.style.transition = 'background 1s ease';
      glow.style.background = `radial-gradient(
        ellipse at center,
        rgba(96, 165, 250, 0.22) 0%,
        rgba(192, 132, 252, 0.14) 40%,
        transparent 70%
      )`;
    }

    // Hold on the conversations number
    await wait(2500);
  }

  return morphToConversations;
})();
