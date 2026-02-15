/* ============================================
   Phase 11+12: Transition from stat → sidebar
   Scroll-up effect (content slides down as if
   being left behind), cursor moves to sidebar
   button — all in one fluid motion.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.transitionToSidebar = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;
  const T = CFG.TIMINGS.PHASE_11;

  async function transitionToSidebar() {
    const { fakeCursor } = STATE.dom;

    const statDisplay = document.querySelector('.stat-display');
    const glow = document.querySelector('.stat-hero__glow');
    const backdrop = document.querySelector('.stat-backdrop');
    const sidebarBtn = document.querySelector('.editor__sidebar-btn');

    // --- Step 1: Begin the "scroll up" by sliding content downward ---

    // Kill the glow
    if (glow) {
      glow.classList.remove('stat-hero__glow--visible');
    }

    // Stat: remove the reveal animation so inline styles take effect,
    // pin the current visual state, then slide it down
    if (statDisplay) {
      statDisplay.classList.remove('stat-display--visible');
      statDisplay.style.opacity = '1';
      statDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
      statDisplay.offsetHeight; // reflow — lock the starting position

      statDisplay.style.transition =
        `transform ${T.STAT_SLIDE_TRANSFORM / 1000}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${T.STAT_SLIDE_OPACITY / 1000}s ease`;
      statDisplay.style.transform = 'translate(-50%, 80%) scale(0.92)';
      statDisplay.style.opacity = '0';
    }

    // Backdrop gradient overlay fades slowly
    if (backdrop) {
      backdrop.style.transition = `opacity ${T.BACKDROP_FADE / 1000}s ease`;
      backdrop.style.opacity = '0';
    }

    // Messages: stop the drift animation, pin position, slide down.
    if (STATE.chatMessages) {
      STATE.chatMessages.classList.remove('chat-messages--drifting');
      STATE.chatMessages.style.transform = 'translateX(-50%) translateY(0)';
      STATE.chatMessages.offsetHeight; // reflow

      // Slide down immediately (parallax "left behind" effect)
      STATE.chatMessages.style.transition =
        `transform ${T.MESSAGES_SLIDE / 1000}s cubic-bezier(0.4, 0, 0.2, 1)`;
      STATE.chatMessages.style.transform = 'translateX(-50%) translateY(70%)';

      // Delay the fade
      setTimeout(() => {
        if (STATE.chatMessages) {
          STATE.chatMessages.style.transition =
            `transform ${T.MESSAGES_SLIDE / 1000}s cubic-bezier(0.4, 0, 0.2, 1), opacity ${T.MESSAGES_FADE_DURATION / 1000}s ease`;
          STATE.chatMessages.style.opacity = '0';
        }
      }, T.MESSAGES_FADE_DELAY);
    }

    // --- Step 2: After scroll-up is clearly visible, bring in the cursor ---
    await wait(T.CURSOR_APPEAR_DELAY);

    // Cursor appears from center area
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${window.innerWidth * 0.45}px`;
    fakeCursor.style.top = `${window.innerHeight * 0.4}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(T.CURSOR_SETTLE); // brief moment so cursor registers visually

    // Animate cursor toward the sidebar button (top-left)
    const btnRect = sidebarBtn.getBoundingClientRect();
    const cursorDur = T.CURSOR_MOVE_DURATION / 1000;
    fakeCursor.style.transition =
      `left ${cursorDur}s cubic-bezier(0.4, 0, 0.15, 1), top ${cursorDur}s cubic-bezier(0.4, 0, 0.15, 1)`;
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top  = `${btnRect.top  + btnRect.height / 2 - 3}px`;

    await wait(T.CURSOR_MOVE_WAIT); // wait for cursor to arrive

    // --- Step 3: Click the sidebar button ---
    sidebarBtn.style.transition = 'transform 0.1s ease, background 0.1s ease';
    sidebarBtn.style.transform = 'scale(0.85)';
    sidebarBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    await wait(T.CLICK_HOLD);

    // Release
    sidebarBtn.style.transform = 'scale(1)';
    sidebarBtn.style.background = 'transparent';
    await wait(T.CLICK_RELEASE);

    // Hide cursor
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(T.CURSOR_FADE);

    // --- Step 4: Deferred cleanup ---
    if (statDisplay) statDisplay.remove();
    if (backdrop) backdrop.remove();
    // chatMessages stays in the DOM and is cleaned up after sidebar opens
  }

  return transitionToSidebar;
})();
