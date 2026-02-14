/* ============================================
   Phase 15: Collapse bar chart
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.collapseBarChart = (() => {
  'use strict';

  const { wait } = window.__editorHelpers;

  async function collapseBarChart(chartData) {
    const { topicBars, barLabelEls } = chartData;

    // Fade out all labels (rank, name, count, subline)
    for (const el of barLabelEls) {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '0';
    }
    await wait(300);

    // Shrink all bars to nothing
    for (const { bar } of topicBars) {
      bar.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.15, 1), height 0.5s ease, opacity 0.5s ease';
      bar.style.width = '0px';
      bar.style.height = '0px';
      bar.style.opacity = '0';
    }
    await wait(500);

    // Clean up DOM
    for (const el of barLabelEls) el.remove();
    for (const { bar } of topicBars) bar.remove();

    await wait(200);
  }

  return collapseBarChart;
})();
