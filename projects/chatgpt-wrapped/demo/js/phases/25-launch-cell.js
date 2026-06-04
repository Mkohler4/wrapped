/* ============================================
   Phase 25 — Launch busiest cell into the sky
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.launchBusiestCell = (() => {
  'use strict';

  const { wait, isMobileViewport } = window.__editorHelpers;

  /**
   * After the three-stat layout, this phase:
   *   1) Fades out all stat numbers above the heatmap
   *   2) Zooms into the glowing busiest-day cell
   *   3) Fades out every other cell so only the glow remains
   *   4) Breaks the cell out of the grid as a free-floating element
   *   5) Launches it spinning + shrinking + fading into the air
   */
  async function launchBusiestCell(
    { heatmap, grid, allCells, activityData, COLS, ROWS },
    busiestResult
  ) {
    const { busiestCol, busiestRow } = busiestResult;
    const busiestCell = allCells.find(
      c => c.col === busiestCol && c.row === busiestRow
    );
    if (!busiestCell) return;

    // --- 1. Fade out all stat overlays above the heatmap ---
    const stats = heatmap.querySelectorAll('.heatmap-stat');
    stats.forEach(s => {
      s.style.transition = 'opacity 0.8s ease';
      s.style.opacity = '0';
    });

    // Fade month + day labels too
    heatmap.querySelectorAll('.heatmap__month-label, .heatmap__day-label').forEach(el => {
      el.style.transition = 'opacity 0.6s ease';
      el.style.opacity = '0';
    });

    await wait(1000);

    // Remove stat DOM nodes so they don't interfere with layout
    stats.forEach(s => s.remove());

    // --- 2. Ensure the busiest cell is visible + glowing ---
    busiestCell.el.classList.remove('heatmap__cell--faded', 'heatmap__cell--dimmed');
    busiestCell.el.classList.add('heatmap__cell--busiest');
    busiestCell.el.style.opacity = '1';

    // --- 3. Zoom the heatmap toward the busiest cell ---
    const cellRect = busiestCell.el.getBoundingClientRect();
    const heatmapRect = heatmap.getBoundingClientRect();

    const heatmapCenterX = heatmapRect.left + heatmapRect.width / 2;
    const heatmapCenterY = heatmapRect.top + heatmapRect.height / 2;
    const cellCenterX = cellRect.left + cellRect.width / 2;
    const cellCenterY = cellRect.top + cellRect.height / 2;

    // Offsets are in screen-pixels; convert to unscaled heatmap coords
    // by dividing by the current CSS scale so the translate values are correct.
    const curScale = heatmapRect.width / heatmap.offsetWidth || 1;
    const offsetX = (heatmapCenterX - cellCenterX) / curScale;
    const offsetY = (heatmapCenterY - cellCenterY) / curScale;

    const zoomScale = 3.5;

    heatmap.style.transition = 'transform 1.6s cubic-bezier(0.4, 0, 0.15, 1)';
    heatmap.style.transform =
      `translate(calc(-50% + ${offsetX * zoomScale}px), calc(-50% + ${offsetY * zoomScale}px)) scale(${zoomScale})`;

    // Amplify the glow while zooming
    busiestCell.el.style.transition = 'box-shadow 1.6s ease';
    busiestCell.el.style.boxShadow =
      '0 0 18px rgba(16, 185, 129, 0.7), 0 0 40px rgba(16, 185, 129, 0.3)';

    await wait(1800);

    // --- 4. Shake — subtle tremor like it's loosening from the grid ---
    busiestCell.el.classList.add('heatmap__cell--shaking');

    await wait(800);

    // Stop the shake
    busiestCell.el.classList.remove('heatmap__cell--shaking');
    busiestCell.el.style.transform = '';

    await wait(100);

    // --- 5. Snapshot the cell position, then hide it inside the heatmap ---
    const finalCellRect = busiestCell.el.getBoundingClientRect();

    const flyingCell = document.createElement('div');
    flyingCell.className = 'heatmap-flying-cell';
    flyingCell.style.left = `${finalCellRect.left}px`;
    flyingCell.style.top = `${finalCellRect.top}px`;
    flyingCell.style.width = `${finalCellRect.width}px`;
    flyingCell.style.height = `${finalCellRect.height}px`;

    const viewport = document.getElementById('viewport');
    viewport.appendChild(flyingCell);

    // Hide the busiest cell inside the heatmap
    busiestCell.el.classList.remove('heatmap__cell--busiest', 'heatmap__cell--busiest-glow');
    busiestCell.el.style.transition = 'none';
    busiestCell.el.style.opacity = '0';
    busiestCell.el.style.visibility = 'hidden';

    // --- 6. Heatmap falls away downward ---
    await wait(50);

    // --- 6a. Cell starts spinning in place while heatmap falls ---
    flyingCell.offsetHeight;
    flyingCell.classList.add('heatmap-flying-cell--spinning');

    heatmap.style.transition = 'transform 1.8s cubic-bezier(0.55, 0, 1, 0.45), opacity 1.6s ease-in';
    heatmap.style.transform =
      `translate(calc(-50% + ${offsetX * zoomScale}px), calc(-50% + ${offsetY * zoomScale}px + 120vh)) scale(${zoomScale})`;

    heatmap.style.opacity = '0';

    await wait(2000);

    // --- 7. Stop spinning, centre the cell, clean up heatmap ---
    flyingCell.classList.remove('heatmap-flying-cell--spinning');
    flyingCell.offsetHeight;

    const cellW = flyingCell.offsetWidth;
    const cellH = flyingCell.offsetHeight;
    flyingCell.style.transition = 'left 1s cubic-bezier(0.4, 0, 0.15, 1), top 1s cubic-bezier(0.4, 0, 0.15, 1)';
    flyingCell.style.left = `${(window.innerWidth - cellW) / 2}px`;
    flyingCell.style.top = `${(window.innerHeight - cellH) / 2}px`;

    await wait(1100);

    // --- 8. Cleanup heatmap only — keep the flying cell alive ---
    heatmap.remove();

    return flyingCell;
  }

  return launchBusiestCell;
})();
