/* ============================================
   Phase 23: Longest Streak — The Ribbon
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.revealLongestStreak = (() => {
  'use strict';

  const H = window.__editorHelpers;
  const { wait, animateCounter } = H;

  /**
   * Find the longest consecutive streak of active days in the
   * 52×7 grid, illuminate it cell-by-cell like a fuse burning
   * across the calendar, then show the streak stat.
   *
   * @param {object} heatmapRefs – from buildHeatmap
   * @param {object} prevStat    – { stat } from revealActiveDays
   */
  async function revealLongestStreak({ heatmap, grid, allCells, activityData, COLS, ROWS }, prevStat) {

    // --- Find the longest streak ---
    let bestStart = 0, bestLen = 0;
    let curStart = 0, curLen = 0;

    for (let i = 0; i < COLS * ROWS; i++) {
      const col = Math.floor(i / ROWS);
      const row = i % ROWS;
      if (activityData[col][row] > 0) {
        if (curLen === 0) curStart = i;
        curLen++;
        if (curLen > bestLen) {
          bestLen = curLen;
          bestStart = curStart;
        }
      } else {
        curLen = 0;
      }
    }

    // Convert flat indices to col/row pairs for the streak
    const streakCells = [];
    for (let i = bestStart; i < bestStart + bestLen; i++) {
      const col = Math.floor(i / ROWS);
      const row = i % ROWS;
      streakCells.push({ col, row });
    }

    // Compute date range (grid starts ~Jan 1, 2025)
    const startDay = streakCells[0];
    const endDay = streakCells[streakCells.length - 1];
    const jan1 = new Date(2025, 0, 1);
    const jan1Dow = jan1.getDay();
    const startDate = new Date(2025, 0, 1 + (startDay.col * 7 + startDay.row) - jan1Dow);
    const endDate = new Date(2025, 0, 1 + (endDay.col * 7 + endDay.row) - jan1Dow);
    const fmtOpts = { month: 'short', day: 'numeric' };
    const dateStr = `${startDate.toLocaleDateString('en-US', fmtOpts)} – ${endDate.toLocaleDateString('en-US', fmtOpts)}`;

    // Build a Set for fast streak membership lookup
    const streakSet = new Set(streakCells.map(sc => `${sc.col},${sc.row}`));

    // --- 1. Unhighlight: fade out every cell NOT in the streak ---
    const nonStreakCells = allCells.filter(c => !streakSet.has(`${c.col},${c.row}`));

    // Fisher-Yates shuffle
    for (let i = nonStreakCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonStreakCells[i], nonStreakCells[j]] = [nonStreakCells[j], nonStreakCells[i]];
    }

    const fadeSpread = 1500;
    const perCellDelay = fadeSpread / nonStreakCells.length;

    nonStreakCells.forEach((c, i) => {
      setTimeout(() => {
        c.el.classList.add('heatmap__cell--faded');
      }, i * perCellDelay);
    });

    await wait(fadeSpread + 500);

    // --- 2. Slide previous stat left, show streak stat on the right ---
    if (prevStat && prevStat.stat) {
      prevStat.stat.classList.add('heatmap-stat--left');
    }
    await wait(300);

    const stat = document.createElement('div');
    stat.className = 'heatmap-stat heatmap-stat--above heatmap-stat--right';

    const numEl = document.createElement('div');
    numEl.className = 'heatmap-stat__number';
    numEl.textContent = '0';

    const labelEl = document.createElement('div');
    labelEl.className = 'heatmap-stat__label';
    labelEl.textContent = 'day streak';

    const dateEl = document.createElement('div');
    dateEl.className = 'heatmap-stat__date';
    dateEl.textContent = dateStr;

    stat.appendChild(numEl);
    stat.appendChild(labelEl);
    stat.appendChild(dateEl);
    heatmap.appendChild(stat);
    stat.offsetHeight;

    stat.classList.add('heatmap-stat--visible');
    await wait(150);

    // Count up
    await animateCounter(numEl, bestLen, 800);

    // Spring pop
    numEl.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    numEl.style.transform = 'scale(1.08)';
    await wait(200);
    numEl.style.transform = 'scale(1.0)';
    await wait(300);

    // Label
    labelEl.classList.add('heatmap-stat__label--visible');
    await wait(400);

    // Date range
    dateEl.classList.add('heatmap-stat__date--visible');

    // Hold
    await wait(2500);

    return { stat, bestLen, streakCells, streakSet, dateStr };
  }

  return revealLongestStreak;
})();
