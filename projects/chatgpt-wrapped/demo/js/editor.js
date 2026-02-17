/* ============================================
   Editor — Master Orchestrator
   ============================================
   All animation phases live in js/phases/*.js
   Shared infrastructure:
     CFG   = window.__editorConfig
     H     = window.__editorHelpers
     STATE = window.__editorState
   ============================================ */

(() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;
  const P     = window.__editorPhases;

  const { wait } = H;
  const { GROWTH_DATA, GROWTH_PHASE_2, TIMINGS } = CFG;

  // ============================================
  // Master sequence
  // ============================================
  async function run() {
    // Load data from wrapped-profile.json (patches config arrays in-place)
    await CFG.init();

    // Initialize shared DOM references
    STATE.init();

    await wait(TIMINGS.INITIAL_IDLE);                  // Idle
    await P.typePrompt();                              // Phase 1: Type prompt
    await wait(TIMINGS.GAP_AFTER_TYPE_PROMPT);
    await P.moveCursorToSend();                        // Phase 2: Cursor → send
    await P.clickSend();                               // Phase 3: Click send
    await P.sendMessage();                             // Phase 4: Zoom out + bubble
    const dots = await P.showThinkingDots();           // Phase 5: Thinking dots
    const resp = await P.streamAIResponse(dots);       // Phase 6: AI streams response
    await P.highlightResponse(resp);                   // Phase 7: Wrap → grow → zoom
    await P.dotDrawsGraph(resp);                       // Phase 7n: Dot draws graph
    const cascadeCtrl = await P.cascadeMessages();      // Phase 8: Ghost bubbles cascade
    await P.compressAndBlur();                         // Phase 9: Blur + compress
    await P.showHeroStat(cascadeCtrl);                 // Phase 10: Hero stat: 20,000
    await P.morphToConversations();                    // Phase 10b: 20,000 → 847
    await P.transitionToSidebar();                     // Phase 11: Scroll up → sidebar
    const sidebarItems = await P.openSidebar();        // Phase 13: Sidebar slides in
    const chartData = await P.groupConversations(sidebarItems); // Phase 14: Topics

    await P.collapseBarChart(chartData);               // Phase 15: Bars collapse
    await P.cursorToInput();                           // Phase 16a: Cursor → input
    await P.typeNewPrompt(GROWTH_DATA.prompt);         // Phase 16b: Type prompt
    await wait(200);
    await P.moveCursorToSend();                        // Cursor → send
    await P.clickSend();                               // Click send
    await P.sendNewMessage();                          // Zoom out + bubble
    const growthRefs = await P.showGrowthInsight(GROWTH_DATA); // Phase 17: Growth

    await wait(2000);
    await P.transitionToNextChart(growthRefs, GROWTH_PHASE_2); // Phase 19: Morph
    await wait(3000);

    const heatmapOverlay = await P.deconstructBarChart(growthRefs); // Phase 20: Cube

    await wait(800);
    const heatmapRefs = await P.buildHeatmap(heatmapOverlay, growthRefs.graphContainer); // Phase 21

    const activeDaysResult = await P.revealActiveDays(heatmapRefs);           // Phase 22
    const streakResult = await P.revealLongestStreak(heatmapRefs, activeDaysResult); // Phase 23
    const busiestResult = await P.revealBusiestDay(heatmapRefs, {             // Phase 24
      activeDays: activeDaysResult,
      streak: streakResult,
    });

    const flyingCell = await P.launchBusiestCell(heatmapRefs, busiestResult); // Phase 25
    await P.morphCellToWordBubble(flyingCell);                                // Phase 26

    await P.moveCursorToImageBtn();                    // Phase 27: Cursor → image btn
    await P.dragImageToCenter();                       // Phase 28: Drag + unfold

    await P.showAwardRoom();                           // Phase 29: Award room
  }

  // Skip auto-run when loaded from a test harness
  if (!window.__editorTestMode) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  // Public API for test harnesses
  window.__editor = {
    run,
    ...P,
    wait: H.wait,
    formatNumber: H.formatNumber,
    animateCounter: H.animateCounter,
  };
})();
