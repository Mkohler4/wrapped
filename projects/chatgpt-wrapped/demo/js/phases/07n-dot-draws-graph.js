/* ============================================
   Phase 7-NEW: Dot draws the activity line graph
   ============================================
   The ChatGPT thinking dot comes alive and traces a
   line graph of hourly activity, Pixar/Apple style.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.dotDrawsGraph = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, fmtHour, msgCountForHour } = H;
  const { USAGE_HOURS } = CFG;

  async function dotDrawsGraph(response) {
    const { editor } = STATE.dom;
    const editorMainEl = document.querySelector('.editor__main');

    // ---------------------------------------------------------
    // ACT 1 — Setup: hold on text, zoom in, dot appears
    // ---------------------------------------------------------

    // 1a. Hold — let "You code by day..." breathe
    await wait(800);

    // 1b. Single camera zoom — one continuous push into the conversation.
    //     Frames: user bubble + AI response + anticipated graph below.
    //     Header & footer fade out; user bubble stays.
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    const userBubbles = STATE.chatMessages.querySelectorAll('.chat-bubble');
    const userBubble = userBubbles.length ? userBubbles[userBubbles.length - 1] : null;

    if (header) { header.style.transition = 'opacity 0.5s ease'; header.style.opacity = '0'; }
    if (footer) { footer.style.transition = 'opacity 0.5s ease'; footer.style.opacity = '0'; }

    // Measure the full combo we want to frame (no prior zoom active,
    // so getBoundingClientRect gives true pixel positions).
    const editorRect = editor.getBoundingClientRect();
    const respRect = response.getBoundingClientRect();
    const bubbleRect = userBubble ? userBubble.getBoundingClientRect() : respRect;
    const anticipatedGraphH = 210; // graph height + gap below response
    const comboTop = bubbleRect.top - editorRect.top;
    const comboBottom = respRect.bottom - editorRect.top + anticipatedGraphH;
    const comboH = comboBottom - comboTop;
    // Bias the framing upward — place the combo's visual weight
    // in the upper 40% of the screen so the graph has room below.
    const comboCenterY = (comboTop + comboBottom) / 2;
    const targetY = editorRect.height * 0.40; // aim for upper portion
    const zoomTranslateY = targetY - comboCenterY;

    // Pick a scale that keeps the full combo in view with some breathing
    // room (20% padding).  Cap at 1.5 so it still feels cinematic.
    const maxScale = Math.min(1.5, (editorRect.height * 0.80) / comboH);
    const zoomScale = Math.max(1.15, maxScale); // floor so it still zooms

    editor.style.transformOrigin = 'center center';
    editor.style.transform = `scale(${zoomScale}) translateY(${zoomTranslateY}px)`;
    editor.classList.add('editor--zoomed-dot-draw');

    if (editorMainEl) { editorMainEl.style.overflow = 'hidden'; }

    await wait(1000); // let the zoom land

    // 1c. Dot appears — small breathing pulse below the text
    const dotWrap = document.createElement('div');
    dotWrap.className = 'dot-draw-wrap';
    // Insert after the response text
    response.parentNode.insertBefore(dotWrap, response.nextSibling);

    const dot = document.createElement('div');
    dot.className = 'dot-draw dot-draw--breathing';
    dotWrap.appendChild(dot);

    dotWrap.offsetHeight;
    dotWrap.classList.add('dot-draw-wrap--visible');
    await wait(800);

    // ---------------------------------------------------------
    // ACT 2 — The Dot Awakens: intensify, drop, scale up
    // ---------------------------------------------------------

    // 2a. Glow intensifies — the dot "wakes up"
    dot.classList.add('dot-draw--awake');
    await wait(800);

    // 2b. Insert "Creating image" label (space reserved, text empty)
    //     and graph container together — layout is stable from the start.
    const genLabel = document.createElement('div');
    genLabel.className = 'dot-draw__gen-label dot-draw__gen-label--reserved';
    dotWrap.appendChild(genLabel);

    const graphWrap = document.createElement('div');
    graphWrap.className = 'dot-draw-graph';
    dotWrap.appendChild(graphWrap);
    graphWrap.offsetHeight;
    graphWrap.classList.add('dot-draw-graph--visible');
    await wait(200);

    // 2c. Drop — dot springs down into the graph container
    //     Measure the dot's screen position BEFORE re-parenting so we can
    //     keep it visually in the same spot, then animate smoothly to target.
    const dotRectBefore = dot.getBoundingClientRect();

    dot.classList.remove('dot-draw--breathing');
    dot.classList.add('dot-draw--drop');
    graphWrap.appendChild(dot);

    // Measure graphWrap origin and compute where the dot would sit at (0,0)
    const graphRect = graphWrap.getBoundingClientRect();
    // The offset needed to place the dot exactly where it was on screen
    const holdX = dotRectBefore.left - graphRect.left + dotRectBefore.width / 2;
    const holdY = dotRectBefore.top - graphRect.top + dotRectBefore.height / 2;

    // Place at old screen position instantly (no transition yet)
    dot.style.transition = 'none';
    dot.style.transform = `translate(${holdX}px, ${holdY}px) translate(-50%, -50%)`;
    dot.offsetHeight; // force reflow

    // Compute the actual first data point so the dot lands exactly
    // where the drawing will begin — no snap between drop and draw.
    const gh = graphWrap.clientHeight;
    const gw = graphWrap.clientWidth;
    const dropPadTop = 24, dropPadBottom = 28, dropPadLeft = 28;
    const dropChartH = gh - dropPadTop - dropPadBottom;
    const dropMaxVal = Math.max(...USAGE_HOURS);
    const firstPtX = dropPadLeft;
    const firstPtY = dropPadTop + dropChartH - (USAGE_HOURS[0] / dropMaxVal) * dropChartH;

    // Now re-enable transition and animate to the first data point
    dot.style.transition = '';
    dot.offsetHeight; // reflow — browser commits the transition before we set the target

    dot.style.transform = `translate(${firstPtX}px, ${firstPtY}px) translate(-50%, -50%)`;
    await wait(650);

    // 2d. Scale up — dot grows with overshoot
    dot.classList.add('dot-draw--grow');
    await wait(350);

    // 2e. Typewriter — write out "Creating image" character by character
    genLabel.classList.add('dot-draw__gen-label--visible');
    const genText = 'Creating image';
    for (let ci = 0; ci < genText.length; ci++) {
      genLabel.textContent += genText[ci];
      await wait(45);
    }
    await wait(200);

    // ---------------------------------------------------------
    // ACT 3 — Drawing the Graph: SVG + rAF dot trace
    // ---------------------------------------------------------

    // Build SVG from USAGE_HOURS (24 data points)
    const containerW = graphWrap.clientWidth;
    const containerH = graphWrap.clientHeight;

    const padTop = 24;
    const padBottom = 28;
    const padLeft = 28;
    const padRight = 28;
    const chartW = containerW - padLeft - padRight;
    const chartH = containerH - padTop - padBottom;
    const chartBottom = padTop + chartH;

    const maxValue = Math.max(...USAGE_HOURS);

    // Compute positions
    const stepX = chartW / (USAGE_HOURS.length - 1);
    const positions = USAGE_HOURS.map((v, i) => ({
      x: padLeft + i * stepX,
      y: padTop + chartH - (v / maxValue) * chartH,
      value: v,
    }));

    // Create SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('dot-draw__svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.setAttribute('width', containerW);
    svg.setAttribute('height', containerH);
    svg.style.pointerEvents = 'none';

    // Gradient for area fill
    const defs = document.createElementNS(svgNS, 'defs');
    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', 'dotDrawAreaGrad');
    gradient.setAttribute('x1', '0'); gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0'); gradient.setAttribute('y2', '1');
    const stop1 = document.createElementNS(svgNS, 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'rgba(16, 185, 129, 0.25)');
    const stop2 = document.createElementNS(svgNS, 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'rgba(16, 185, 129, 0.02)');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    defs.appendChild(gradient);
    svg.appendChild(defs);

    // Subtle gridlines
    const gridValues = [0.25, 0.5, 0.75];
    for (const frac of gridValues) {
      const gy = padTop + chartH - frac * chartH;
      const gridLine = document.createElementNS(svgNS, 'line');
      gridLine.setAttribute('x1', padLeft);
      gridLine.setAttribute('y1', gy);
      gridLine.setAttribute('x2', padLeft + chartW);
      gridLine.setAttribute('y2', gy);
      gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.06)');
      gridLine.setAttribute('stroke-width', '1');
      svg.appendChild(gridLine);
    }

    // Build Catmull-Rom spline path
    const svgPoints = positions.map(p => ({ x: p.x, y: p.y }));
    let d = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
    for (let i = 0; i < svgPoints.length - 1; i++) {
      const p0 = svgPoints[Math.max(i - 1, 0)];
      const p1 = svgPoints[i];
      const p2 = svgPoints[i + 1];
      const p3 = svgPoints[Math.min(i + 2, svgPoints.length - 1)];
      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    // Area fill path
    const lastPt = svgPoints[svgPoints.length - 1];
    const firstPt = svgPoints[0];
    const areaD = d + ` L ${lastPt.x} ${chartBottom} L ${firstPt.x} ${chartBottom} Z`;

    const areaPath = document.createElementNS(svgNS, 'path');
    areaPath.classList.add('dot-draw__area');
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#dotDrawAreaGrad)');
    areaPath.setAttribute('stroke', 'none');
    areaPath.style.opacity = '0';
    svg.appendChild(areaPath);

    // Line path
    const linePath = document.createElementNS(svgNS, 'path');
    linePath.classList.add('dot-draw__trail');
    linePath.setAttribute('d', d);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#10b981');
    linePath.setAttribute('stroke-width', '2.5');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(linePath);

    graphWrap.appendChild(svg);

    // Prepare stroke-dasharray for progressive reveal
    const pathLength = linePath.getTotalLength();
    linePath.style.strokeDasharray = pathLength;
    linePath.style.strokeDashoffset = pathLength;
    svg.getBoundingClientRect(); // force reflow

    // Activate drawing state on the dot
    dot.classList.add('dot-draw--drawing');
    await wait(200);

    // 3b. rAF loop — dot traces the path
    const DRAW_DURATION = 6000; // ms
    await new Promise((resolve) => {
      const startTime = performance.now();

      // Easing: slow start, steady middle, slow end (ease-in-out)
      function drawEase(t) {
        return t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
      }

      function frame(now) {
        const elapsed = now - startTime;
        const rawT = Math.min(elapsed / DRAW_DURATION, 1);
        const progress = drawEase(rawT);

        // Move the dot along the path
        const pt = linePath.getPointAtLength(progress * pathLength);
        dot.style.transform = `translate(${pt.x}px, ${pt.y}px) translate(-50%, -50%)`;

        // Reveal line behind the dot
        linePath.style.strokeDashoffset = pathLength - (progress * pathLength);

        // Area fill fades in progressively (delayed slightly behind the dot)
        const areaProgress = Math.max(0, (progress - 0.08) / 0.92);
        areaPath.style.opacity = areaProgress * 0.85;

        if (rawT < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });

    // ---------------------------------------------------------
    // ACT 4 — Settle + Reveal: landing bounce, fade, labels
    // ---------------------------------------------------------

    // Fade the "Creating image" label out — no layout change, graph stays put
    genLabel.classList.remove('dot-draw__gen-label--visible');
    genLabel.classList.add('dot-draw__gen-label--hidden');

    // 4a. Landing bounce
    dot.classList.remove('dot-draw--drawing');
    dot.classList.add('dot-draw--settle');
    await wait(600);

    // 4b. Dot fades to a static marker
    dot.classList.add('dot-draw--fade');
    await wait(500);

    // 4c. Labels fade in with stagger
    // Title
    const titleEl = document.createElement('div');
    titleEl.className = 'dot-draw__title';
    titleEl.textContent = 'Your Most Active Hours';
    titleEl.style.opacity = '0';
    graphWrap.appendChild(titleEl);

    // Hour labels (x-axis)
    const hourLabels = [
      { text: '12AM', hour: 0 },
      { text: '6AM',  hour: 6 },
      { text: '12PM', hour: 12 },
      { text: '6PM',  hour: 18 },
      { text: '11PM', hour: 23 },
    ];
    const hourLabelEls = [];
    for (const { text, hour } of hourLabels) {
      const lbl = document.createElement('div');
      lbl.className = 'dot-draw__hour-label';
      lbl.textContent = text;
      const xPos = padLeft + (hour / 23) * chartW;
      lbl.style.left = `${xPos}px`;
      lbl.style.top = `${chartBottom + 6}px`;
      lbl.style.opacity = '0';
      graphWrap.appendChild(lbl);
      hourLabelEls.push(lbl);
    }

    // Animate title in
    await wait(200);
    titleEl.style.transition = 'opacity 0.5s ease';
    titleEl.style.opacity = '1';
    await wait(300);

    // Stagger hour labels
    for (let i = 0; i < hourLabelEls.length; i++) {
      setTimeout(() => {
        hourLabelEls[i].style.transition = 'opacity 0.35s ease';
        hourLabelEls[i].style.opacity = '1';
      }, i * 80);
    }

    // 4d. Peak hour callout — shows message count at the highest point
    const peakIdx = USAGE_HOURS.indexOf(maxValue);
    const peakPos = positions[peakIdx];
    const peakMessages = msgCountForHour(peakIdx).toLocaleString();
    const peakHourText = fmtHour(peakIdx);

    const peakCallout = document.createElement('div');
    peakCallout.className = 'dot-draw__peak-callout';
    peakCallout.style.left = `${peakPos.x}px`;
    peakCallout.style.bottom = `${containerH - peakPos.y + 6}px`;

    const peakCount = document.createElement('div');
    peakCount.className = 'dot-draw__peak-count';
    peakCount.textContent = `${peakMessages} msgs`;

    const peakHour = document.createElement('div');
    peakHour.className = 'dot-draw__peak-hour';
    peakHour.textContent = peakHourText;

    const peakLine = document.createElement('div');
    peakLine.className = 'dot-draw__peak-line';

    peakCallout.appendChild(peakCount);
    peakCallout.appendChild(peakHour);
    peakCallout.appendChild(peakLine);
    graphWrap.appendChild(peakCallout);

    // Animate callout in after labels have settled
    await wait(600);
    peakCallout.classList.add('dot-draw__peak-callout--visible');

    // Hold — let user take in the full picture
    await wait(2500);

    // --- Cleanup: smoothly zoom back out ---
    // Keep transformOrigin stable during the transition so the reference
    // point doesn't jump.  The .editor base CSS transitions transform over 0.9s.
    editor.classList.remove('editor--zoomed-dot-draw');
    editor.style.transform = 'scale(1) translateY(0px)';
    if (editorMainEl) { editorMainEl.style.overflow = ''; }

    // Restore header/footer visibility for downstream phases
    if (header) { header.style.transition = 'opacity 0.5s ease'; header.style.opacity = '1'; }
    if (footer) { footer.style.transition = 'opacity 0.5s ease'; footer.style.opacity = '1'; }

    await wait(1000); // let the 0.9s zoom-out transition finish

    // Now safe to clear the inline styles — we're already at identity transform
    editor.style.transform = '';
    editor.style.transformOrigin = '';
  }

  return dotDrawsGraph;
})();
