/* ============================================
   Phase 11 V2: Transition from stat → sidebar
   ============================================
   Differences from the original Phase 11:

   1. Kills the cascade-v2 rAF loop (the "infinite staircase")
      via the global controller instead of removing CSS classes.
   2. Fades / slides the .cascade-mask element, not the strip
      in backdrop mode.  The strip stays frozen inside the
      mask — one component, zero layout switches, no jump.
   3. Everything else (stat slide-down, cursor animation,
      sidebar click) is identical to the original.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.transitionToSidebar = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;

  async function transitionToSidebar() {
    const { fakeCursor } = STATE.dom;

    const statDisplay = document.querySelector('.stat-display');
    const glow        = document.querySelector('.stat-hero__glow');
    const backdrop    = document.querySelector('.stat-backdrop');
    const sidebarBtn  = document.querySelector('.editor__sidebar-btn');
    const mask        = document.querySelector('.cascade-mask');

    // --- Step 0: Kill the cascade rAF ---
    // The strip freezes at its current translateY; the mask
    // will handle the exit animation from here.
    if (window.__cascadeV2Ctrl) {
      window.__cascadeV2Ctrl.kill();
    }

    // --- Step 1: Begin the "scroll up" by sliding content downward ---

    // Kill the glow
    if (glow) {
      glow.classList.remove('stat-hero__glow--visible');
    }

    // Stat: remove the reveal animation so inline styles take effect,
    // pin the current visual state, then slide it down
    if (statDisplay) {
      statDisplay.classList.remove('stat-display--visible');
      statDisplay.style.opacity   = '1';
      statDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
      statDisplay.offsetHeight; // reflow — lock the starting position

      statDisplay.style.transition =
        'transform 2.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 2.5s ease';
      statDisplay.style.transform = 'translate(-50%, 80%) scale(0.92)';
      statDisplay.style.opacity   = '0';
    }

    // Backdrop gradient overlay fades slowly
    if (backdrop) {
      backdrop.style.transition = 'opacity 2s ease';
      backdrop.style.opacity    = '0';
    }

    // Messages: slide the MASK down and fade it out.
    // The strip inside keeps its frozen translateY — one component,
    // no layout switch, no jump.
    if (mask) {
      mask.style.transition = 'none';
      mask.style.transform  = 'translateY(0)';
      mask.offsetHeight; // reflow — pin starting position

      mask.style.transition =
        'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 2s ease 1.6s';
      mask.style.transform = 'translateY(70%)';
      mask.style.opacity   = '0';
    }

    // --- Step 2: After scroll-up is clearly visible, bring in the cursor ---
    await wait(900);

    // Cursor appears from center area
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${window.innerWidth * 0.45}px`;
    fakeCursor.style.top  = `${window.innerHeight * 0.4}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(120); // brief moment so cursor registers visually

    // Animate cursor toward the sidebar button (top-left)
    const btnRect = sidebarBtn.getBoundingClientRect();
    fakeCursor.style.transition =
      'left 1.1s cubic-bezier(0.4, 0, 0.15, 1), top 1.1s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top  = `${btnRect.top  + btnRect.height / 2 - 3}px`;

    await wait(1200); // wait for cursor to arrive

    // --- Step 3: Click the sidebar button ---
    sidebarBtn.style.transition = 'transform 0.1s ease, background 0.1s ease';
    sidebarBtn.style.transform  = 'scale(0.85)';
    sidebarBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    await wait(120);

    // Release
    sidebarBtn.style.transform  = 'scale(1)';
    sidebarBtn.style.background = 'transparent';
    await wait(150);

    // Hide cursor
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(200);

    // --- Step 4: Deferred cleanup ---
    if (statDisplay) statDisplay.remove();
    if (backdrop) backdrop.remove();
    // mask + strip stay in the DOM; cleaned up after sidebar opens
  }

  return transitionToSidebar;
})();
