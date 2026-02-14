/* ============================================
   Phase 22: Active Days — Wave Reveal
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.revealActiveDays = (() => {
  'use strict';

  const H = window.__editorHelpers;
  const { wait, animateCounter } = H;

  /**
   * Luminance wave sweeps left-to-right across the heatmap.
   * Each active cell briefly brightens as it's "read."
   * A counter above the grid ticks in sync with the wave,
   * landing on the total with a spring overshoot.
   *
   * @param {object} heatmapRefs – returned by buildHeatmap
   */
  async function revealActiveDays({ heatmap, grid, allCells, activityData, COLS, ROWS }) {

    // --- Count active days from the data ---
    let totalActive = 0;
    const cumulativeByCol = [];
    let running = 0;
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        if (activityData[col][row] > 0) running++;
      }
      cumulativeByCol.push(running);
    }
    totalActive = running;
    const totalDays = 365;
    const pct = Math.round((totalActive / totalDays) * 100);

    // --- Build stat DOM ---
    const stat = document.createElement('div');
    stat.className = 'heatmap-stat heatmap-stat--above';

    const numEl = document.createElement('div');
    numEl.className = 'heatmap-stat__number';
    numEl.textContent = '0';

    const labelEl = document.createElement('div');
    labelEl.className = 'heatmap-stat__label';
    labelEl.textContent = 'days active';

    const subEl = document.createElement('div');
    subEl.className = 'heatmap-stat__sub';
    subEl.textContent = `${pct}% of your year`;

    stat.appendChild(numEl);
    stat.appendChild(labelEl);
    stat.appendChild(subEl);

    heatmap.appendChild(stat);
    stat.offsetHeight;

    // --- 1. Hold — let the audience breathe ---
    await wait(1000);

    // Make stat visible (number starts at 0)
    stat.classList.add('heatmap-stat--visible');
    await wait(200);

    // --- 2. Count up to total active days ---
    const countDuration = 1800;
    await animateCounter(numEl, totalActive, countDuration);

    // --- 3. Spring pop on the final number ---
    numEl.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    numEl.style.transform = 'scale(1.08)';
    await wait(200);
    numEl.style.transform = 'scale(1.0)';
    await wait(400);

    // --- 4. Reveal "days active" label ---
    labelEl.classList.add('heatmap-stat__label--visible');
    await wait(600);

    // --- 5. Reveal percentage sub-label ---
    subEl.classList.add('heatmap-stat__sub--visible');

    // --- 6. Dim inactive cells for contrast ---
    allCells.forEach(c => {
      if (activityData[c.col][c.row] === 0) {
        c.el.classList.add('heatmap__cell--dimmed');
      }
    });

    // Hold so the audience absorbs the stat
    await wait(2500);

    return { stat, totalActive, pct };
  }

  return revealActiveDays;
})();
