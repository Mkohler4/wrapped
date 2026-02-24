/* ============================================
   Phase 19: Graph transitions
   morphLineToLine, morphLineToBar, transitionToNextChart
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

(() => {
  'use strict';

  const H = window.__editorHelpers;

  const { wait, buildCatmullRomPath, easeOutCubic } = H;

  // Phase 19a: Morph line graph → new line graph via JS point interpolation
  async function morphLineToLine(refs, newData) {
    const {
      graphContainer, svg, linePath, areaPath, titleEl,
      monthLabelEls, calloutEls,
      padTop, padBottom, padLeft, padRight,
      containerW, containerH,
    } = refs;

    const chartW = containerW - padLeft - padRight;
    const chartH = containerH - padTop - padBottom;
    const chartBottom = padTop + chartH;

    // --- Step 1: Fade out old labels & callouts ---
    const fadeEls = [
      ...monthLabelEls, ...calloutEls,
      ...graphContainer.querySelectorAll('.line-graph__y-label'),
    ];
    for (const el of fadeEls) {
      el.style.transition = 'opacity 0.25s ease';
      el.style.opacity = '0';
    }
    titleEl.style.transition = 'opacity 0.25s ease';
    titleEl.style.opacity = '0';
    await wait(300);

    for (const el of fadeEls) el.remove();

    // --- Step 2: Sample the old path at N points ---
    const N = 60;
    const oldLen = linePath.getTotalLength();
    const oldPts = Array.from({ length: N }, (_, i) =>
      linePath.getPointAtLength((i / (N - 1)) * oldLen)
    );

    // --- Step 3: Compute new target positions ---
    const monthly = newData.monthly;
    const newMax = Math.max(...monthly.map(d => d.value));
    const stepX = chartW / (monthly.length - 1);
    const newPositions = monthly.map((d, i) => ({
      x: padLeft + i * stepX,
      y: padTop + chartH - (d.value / newMax) * chartH,
      value: d.value,
      month: d.month,
    }));

    // Build the target path and sample it at N points
    const targetPathD = buildCatmullRomPath(newPositions);
    const svgNS = 'http://www.w3.org/2000/svg';
    const tempPath = document.createElementNS(svgNS, 'path');
    tempPath.setAttribute('d', targetPathD);
    tempPath.style.visibility = 'hidden';
    svg.appendChild(tempPath);
    const newLen = tempPath.getTotalLength();
    const newPts = Array.from({ length: N }, (_, i) =>
      tempPath.getPointAtLength((i / (N - 1)) * newLen)
    );
    tempPath.remove();

    // --- Step 4: Tween line + area via requestAnimationFrame ---
    linePath.style.transition = 'none';
    linePath.style.strokeDasharray = 'none';
    linePath.style.strokeDashoffset = '0';

    const duration = 1200;
    const start = performance.now();
    await new Promise(resolve => {
      function tick(now) {
        const t = Math.min((now - start) / duration, 1);
        const ease = easeOutCubic(t);

        const pts = oldPts.map((op, i) => ({
          x: op.x + (newPts[i].x - op.x) * ease,
          y: op.y + (newPts[i].y - op.y) * ease,
        }));

        const lineD = buildCatmullRomPath(pts);
        const lastP = pts[pts.length - 1];
        const firstP = pts[0];
        const areaD2 = lineD + ` L ${lastP.x} ${chartBottom} L ${firstP.x} ${chartBottom} Z`;

        linePath.setAttribute('d', lineD);
        areaPath.setAttribute('d', areaD2);

        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    // --- Step 5: Update gridlines ---
    svg.querySelectorAll('line').forEach(l => l.remove());
    const newGridValues = [50, 100, 150];
    for (const val of newGridValues) {
      const gy = padTop + chartH - (val / newMax) * chartH;
      const gridLine = document.createElementNS(svgNS, 'line');
      gridLine.setAttribute('x1', padLeft);
      gridLine.setAttribute('y1', gy);
      gridLine.setAttribute('x2', padLeft + chartW);
      gridLine.setAttribute('y2', gy);
      gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.06)');
      gridLine.setAttribute('stroke-width', '1');
      svg.appendChild(gridLine);
    }

    // --- Step 6: Fade in new title ---
    titleEl.textContent = newData.title;
    titleEl.style.transition = 'opacity 0.35s ease';
    titleEl.style.opacity = '1';

    // --- Step 7: Fade in new Y-axis labels ---
    for (const val of newGridValues) {
      const gy = padTop + chartH - (val / newMax) * chartH;
      const yLabel = document.createElement('div');
      yLabel.className = 'line-graph__y-label';
      yLabel.textContent = val;
      yLabel.style.position = 'absolute';
      yLabel.style.left = '6px';
      yLabel.style.top = `${gy}px`;
      yLabel.style.transform = 'translateY(-50%)';
      yLabel.style.opacity = '0';
      graphContainer.appendChild(yLabel);
      setTimeout(() => {
        yLabel.style.transition = 'opacity 0.3s ease';
        yLabel.style.opacity = '1';
      }, 50);
    }

    // --- Step 8: Fade in new month labels ---
    const monthAbbrevs = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const newMonthLabelEls = [];
    for (let i = 0; i < monthly.length; i++) {
      const pos = newPositions[i];
      const mLabel = document.createElement('div');
      mLabel.className = 'line-graph__month-label';
      mLabel.textContent = monthAbbrevs[i];
      mLabel.style.position = 'absolute';
      mLabel.style.left = `${pos.x}px`;
      mLabel.style.top = `${chartBottom + 6}px`;
      mLabel.style.transform = 'translateX(-50%)';
      mLabel.style.opacity = '0';
      graphContainer.appendChild(mLabel);
      newMonthLabelEls.push(mLabel);
    }
    for (let i = 0; i < newMonthLabelEls.length; i++) {
      setTimeout(() => {
        newMonthLabelEls[i].style.transition = 'opacity 0.3s ease';
        newMonthLabelEls[i].style.opacity = '1';
      }, i * 30);
    }
    await wait(400);

    // --- Step 9: Fade in new callouts (first, peak, last) ---
    const values = monthly.map(d => d.value);
    const peakIdx = values.indexOf(Math.max(...values));
    const calloutIndices = [...new Set([0, peakIdx, monthly.length - 1])];
    for (const idx of calloutIndices) {
      const pos = newPositions[idx];
      const callout = document.createElement('div');
      callout.className = 'line-graph__callout';
      callout.textContent = pos.value;
      callout.style.position = 'absolute';
      callout.style.left = `${pos.x}px`;
      callout.style.top = `${pos.y - 20}px`;
      callout.style.transform = 'translateX(-50%)';
      callout.style.opacity = '0';
      graphContainer.appendChild(callout);
      await wait(60);
      callout.style.transition = 'opacity 0.35s ease';
      callout.style.opacity = '1';
      await wait(120);
    }
  }

  // Phase 19b: Morph line graph → bar graph
  async function morphLineToBar(refs, barData) {
    const {
      graphContainer, svg, linePath, areaPath, titleEl,
      monthLabelEls, calloutEls,
      padTop, padBottom, padLeft, padRight,
      containerW, containerH,
    } = refs;

    const chartH = containerH - padTop - padBottom;
    const chartBottom = padTop + chartH;

    // --- Step 1: Fade out labels, callouts, title ---
    const fadeEls = [
      ...monthLabelEls, ...calloutEls,
      ...graphContainer.querySelectorAll('.line-graph__y-label'),
    ];
    for (const el of fadeEls) {
      el.style.transition = 'opacity 0.25s ease';
      el.style.opacity = '0';
    }
    titleEl.style.transition = 'opacity 0.25s ease';
    titleEl.style.opacity = '0';
    await wait(300);
    for (const el of fadeEls) el.remove();

    // --- Step 2: Reverse-draw the line ---
    const pathLen = linePath.getTotalLength();
    linePath.style.strokeDasharray = pathLen;
    linePath.style.strokeDashoffset = '0';
    svg.getBoundingClientRect(); // reflow
    linePath.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    linePath.style.strokeDashoffset = String(pathLen);
    areaPath.style.transition = 'opacity 0.6s ease';
    areaPath.style.opacity = '0';
    await wait(850);

    // --- Step 3: Remove SVG + update title ---
    svg.remove();
    titleEl.textContent = barData.title;
    titleEl.style.transition = 'opacity 0.35s ease';
    titleEl.style.opacity = '1';

    // --- Step 5: Build bar chart (HTML divs) ---
    const categories = barData.categories;
    const maxVal = Math.max(...categories.map(c => c.value));
    const mobile = H.isMobileViewport ? H.isMobileViewport() : false;
    const barChartPadTop = 36;
    const barChartPadBottom = mobile ? 60 : 28;
    const barChartPadLeft = 12;
    const barChartPadRight = 12;
    const availableH = containerH - barChartPadTop - barChartPadBottom;

    const barChart = document.createElement('div');
    barChart.className = 'insight-bar-chart';
    barChart.style.position = 'absolute';
    barChart.style.left = `${barChartPadLeft}px`;
    barChart.style.right = `${barChartPadRight}px`;
    barChart.style.bottom = `${barChartPadBottom}px`;
    barChart.style.height = `${availableH}px`;
    graphContainer.appendChild(barChart);

    const barEls = [];
    const labelEls = [];
    const valueEls = [];

    for (const cat of categories) {
      const col = document.createElement('div');
      col.className = 'insight-bar-col';

      const valueEl = document.createElement('div');
      valueEl.className = 'insight-bar__value';
      valueEl.textContent = cat.value;
      valueEl.style.opacity = '0';
      col.appendChild(valueEl);
      valueEls.push(valueEl);

      const bar = document.createElement('div');
      bar.className = 'insight-bar';
      bar.style.height = '0px';
      col.appendChild(bar);
      barEls.push(bar);

      const label = document.createElement('div');
      label.className = 'insight-bar__label';
      label.textContent = cat.label;
      label.style.opacity = '0';
      col.appendChild(label);
      labelEls.push(label);

      barChart.appendChild(col);
    }

    // Reflow before animating
    barChart.offsetHeight;

    // --- Step 6: Stagger-grow bars ---
    for (let i = 0; i < barEls.length; i++) {
      const targetH = (categories[i].value / maxVal) * availableH;
      barEls[i].style.transition = 'height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
      barEls[i].style.height = `${targetH}px`;
      await wait(80);
    }

    // --- Step 7: Fade in labels + values ---
    for (let i = 0; i < labelEls.length; i++) {
      const delay = i * 50;
      setTimeout(() => {
        labelEls[i].style.transition = 'opacity 0.3s ease';
        labelEls[i].style.opacity = '1';
      }, delay);
      setTimeout(() => {
        valueEls[i].style.transition = 'opacity 0.3s ease';
        valueEls[i].style.opacity = '1';
      }, delay);
    }
    await wait(300);
  }

  // Phase 19: Orchestrator — sequences the full unwrite → morph → restream transition
  async function transitionToNextChart(refs, nextData) {
    const { aiResponse, textContainer, streamCursor } = refs;

    // Phase A: Un-animate the bubble first
    aiResponse.classList.remove('chat-ai-response--wrapped');
    await wait(300);

    // Phase B: Unwrite the old text — graph morph will start overlapping the tail end
    const unwritePromise = window.__editorPhases.unwriteText(textContainer, streamCursor);

    // After a short stagger, kick off the graph morph alongside the unwrite tail
    await wait(600);
    const morphPromise = (async () => {
      if (nextData.type === 'line') {
        await morphLineToLine(refs, nextData);
      } else if (nextData.type === 'bar') {
        await morphLineToBar(refs, nextData);
      }
    })();

    // Wait for both unwrite and morph to finish
    await unwritePromise;
    await morphPromise;

    // Phase C: Re-stream the new text fully first
    await window.__editorPhases.restreamText(textContainer, streamCursor, nextData.message);

    // Phase D: Then animate the bubble around the finished text
    await wait(150);
    aiResponse.classList.add('chat-ai-response--wrapped');
  }

  window.__editorPhases.morphLineToLine = morphLineToLine;
  window.__editorPhases.morphLineToBar = morphLineToBar;
  window.__editorPhases.transitionToNextChart = transitionToNextChart;
})();
