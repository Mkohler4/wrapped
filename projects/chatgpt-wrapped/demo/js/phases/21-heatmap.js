/* ============================================
   Phase 21: Heatmap
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

(() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, isMobileViewport } = H;

  /**
   * Convert the raw daily-message-count grid from the data file
   * into a 52×7 array of activity levels (0–4), GitHub-style:
   * the levels are relative to the user's personal max day.
   *
   * Returns { levels, messages } where:
   *   levels[col][row]   = 0–4 activity level
   *   messages[col][row] = original message count
   */
  function computeActivityData() {
    const messages = CFG.HEATMAP_CONFIG.dailyMessages;

    // Find the personal max
    let maxCount = 0;
    messages.forEach(week =>
      week.forEach(count => { if (count > maxCount) maxCount = count; })
    );

    // GitHub-style quartile thresholds relative to max
    const t1 = maxCount * 0.25;
    const t2 = maxCount * 0.50;
    const t3 = maxCount * 0.75;

    const levels = messages.map(week =>
      week.map(count => {
        if (count === 0) return 0;
        if (count <= t1)  return 1;
        if (count <= t2)  return 2;
        if (count <= t3)  return 3;
        return 4;
      })
    );

    return { levels, messages };
  }

  /**
   * Build and animate an iOS-style heatmap from the centered seed cube.
   */
  async function buildHeatmap(overlay, graphContainer) {
    const { editor } = STATE.dom;
    const viewport = document.getElementById('viewport');
    const mobile = isMobileViewport();

    // Mobile: fold the 52-week grid in half → 26 cols × 14 rows (H1 on top, H2 below)
    // Desktop: standard GitHub-style 52 cols × 7 rows
    const COLS      = mobile ? 26 : 52;
    const ROWS      = mobile ? 14 : 7;
    const CELL_SIZE = mobile ? 10 : 14;
    const GAP       = mobile ?  2 :  3;
    const centerCol = Math.floor(COLS / 2);
    const centerRow = Math.floor(ROWS / 2);

    // On desktop the editor is zoomed to 2.2× (Phase 20), so the heatmap
    // starts at the same scale and later zooms out.  On mobile the editor
    // has no zoom, so the heatmap starts at 1× — no zoom-out needed.
    const heatmapInitScale = mobile ? 1.0 : 2.2;

    let { levels: activityData, messages: messageData } = computeActivityData();

    if (mobile) {
      // Remap 52×7 → 26×14: weeks 0-25 fill rows 0-6, weeks 26-51 fill rows 7-13
      const remapL = [], remapM = [];
      for (let col = 0; col < 26; col++) {
        remapL[col] = []; remapM[col] = [];
        for (let row = 0; row < 7; row++) {
          remapL[col][row] = activityData[col][row];
          remapM[col][row] = messageData[col][row];
        }
        for (let row = 7; row < 14; row++) {
          remapL[col][row] = activityData[col + 26][row - 7];
          remapM[col][row] = messageData[col + 26][row - 7];
        }
      }
      activityData = remapL;
      messageData  = remapM;
    }

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
    // 21a-3  Build the full heatmap DOM (hidden) at initial scale
    // ---------------------------------------------------------

    const heatmap = document.createElement('div');
    heatmap.className = mobile ? 'heatmap heatmap--mobile' : 'heatmap';
    heatmap.style.opacity = '0';
    heatmap.style.transform = `translate(-50%, -50%) scale(${heatmapInitScale})`;

    const colPx = CELL_SIZE + GAP;
    const allCells = [];
    let seedCell = null;
    let grid; // first/only grid — used for reflow trigger
    const allMonthLabelRows    = [];
    const allDayLabelContainers = []; // collected per-half for 21e animation

    // Builds one 26×7 grid half (rows rowStart…rowStart+6), appends its
    // gridArea + month labels to heatmap, returns the grid element.
    const buildHalf = (rowStart, months) => {
      const halfGridArea = document.createElement('div');
      halfGridArea.className = 'heatmap__grid-area';

      const dayLabels = document.createElement('div');
      dayLabels.className = 'heatmap__day-labels';
      ['', 'M', '', 'W', '', 'F', ''].forEach(name => {
        const lbl = document.createElement('div');
        lbl.className = 'heatmap__day-label';
        lbl.textContent = name;
        dayLabels.appendChild(lbl);
      });
      halfGridArea.appendChild(dayLabels);
      allDayLabelContainers.push(dayLabels);

      const halfGrid = document.createElement('div');
      halfGrid.className = 'heatmap__grid';

      for (let col = 0; col < COLS; col++) {
        const colEl = document.createElement('div');
        colEl.className = 'heatmap__col';
        for (let row = rowStart; row < rowStart + 7; row++) {
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
            const offset = -(600 + Math.random() * 800);
            cell.style.transform = `translateY(${offset}px)`;
          }

          colEl.appendChild(cell);
          allCells.push({ el: cell, col, row, dist, delay, fallDuration, isSeed });
        }
        halfGrid.appendChild(colEl);
      }

      halfGridArea.appendChild(halfGrid);
      heatmap.appendChild(halfGridArea);

      // Month labels sit directly below this half
      const monthRow = document.createElement('div');
      monthRow.className = 'heatmap__month-labels';
      const labelW = Math.round((COLS / 6) * colPx);
      months.forEach(name => {
        const lbl = document.createElement('div');
        lbl.className = 'heatmap__month-label';
        lbl.textContent = name;
        lbl.style.width = `${labelW}px`;
        monthRow.appendChild(lbl);
      });
      heatmap.appendChild(monthRow);
      allMonthLabelRows.push(monthRow);

      return halfGrid;
    };

    if (mobile) {
      // Two stacked 26×7 halves with their own month labels
      grid = buildHalf(0, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']);
      const halfGap = document.createElement('div');
      halfGap.className = 'heatmap__half-gap';
      heatmap.appendChild(halfGap);
      buildHalf(7, ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
    } else {
      // Desktop: single 52×7 grid with 12 month labels at the bottom
      const gridArea = document.createElement('div');
      gridArea.className = 'heatmap__grid-area';

      const dayLabels = document.createElement('div');
      dayLabels.className = 'heatmap__day-labels';
      ['', 'M', '', 'W', '', 'F', ''].forEach(name => {
        const lbl = document.createElement('div');
        lbl.className = 'heatmap__day-label';
        lbl.textContent = name;
        dayLabels.appendChild(lbl);
      });
      gridArea.appendChild(dayLabels);
      allDayLabelContainers.push(dayLabels);

      grid = document.createElement('div');
      grid.className = 'heatmap__grid';

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

      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const monthRow = document.createElement('div');
      monthRow.className = 'heatmap__month-labels';
      const weeksPerMonth = COLS / 12;
      MONTHS.forEach(name => {
        const lbl = document.createElement('div');
        lbl.className = 'heatmap__month-label';
        lbl.textContent = name;
        lbl.style.width = `${Math.round(weeksPerMonth * colPx)}px`;
        monthRow.appendChild(lbl);
      });
      heatmap.appendChild(monthRow);
      allMonthLabelRows.push(monthRow);
    }

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
    phantom.style.borderRadius = `${3 * heatmapInitScale}px`;

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
    //      Desktop: 2.2× → 1.0×
    //      Mobile / iPad Mini: 1.0× → fit-to-viewport scale
    //      so the full heatmap + labels are visible.
    // ---------------------------------------------------------

    await wait(1200);

    if (mobile) {
      // Compute scale that fits the heatmap width inside the viewport
      // with some breathing room (16px padding each side).
      const heatmapNaturalW = heatmap.scrollWidth;
      const availableW = window.innerWidth - 32;
      const fitScale = Math.min(1.0, availableW / heatmapNaturalW);
      heatmap.style.transition = 'transform 1.2s cubic-bezier(0.4, 0, 0.15, 1)';
      heatmap.style.transform = `translate(-50%, -50%) scale(${fitScale})`;
    } else {
      heatmap.style.transition = 'transform 1.2s cubic-bezier(0.4, 0, 0.15, 1)';
      heatmap.style.transform = 'translate(-50%, -50%) scale(1.0)';
    }

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

    const allDayLabels = allDayLabelContainers.flatMap(c =>
      [...c.querySelectorAll('.heatmap__day-label')]
    );
    allDayLabels.forEach((lbl, i) => {
      setTimeout(() => { lbl.style.opacity = '1'; }, i * 60);
    });

    const allMonthLabels = allMonthLabelRows.flatMap(row =>
      [...row.querySelectorAll('.heatmap__month-label')]
    );
    allMonthLabels.forEach((lbl, i) => {
      setTimeout(() => { lbl.style.opacity = '1'; }, i * 50);
    });

    await wait(800);

    allCells.forEach(c => {
      c.el.style.willChange = 'auto';
      c.el.style.transition = 'none';
      c.el.style.opacity = '';
    });

    return { heatmap, grid, allCells, activityData, messageData, COLS, ROWS };
  }

  window.__editorPhases.computeActivityData = computeActivityData;
  window.__editorPhases.buildHeatmap = buildHeatmap;
})();
