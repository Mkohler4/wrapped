/* ============================================
   Phase 17: Growth insight — AI message streams
   in, iOS-style graph draws, then zoom.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.showGrowthInsight = (() => {
  'use strict';

  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, jitter, isMobileViewport } = H;

  async function showGrowthInsight(data) {
    const { editor } = STATE.dom;

    const monthly = data.monthly;
    const maxValue = Math.max(...monthly.map(d => d.value));

    // --- Step 1: Thinking dots ---
    const thinkingContainer = document.createElement('div');
    thinkingContainer.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinkingContainer.appendChild(dot);
    }
    STATE.chatMessages.appendChild(thinkingContainer);
    await wait(800);
    thinkingContainer.classList.add('chat-thinking--intense');
    await wait(400);

    // Fade out thinking dots
    thinkingContainer.style.transition = 'opacity 0.2s ease';
    thinkingContainer.style.opacity = '0';
    await wait(200);
    thinkingContainer.remove();

    // --- Step 2: AI message as a separate chat-ai-response bubble ---
    const aiResponse = document.createElement('div');
    aiResponse.className = 'chat-ai-response';
    STATE.chatMessages.appendChild(aiResponse);

    const textContainer = document.createElement('span');
    aiResponse.appendChild(textContainer);

    const streamCursor = document.createElement('span');
    streamCursor.className = 'chat-ai-response__cursor';
    aiResponse.appendChild(streamCursor);

    // Fade in the AI response bubble
    aiResponse.offsetHeight;
    aiResponse.classList.add('chat-ai-response--visible');
    await wait(350);

    // Stream the message text word-by-word
    for (const part of data.message) {
      const words = part.text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        if (part.cls) {
          const span = document.createElement('span');
          span.className = part.cls;
          span.textContent = word;
          textContainer.appendChild(span);
        } else {
          textContainer.appendChild(document.createTextNode(word));
        }
        if (word.trim()) {
          await wait(jitter(45, 15));
        }
      }
    }

    await wait(300);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');
    await wait(200);

    // Wrap the AI message in a bubble (background + padding animate in)
    aiResponse.classList.add('chat-ai-response--wrapped');
    await wait(500);

    // --- Step 3: Graph container fades in below (separate element) ---
    const graphWrap = document.createElement('div');
    graphWrap.className = 'insight-bubble insight-bubble--centered';
    graphWrap.style.opacity = '0';
    STATE.chatMessages.appendChild(graphWrap);

    const graphContainer = document.createElement('div');
    graphContainer.className = 'insight-graph';
    graphWrap.appendChild(graphContainer);

    graphWrap.offsetHeight;
    graphWrap.style.transition = 'opacity 0.4s ease';
    graphWrap.style.opacity = '1';
    await wait(450);

    // --- Step 4: Build the graph (SVG + labels) inside graphContainer ---
    const containerW = graphContainer.clientWidth;
    const containerH = graphContainer.clientHeight;

    // Chart area padding
    const padTop = 38;
    const padBottom = 28;
    const padLeft = 38;
    const padRight = 15;
    const chartW = containerW - padLeft - padRight;
    const chartH = containerH - padTop - padBottom;
    const chartBottom = padTop + chartH;

    // Graph title
    const titleEl = document.createElement('div');
    titleEl.className = 'line-graph__title';
    titleEl.textContent = 'Monthly Conversations';
    graphContainer.appendChild(titleEl);

    // Compute data positions (container-relative pixel coordinates)
    const stepX = chartW / (monthly.length - 1);
    const positions = monthly.map((d, i) => ({
      x: padLeft + i * stepX,
      y: padTop + chartH - (d.value / maxValue) * chartH,
      value: d.value,
      month: d.month,
    }));

    // --- SVG overlay (fills the graph container) ---
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.classList.add('line-graph');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.setAttribute('width', containerW);
    svg.setAttribute('height', containerH);
    svg.style.pointerEvents = 'none';

    // Gradient definition for area fill
    const defs = document.createElementNS(svgNS, 'defs');
    const gradient = document.createElementNS(svgNS, 'linearGradient');
    gradient.setAttribute('id', 'areaGrad');
    gradient.setAttribute('x1', '0');
    gradient.setAttribute('y1', '0');
    gradient.setAttribute('x2', '0');
    gradient.setAttribute('y2', '1');

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

    // Subtle horizontal gridlines
    const gridValues = [50, 100, 150];
    for (const val of gridValues) {
      const gy = padTop + chartH - (val / maxValue) * chartH;
      const gridLine = document.createElementNS(svgNS, 'line');
      gridLine.setAttribute('x1', padLeft);
      gridLine.setAttribute('y1', gy);
      gridLine.setAttribute('x2', padLeft + chartW);
      gridLine.setAttribute('y2', gy);
      gridLine.setAttribute('stroke', 'rgba(255, 255, 255, 0.06)');
      gridLine.setAttribute('stroke-width', '1');
      svg.appendChild(gridLine);
    }

    // Build the Catmull-Rom spline curve
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

    // Area fill path (same curve, closed down to chart bottom)
    const lastPt = svgPoints[svgPoints.length - 1];
    const firstPt = svgPoints[0];
    const areaD = d + ` L ${lastPt.x} ${chartBottom} L ${firstPt.x} ${chartBottom} Z`;

    const areaPath = document.createElementNS(svgNS, 'path');
    areaPath.classList.add('line-graph__area');
    areaPath.setAttribute('d', areaD);
    areaPath.setAttribute('fill', 'url(#areaGrad)');
    areaPath.setAttribute('stroke', 'none');
    areaPath.style.opacity = '0';
    svg.appendChild(areaPath);

    // Line path (on top of area fill)
    const linePath = document.createElementNS(svgNS, 'path');
    linePath.classList.add('line-graph__path');
    linePath.setAttribute('d', d);
    linePath.setAttribute('fill', 'none');
    linePath.setAttribute('stroke', '#10b981');
    linePath.setAttribute('stroke-width', '5');
    linePath.setAttribute('stroke-linecap', 'round');
    linePath.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(linePath);

    graphContainer.appendChild(svg);

    // Y-axis reference labels
    for (const val of gridValues) {
      const gy = padTop + chartH - (val / maxValue) * chartH;
      const yLabel = document.createElement('div');
      yLabel.className = 'line-graph__y-label';
      yLabel.textContent = val;
      yLabel.style.position = 'absolute';
      yLabel.style.left = '6px';
      yLabel.style.top = `${gy}px`;
      yLabel.style.transform = 'translateY(-50%)';
      graphContainer.appendChild(yLabel);
    }

    // Month labels along X-axis (all 12)
    const monthAbbrevs = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const monthLabelEls = [];
    for (let i = 0; i < monthly.length; i++) {
      const pos = positions[i];
      const mLabel = document.createElement('div');
      mLabel.className = 'line-graph__month-label';
      mLabel.textContent = monthAbbrevs[i];
      mLabel.style.position = 'absolute';
      mLabel.style.left = `${pos.x}px`;
      mLabel.style.top = `${chartBottom + 6}px`;
      mLabel.style.transform = 'translateX(-50%)';
      mLabel.style.opacity = '0';
      graphContainer.appendChild(mLabel);
      monthLabelEls.push(mLabel);
    }

    // Key value callouts (Jan, Aug, Dec)
    const calloutIndices = [0, 7, 11];
    const calloutEls = [];
    for (const idx of calloutIndices) {
      const pos = positions[idx];
      const callout = document.createElement('div');
      callout.className = 'line-graph__callout';
      callout.textContent = pos.value;
      callout.style.position = 'absolute';
      callout.style.left = `${pos.x}px`;
      callout.style.top = `${pos.y - 20}px`;
      callout.style.transform = 'translateX(-50%)';
      callout.style.opacity = '0';
      graphContainer.appendChild(callout);
      calloutEls.push(callout);
    }

    // --- Step 5: Animate line draw ---
    const pathLength = linePath.getTotalLength();
    linePath.style.strokeDasharray = pathLength;
    linePath.style.strokeDashoffset = pathLength;

    // Force reflow — offsetHeight doesn't work on SVG elements
    svg.getBoundingClientRect();

    linePath.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.15, 1)';
    linePath.style.strokeDashoffset = '0';

    // Area fill fades in shortly after line starts drawing
    setTimeout(() => {
      areaPath.style.transition = 'opacity 1.2s ease';
      areaPath.style.opacity = '1';
    }, 300);

    await wait(1700);

    // --- Step 6: Labels and callouts fade in ---
    // Month labels (staggered)
    for (let i = 0; i < monthLabelEls.length; i++) {
      setTimeout(() => {
        monthLabelEls[i].style.transition = 'opacity 0.3s ease';
        monthLabelEls[i].style.opacity = '1';
      }, i * 30);
    }

    await wait(400);

    // Value callouts
    for (const el of calloutEls) {
      el.style.transition = 'opacity 0.35s ease';
      el.style.opacity = '1';
      await wait(120);
    }

    // Hold briefly to take it in
    await wait(1000);

    // --- Step 7: Camera focuses on the graph ---
    const userBubbles = STATE.chatMessages.querySelectorAll('.chat-bubble');
    const userBubble = userBubbles.length ? userBubbles[userBubbles.length - 1] : null;

    const editorMainEl = document.querySelector('.editor__main');
    const mobile = isMobileViewport();

    // Scroll so the graph combo is roughly in view before we measure
    if (editorMainEl) {
      const msgTop = aiResponse.offsetTop;
      const graphBottom2 = graphWrap.offsetTop + graphWrap.offsetHeight;
      const comboH = graphBottom2 - msgTop;
      const viewH = editorMainEl.clientHeight;
      const scrollTarget = msgTop - (viewH - comboH) / 2;
      editorMainEl.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      await wait(400);

      // Lock scroll so transform math stays stable
      editorMainEl.style.overflow = 'hidden';
    }

    // Fade out header, footer, and user's bubble
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    if (header) {
      header.style.transition = 'opacity 0.5s ease';
      header.style.opacity = '0';
    }
    if (footer) {
      footer.style.transition = 'opacity 0.5s ease';
      footer.style.opacity = '0';
    }
    if (userBubble) {
      userBubble.style.transition = 'opacity 0.5s ease, max-height 0.6s ease, padding 0.5s ease, margin 0.5s ease';
      userBubble.style.opacity = '0';
      setTimeout(() => {
        userBubble.style.maxHeight = '0';
        userBubble.style.overflow = 'hidden';
        userBubble.style.padding = '0';
        userBubble.style.margin = '0';
      }, 300);
    }

    if (!mobile) {
      // Desktop: zoom + recentre the graph combo
      const editorRect = editor.getBoundingClientRect();
      const aiRect     = aiResponse.getBoundingClientRect();
      const graphRect  = graphWrap.getBoundingClientRect();

      const comboCenterY = ((aiRect.top + graphRect.bottom) / 2) - editorRect.top;
      const editorCenterY = editorRect.height / 2;
      const translateY = editorCenterY - comboCenterY;

      editor.style.transformOrigin = 'center center';
      editor.style.transform = `scale(1.3) translateY(${translateY}px)`;

      // Wait for the transition to finish (0.9s + small buffer)
      await wait(1000);
    } else {
      // Mobile: no zoom — scroll centering + fades are enough
      await wait(600);
    }

    // Hold — let user take in the full picture
    await wait(4000);

    return {
      aiResponse,
      textContainer,
      streamCursor,
      graphContainer,
      graphWrap,
      svg,
      linePath,
      areaPath,
      titleEl,
      positions,
      monthLabelEls,
      calloutEls,
      padTop,
      padBottom,
      padLeft,
      padRight,
      containerW,
      containerH,
    };
  }

  return showGrowthInsight;
})();
