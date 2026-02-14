/* ============================================
   Phase 21: Heatmap
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

(() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait } = H;

  /**
   * Generate a 52×7 array of activity levels (0–4) that mimics
   * realistic ChatGPT usage across a full year.
   */
  function generateActivityData() {
    const COLS = 52;
    const ROWS = 7;

    const monthlyCurve = [
      0.35, 0.45, 0.60, 0.75, 0.85, 0.70,
      0.55, 0.50, 0.65, 0.80, 0.90, 0.60,
    ];

    const data = [];

    for (let col = 0; col < COLS; col++) {
      const week = [];
      const month = Math.min(11, Math.floor((col / COLS) * 12));
      const monthIntensity = monthlyCurve[month];

      let weekBoost = 0;
      if (Math.random() < 0.12) weekBoost = 0.25;
      else if (Math.random() < 0.10) weekBoost = -0.20;

      for (let row = 0; row < ROWS; row++) {
        const isWeekend = (row === 0 || row === 6);
        const dayBase = isWeekend ? 0.25 : 0.65;

        const raw = dayBase * (monthIntensity + weekBoost) + (Math.random() * 0.35 - 0.10);
        const clamped = Math.max(0, Math.min(1, raw));

        let level;
        if (clamped < 0.12)      level = 0;
        else if (clamped < 0.30) level = 1;
        else if (clamped < 0.50) level = 2;
        else if (clamped < 0.72) level = 3;
        else                     level = 4;

        week.push(level);
      }
      data.push(week);
    }

    return data;
  }

  /**
   * Build and animate an iOS-style heatmap from the centered seed cube.
   */
  async function buildHeatmap(overlay, graphContainer) {
    const { editor } = STATE.dom;
    const viewport = document.getElementById('viewport');

    const COLS = 52;
    const ROWS = 7;
    const CELL_SIZE = 14;
    const GAP = 3;
    const centerCol = Math.floor(COLS / 2);
    const centerRow = Math.floor(ROWS / 2);

    const activityData = generateActivityData();

    // Force the seed cell at center to be high-activity green
    activityData[centerCol][centerRow] = 4;

    // ---------------------------------------------------------
    // 21a-1  Round the existing overlay cube
    // ---------------------------------------------------------

    overlay.style.transition = 'border-radius 0.4s ease';
    overlay.style.borderRadius = '6px';

    await wait(500);

    // ---------------------------------------------------------
    // 21a-2  Create "phantom" clone on viewport
    // ---------------------------------------------------------

    const overlayRect = overlay.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();

    const phantom = document.createElement('div');
    phantom.style.position = 'absolute';
    phantom.style.left = `${overlayRect.left - vpRect.left}px`;
    phantom.style.top = `${overlayRect.top - vpRect.top}px`;
    phantom.style.width = `${overlayRect.width}px`;
    phantom.style.height = `${overlayRect.height}px`;
    phantom.style.background = 'rgba(16, 185, 129, 0.85)';
    phantom.style.borderRadius = `${6 * (overlayRect.width / 36)}px`;
    phantom.style.zIndex = '30';
    phantom.style.pointerEvents = 'none';
    viewport.appendChild(phantom);

    overlay.style.transition = 'none';
    overlay.style.opacity = '0';

    // ---------------------------------------------------------
    // 21a-3  Build the full heatmap DOM (hidden) at scale(2.2)
    // ---------------------------------------------------------

    const heatmap = document.createElement('div');
    heatmap.className = 'heatmap';
    heatmap.style.opacity = '0';
    heatmap.style.transform = 'translate(-50%, -50%) scale(2.2)';

    const gridArea = document.createElement('div');
    gridArea.className = 'heatmap__grid-area';

    const dayLabelsEl = document.createElement('div');
    dayLabelsEl.className = 'heatmap__day-labels';
    const DAY_NAMES = ['', 'M', '', 'W', '', 'F', ''];
    DAY_NAMES.forEach(name => {
      const lbl = document.createElement('div');
      lbl.className = 'heatmap__day-label';
      lbl.textContent = name;
      dayLabelsEl.appendChild(lbl);
    });
    gridArea.appendChild(dayLabelsEl);

    const grid = document.createElement('div');
    grid.className = 'heatmap__grid';

    const allCells = [];
    let seedCell = null;

    for (let col = 0; col < COLS; col++) {
      const colEl = document.createElement('div');
      colEl.className = 'heatmap__col';

      for (let row = 0; row < ROWS; row++) {
        const cell = document.createElement('div');
        const level = activityData[col][row];
        cell.className = `heatmap__cell heatmap__cell--level-${level}`;

        const isSeed = (col === centerCol && row === centerRow);

        const dx = col - centerCol;
        const dy = row - centerRow;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const baseDelay = dist * 25;
        const jit = (Math.random() * 300) - 150;
        const delay = Math.max(0, Math.min(3500, baseDelay + jit));

        const fallDuration = 400 + Math.random() * 200;

        if (isSeed) {
          cell.style.opacity = '0';
          cell.style.transform = 'translateY(0)';
          seedCell = cell;
        } else {
          const offset = -(300 + Math.random() * 500);
          cell.style.transform = `translateY(${offset}px)`;
        }

        colEl.appendChild(cell);
        allCells.push({ el: cell, col, row, dist, delay, fallDuration, isSeed });
      }
      grid.appendChild(colEl);
    }

    gridArea.appendChild(grid);
    heatmap.appendChild(gridArea);

    // Month labels
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthRow = document.createElement('div');
    monthRow.className = 'heatmap__month-labels';

    const colPx = CELL_SIZE + GAP;
    const weeksPerMonth = COLS / 12;

    MONTHS.forEach(name => {
      const lbl = document.createElement('div');
      lbl.className = 'heatmap__month-label';
      lbl.textContent = name;
      lbl.style.width = `${Math.round(weeksPerMonth * colPx)}px`;
      monthRow.appendChild(lbl);
    });
    heatmap.appendChild(monthRow);

    viewport.appendChild(heatmap);
    heatmap.offsetHeight;

    // ---------------------------------------------------------
    // 21a-4  Shrink phantom to cell size, fade out editor
    // ---------------------------------------------------------

    const seedRect = seedCell.getBoundingClientRect();
    const targetLeft = seedRect.left - vpRect.left;
    const targetTop = seedRect.top - vpRect.top;
    const targetW = seedRect.width;
    const targetH = seedRect.height;

    phantom.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'top 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'width 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'height 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'border-radius 0.5s ease';
    phantom.style.left = `${targetLeft}px`;
    phantom.style.top = `${targetTop}px`;
    phantom.style.width = `${targetW}px`;
    phantom.style.height = `${targetH}px`;
    phantom.style.borderRadius = `${3 * 2.2}px`;

    editor.style.transition = 'opacity 0.5s ease';
    editor.style.opacity = '0';

    heatmap.style.transition = 'opacity 0.5s ease';
    heatmap.style.opacity = '1';

    await wait(700);

    // ---------------------------------------------------------
    // 21a-5  Swap phantom for the real grid cell
    // ---------------------------------------------------------

    seedCell.style.opacity = '1';
    phantom.remove();

    // ---------------------------------------------------------
    // 21b  Start rain — still zoomed in at 2.2×
    // ---------------------------------------------------------

    allCells.forEach(c => {
      if (!c.isSeed) {
        c.el.style.transition =
          `transform ${c.fallDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${c.delay}ms`;
      }
    });

    grid.offsetHeight;

    allCells.forEach(c => {
      if (!c.isSeed) {
        c.el.style.transform = 'translateY(0)';
      }
    });

    // ---------------------------------------------------------
    // 21c  Zoom out mid-rain
    // ---------------------------------------------------------

    await wait(1200);

    heatmap.style.transition = 'transform 1.2s cubic-bezier(0.4, 0, 0.15, 1)';
    heatmap.style.transform = 'translate(-50%, -50%) scale(1.0)';

    // ---------------------------------------------------------
    // 21d  Wait for rain to complete
    // ---------------------------------------------------------

    const maxDelay = Math.max(...allCells.filter(c => !c.isSeed).map(c => c.delay));
    const maxFall = 600;
    const totalRainMs = maxDelay + maxFall;
    const remaining = Math.max(0, totalRainMs - 1200);
    await wait(remaining + 100);

    // ---------------------------------------------------------
    // 21e  Polish: fade in labels
    // ---------------------------------------------------------

    const dayLabelEls = dayLabelsEl.querySelectorAll('.heatmap__day-label');
    dayLabelEls.forEach((lbl, i) => {
      setTimeout(() => { lbl.style.opacity = '1'; }, i * 60);
    });

    const monthLabelEls = monthRow.querySelectorAll('.heatmap__month-label');
    monthLabelEls.forEach((lbl, i) => {
      setTimeout(() => { lbl.style.opacity = '1'; }, i * 50);
    });

    await wait(800);

    allCells.forEach(c => {
      c.el.style.willChange = 'auto';
      c.el.style.transition = 'none';
      c.el.style.opacity = '';
    });

    return { heatmap, grid, allCells, activityData, COLS, ROWS };
  }

  window.__editorPhases.generateActivityData = generateActivityData;
  window.__editorPhases.buildHeatmap = buildHeatmap;
})();
