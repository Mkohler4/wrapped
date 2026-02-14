/* ============================================
   Phase 24: Busiest Day — The Spotlight
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.revealBusiestDay = (() => {
  'use strict';

  const H = window.__editorHelpers;
  const { wait, animateCounter } = H;

  /**
   * After the streak, fade the remaining visible cells randomly,
   * then spotlight the single busiest day.
   *
   * @param {object} heatmapRefs – from buildHeatmap
   * @param {object} prevStats   – { activeDays, streak }
   */
  async function revealBusiestDay(
    { heatmap, grid, allCells, activityData, COLS, ROWS },
    prevStats
  ) {
    const { activeDays: activeDaysResult, streak: streakResult } = prevStats;
    const { streakCells, streakSet } = streakResult;

    // --- Find the busiest day ---
    function levelToMessages(level) {
      if (level === 0) return 0;
      const ranges = { 1: [5, 15], 2: [15, 35], 3: [35, 70], 4: [70, 130] };
      const [lo, hi] = ranges[level];
      return Math.floor(lo + Math.random() * (hi - lo));
    }

    let busiestCol = 0, busiestRow = 0, maxMessages = 0;
    for (let col = 0; col < COLS; col++) {
      for (let row = 0; row < ROWS; row++) {
        const count = levelToMessages(activityData[col][row]);
        if (count > maxMessages) {
          maxMessages = count;
          busiestCol = col;
          busiestRow = row;
        }
      }
    }

    // Compute the calendar date
    const jan1 = new Date(2025, 0, 1);
    const jan1Dow = jan1.getDay();
    const busiestDate = new Date(
      2025, 0, 1 + (busiestCol * 7 + busiestRow) - jan1Dow
    );
    const dateStr = busiestDate.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });

    const busiestInStreak = streakSet.has(`${busiestCol},${busiestRow}`);

    // --- 1. Fade remaining streak cells randomly ---
    const stillVisible = allCells.filter(
      c => streakSet.has(`${c.col},${c.row}`)
    );

    // Fisher-Yates shuffle
    for (let i = stillVisible.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stillVisible[i], stillVisible[j]] = [stillVisible[j], stillVisible[i]];
    }

    const fadeSpread = 1200;
    const perCellDelay = fadeSpread / stillVisible.length;

    stillVisible.forEach((c, i) => {
      setTimeout(() => {
        c.el.classList.add('heatmap__cell--faded');
      }, i * perCellDelay);
    });

    await wait(fadeSpread + 400);

    // --- 2. Highlight the busiest day cell ---
    const bCell = allCells.find(
      c => c.col === busiestCol && c.row === busiestRow
    );
    if (bCell) {
      bCell.el.classList.remove('heatmap__cell--faded', 'heatmap__cell--dimmed');
      bCell.el.classList.add('heatmap__cell--busiest');
    }

    await wait(400);
    if (bCell) {
      bCell.el.classList.add('heatmap__cell--busiest-glow');
    }

    await wait(800);

    // --- 3. Rebalance to 3-stat layout ---
    if (activeDaysResult && activeDaysResult.stat) {
      activeDaysResult.stat.style.transform =
        'translateX(calc(-50% - 200px))';
    }
    if (streakResult && streakResult.stat) {
      streakResult.stat.style.transform = 'translateX(-50%)';
    }

    await wait(400);

    // --- 4. Build + reveal the busiest-day stat ---
    const stat = document.createElement('div');
    stat.className = 'heatmap-stat heatmap-stat--above';
    stat.style.transform = 'translateX(calc(-50% + 200px))';

    const numEl = document.createElement('div');
    numEl.className = 'heatmap-stat__number';
    numEl.textContent = '0';

    const labelEl = document.createElement('div');
    labelEl.className = 'heatmap-stat__label';
    labelEl.textContent = 'messages sent';

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
    await animateCounter(numEl, maxMessages, 800);

    // Spring pop
    numEl.style.transition =
      'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    numEl.style.transform = 'scale(1.08)';
    await wait(200);
    numEl.style.transform = 'scale(1.0)';
    await wait(300);

    // Label
    labelEl.classList.add('heatmap-stat__label--visible');
    await wait(400);

    // Date
    dateEl.classList.add('heatmap-stat__date--visible');

    // Hold
    await wait(2500);

    return { stat, maxMessages, busiestCol, busiestRow, dateStr };
  }

  return revealBusiestDay;
})();
