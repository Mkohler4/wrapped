/* ============================================
   Editor — Full Intro Sequence
   ============================================
   1. Cursor blinks (idle)
   2. Text types, editor zooms on first char
   3. Fake mouse cursor moves to send button
   4. Click animation
   5. Zoom out, message → bubble (right side)
   6. Thinking dots appear (left side)
   7. AI response streams in word by word (left side)
   ============================================ */

(() => {
  'use strict';

  // --- DOM ---
  const editor      = document.getElementById('editor');
  const editorMain  = document.querySelector('.editor__main');
  const inputWrap   = document.getElementById('input-wrap');
  const inputText   = document.getElementById('input-text');
  const cursor      = document.getElementById('cursor');
  const placeholder = document.getElementById('placeholder');
  const sendBtn     = document.getElementById('send-btn');
  const fakeCursor  = document.getElementById('fake-cursor');

  // --- Config ---
  const PROMPT = 'Give me my 2025 ChatGPT Wrapped';
  const CHAR_MS = 44;
  const SPACE_EXTRA = 85;
  const PAUSE_WORDS = { '2025': 150 };

  // The AI response — with markup for accents
  const AI_RESPONSE_PARTS = [
    { text: 'You code by day and write fiction by night. ' },
    { text: '73%', cls: 'ai-accent' },
    { text: ' of your creative writing happens after ' },
    { text: '10 PM', cls: 'ai-accent--warm' },
    { text: '. You\'re two different people.' },
  ];

  // Hourly ChatGPT activity (0–1), index 0 = 12 AM, peak at index 22 = 10 PM
  const USAGE_HOURS = [
    0.08, 0.04, 0.02, 0.01, 0.01, 0.02,  // 12AM–5AM
    0.06, 0.15, 0.30, 0.42, 0.45, 0.38,  // 6AM–11AM
    0.32, 0.35, 0.40, 0.38, 0.30, 0.25,  // 12PM–5PM
    0.35, 0.55, 0.72, 0.88, 1.00, 0.62,  // 6PM–11PM
  ];

  // --- Helpers ---
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  const jitter = (base, range = 12) => base + (Math.random() * range * 2 - range);

  // Animate a number counting up from 0 → target inside an element
  function animateCount(el, target, suffix = '', durationMs = 600) {
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / durationMs, 1);
      // Ease-out quad for a satisfying deceleration
      const eased = 1 - (1 - t) * (1 - t);
      const current = Math.round(eased * target);
      el.textContent = `${current.toLocaleString()}${suffix}`;
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  let hasZoomed = false;
  let chatMessages = null; // container created during send

  // ============================================
  // Phase 1: Type into input
  // ============================================
  async function typePrompt() {
    let typed = '';
    for (let i = 0; i < PROMPT.length; i++) {
      const ch = PROMPT[i];
      typed += ch;
      inputText.textContent = typed;

      if (i === 0 && !hasZoomed) {
        hasZoomed = true;
        placeholder.classList.add('editor__placeholder--hidden');
        editor.classList.add('editor--zoomed');
        inputWrap.classList.add('editor__input-wrap--expanded');
        sendBtn.classList.add('editor__send-btn--active');
      }

      let delay = jitter(CHAR_MS);
      if (ch === ' ') delay += SPACE_EXTRA;

      for (const [word, pause] of Object.entries(PAUSE_WORDS)) {
        if (typed.endsWith(word) && (i + 1 >= PROMPT.length || PROMPT[i + 1] === ' ')) {
          delay += pause;
        }
      }
      await wait(delay);
    }
  }

  // ============================================
  // Phase 2: Fake cursor → send button
  // ============================================
  async function moveCursorToSend() {
    cursor.classList.add('editor__cursor--hidden');

    const btnRect = sendBtn.getBoundingClientRect();
    const textRect = inputText.getBoundingClientRect();

    fakeCursor.style.left = `${textRect.right + 10}px`;
    fakeCursor.style.top = `${textRect.top + textRect.height / 2}px`;
    fakeCursor.style.transition = 'none';
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight;

    fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top = `${btnRect.top + btnRect.height / 2 - 3}px`;

    await wait(650);
  }

  // ============================================
  // Phase 3: Click send button
  // ============================================
  async function clickSend() {
    sendBtn.classList.add('editor__send-btn--pressed');
    await wait(120);

    sendBtn.classList.remove('editor__send-btn--pressed');
    sendBtn.classList.add('editor__send-btn--released', 'editor__send-btn--ripple');
    sendBtn.style.position = 'relative';
    await wait(150);

    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(200);

    sendBtn.classList.remove('editor__send-btn--ripple', 'editor__send-btn--released');
  }

  // ============================================
  // Phase 4: Zoom out + user message bubble
  // ============================================
  async function sendMessage() {
    const messageText = inputText.textContent;

    // Clear input
    inputText.textContent = '';
    placeholder.classList.remove('editor__placeholder--hidden');
    sendBtn.classList.remove('editor__send-btn--active');
    inputWrap.classList.remove('editor__input-wrap--expanded');

    // Zoom out
    editor.classList.remove('editor--zoomed');
    await wait(400);

    // Hide welcome
    const welcome = document.querySelector('.editor__welcome');
    welcome.style.transition = 'opacity 0.3s ease';
    welcome.style.opacity = '0';
    await wait(300);
    welcome.style.display = 'none';

    // Set up the chat messages container
    editorMain.style.justifyContent = 'flex-start';
    editorMain.style.alignItems = 'stretch';

    chatMessages = document.createElement('div');
    chatMessages.className = 'chat-messages';
    editorMain.appendChild(chatMessages);

    // Add user bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = messageText;
    chatMessages.appendChild(bubble);

    await wait(50);
    bubble.classList.add('chat-bubble--visible');
    await wait(500);
  }

  // ============================================
  // Phase 5: Thinking dots (left side)
  // ============================================
  async function showThinkingDots() {
    const thinking = document.createElement('div');
    thinking.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinking.appendChild(dot);
    }
    chatMessages.appendChild(thinking);

    // Normal thinking
    await wait(1500);

    // Intensify
    thinking.classList.add('chat-thinking--intense');
    await wait(600);

    return thinking;
  }

  // ============================================
  // Phase 6: AI response streams in word-by-word
  // ============================================
  async function streamAIResponse(thinkingDots) {
    // Remove thinking dots
    thinkingDots.style.transition = 'opacity 0.2s ease';
    thinkingDots.style.opacity = '0';
    await wait(200);
    thinkingDots.remove();

    // Create the response element
    const response = document.createElement('div');
    response.className = 'chat-ai-response';

    const textContainer = document.createElement('span');
    response.appendChild(textContainer);

    const streamCursor = document.createElement('span');
    streamCursor.className = 'chat-ai-response__cursor';
    response.appendChild(streamCursor);

    chatMessages.appendChild(response);

    await wait(50);
    response.classList.add('chat-ai-response--visible');
    await wait(200);

    // Stream each part word-by-word
    for (const part of AI_RESPONSE_PARTS) {
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
          await wait(jitter(55, 20));
        }
      }
    }

    // Done streaming — hide cursor
    await wait(400);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    return response;
  }

  // ============================================
  // Phase 7: Wrap in bubble → grow → zoom in
  // ============================================
  async function highlightResponse(response) {
    await wait(800);

    response.classList.add('chat-ai-response--wrapped');
    await wait(700);
    response.classList.add('chat-ai-response--grown');
    await wait(500);
    // NOTE: zoom is handled by dotDrawsGraph as one continuous motion.
    // No editor--zoomed-response here — avoids a two-step zoom.
    await wait(1000); // Hold for a moment before next phase
  }

  // ============================================
  // Usage-time visualization (iOS Screen Time style)
  // ============================================
  function fmtHour(h) {
    if (h === 0) return '12 AM';
    if (h === 12) return '12 PM';
    return h < 12 ? `${h} AM` : `${h - 12} PM`;
  }

  // Compute message count per hour from normalized data
  const USAGE_SUM = USAGE_HOURS.reduce((a, b) => a + b, 0);
  const TOTAL_MESSAGES = 20000;
  function msgCountForHour(i) {
    return Math.round((USAGE_HOURS[i] / USAGE_SUM) * TOTAL_MESSAGES);
  }

  // ============================================
  // Phases 7a-7g: EXTRACTED to js/image-phases-backup.js
  // (buildUsageVisualization, showImageGeneration,
  //  moveCursorToMaxBtn, clickMaxBtn, expandImage,
  //  collapseImage, hoverTopBars)
  // ============================================

  // ============================================
  // Phase 7-NEW: Dot draws the activity line graph
  // ============================================
  // The ChatGPT thinking dot comes alive and traces a
  // line graph of hourly activity, Pixar/Apple style.

  async function dotDrawsGraph(response) {
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
    const userBubbles = chatMessages.querySelectorAll('.chat-bubble');
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

  // ============================================
  // Phase 8: Ghost bubbles cascade (colorful)
  // ============================================

  // Sample messages for featured bubbles
  const SAMPLE_MESSAGES_USER = [
    'explain quantum computing',
    'write me a poem about rain',
    'debug this React hook',
    'plan a weekend trip to Tokyo',
    'how does photosynthesis work',
    'make this code faster',
    'translate this to Spanish',
    'summarize this article',
    'what should I cook tonight',
    'help me write a cover letter',
    'explain recursion like I\'m 5',
    'review my essay',
    'create a workout plan',
    'fix my CSS grid layout',
  ];

  const SAMPLE_MESSAGES_AI = [
    'Here\'s a step-by-step breakdown...',
    'Great question! Let me explain...',
    'I\'d recommend starting with...',
    'Here are 3 approaches you could try:',
    'Based on your description...',
    'The key difference is...',
    'Let me help you debug that.',
    'Here\'s an optimized version:',
    'Sure! Here\'s that poem...',
    'Consider these alternatives:',
  ];

  // Word frequency data for the word-bubble visualization (Phase 26)
  const WORD_FREQUENCY_DATA = [
    { word: 'code',         count: 3700, displayCount: '3.7k' },
    { word: 'explain',      count: 3000, displayCount: '3.0k' },
    { word: 'write',        count: 2800, displayCount: '2.8k' },
    { word: 'debug',        count: 2400, displayCount: '2.4k' },
    { word: 'function',     count: 2300, displayCount: '2.3k' },
    { word: 'help',         count: 2000, displayCount: '2.0k' },
    { word: 'create',       count: 1800, displayCount: '1.8k' },
    { word: 'plan',         count: 1700, displayCount: '1.7k' },
    { word: 'review',       count: 1500, displayCount: '1.5k' },
    { word: 'translate',    count: 1300, displayCount: '1.3k' },
    { word: 'fix',          count: 1200, displayCount: '1.2k' },
    { word: 'summarize',    count: 1000, displayCount: '1.0k' },
  ];

  // Asymmetric easing: slow ramp-up, fast cruise, quick ease-out.
  // Returns a value in [0, 1] for input t in [0, 1].
  // Tuned: shorter ramp (28%) so the conversation text scrolls away faster,
  // longer cruise (60%) for the high-speed feel, quick decel (12%).
  function cascadeEasing(t) {
    const rampEnd = 0.28;    // 28% of duration: ease-in
    const decelStart = 0.88; // last 12% of duration: quick ease-out

    if (t <= rampEnd) {
      // Ease-in (cubic)
      const p = t / rampEnd;
      const eased = p * p * p;
      return eased * 0.18; // covers 0–18% of scroll distance
    } else if (t <= decelStart) {
      // Linear cruise (fast, constant speed)
      const p = (t - rampEnd) / (decelStart - rampEnd);
      return 0.18 + p * 0.72; // covers 18–90% of scroll distance
    } else {
      // Quick ease-out (cubic)
      const p = (t - decelStart) / (1 - decelStart);
      const eased = 1 - Math.pow(1 - p, 3);
      return 0.9 + eased * 0.1; // covers 90–100% of scroll distance
    }
  }

  async function cascadeMessages() {
    // Zoom back out so we can see the cascade filling
    editor.classList.remove('editor--zoomed-response');
    await wait(400);

    // --- Pop footer to overlay so bubbles can fill behind it ---
    // The footer is a flex sibling that takes ~80-100px at the bottom.
    // Switching it to position:absolute makes it overlay the bottom of
    // the screen instead of displacing space. editorMain (flex:1) grows
    // to fill the freed area. Bubbles stack up behind the footer, and
    // when we fade it out the messages underneath are revealed — making
    // it look like messages were already scrolling behind the text field.
    const footer = document.querySelector('.editor__footer');
    const footerH = footer.offsetHeight;
    footer.style.position = 'absolute';
    footer.style.bottom = '0';
    footer.style.left = '0';
    footer.style.right = '0';
    footer.style.zIndex = '10';
    footer.style.transition = 'opacity 0.6s ease';

    // Reduce gap so ghosts pack tighter
    chatMessages.style.gap = '6px';

    // --- GPU pre-warm ---
    // Micro-blur forces the browser to promote chatMessages to its own
    // compositing layer NOW, so the real blur later doesn't stutter.
    // blur-ready sets the CSS transition property BEFORE values change —
    // if both are added in the same frame, browsers snap instead of animating.
    chatMessages.style.willChange = 'filter, opacity';
    chatMessages.style.filter = 'blur(0.01px)';
    chatMessages.classList.add('chat-messages--blur-ready');

    // --- On-the-fly bubble creation + estimated scroll ---
    // Creating 1-2 simple divs per frame is cheap. The expensive part in
    // the original was reading scrollHeight after each mutation (forced
    // synchronous layout). We eliminate that by ESTIMATING scroll height
    // from the bubble count instead of measuring it.
    const totalBubbles = 200;
    const duration = 4800;
    const avgBubbleH = 21;  // ~15px avg height + 6px gap
    let bubbleCount = 0;
    let userMsgIdx = 0;
    let aiMsgIdx = 0;
    let footerFaded = false;

    // Read the initial content height and viewport ONCE before the loop.
    // These are the only layout reads we ever do (after the footer pop).
    const initialContentH = editorMain.scrollHeight;
    const viewportH = editorMain.clientHeight;

    function createBubble() {
      const ghost = document.createElement('div');
      const isUser = Math.random() > 0.4;
      const sideClass = isUser ? 'ghost-bubble--user' : 'ghost-bubble--ai';
      const isFeatured = Math.random() < 0.15;

      if (isFeatured) {
        ghost.className = `ghost-bubble ghost-bubble--active ${sideClass} ghost-bubble--featured`;
        if (isUser) {
          ghost.textContent = SAMPLE_MESSAGES_USER[userMsgIdx % SAMPLE_MESSAGES_USER.length];
          userMsgIdx++;
        } else {
          ghost.textContent = SAMPLE_MESSAGES_AI[aiMsgIdx % SAMPLE_MESSAGES_AI.length];
          aiMsgIdx++;
        }
        ghost.style.height = `${20 + Math.random() * 6}px`;
        ghost.style.width = `${45 + Math.random() * 40}%`;
      } else {
        ghost.className = `ghost-bubble ghost-bubble--active ${sideClass}`;
        ghost.style.width = `${30 + Math.random() * 55}%`;
        ghost.style.height = `${12 + Math.random() * 6}px`;
      }

      chatMessages.appendChild(ghost);
      bubbleCount++;
    }

    await new Promise(resolve => {
      const startTime = performance.now();

      function tick(now) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = cascadeEasing(t);

        // Create any missing bubbles (they pop in via CSS ghostAppear)
        const targetCount = Math.min(totalBubbles, Math.ceil(eased * totalBubbles));
        while (bubbleCount < targetCount) {
          createBubble();
        }

        // Estimate total content height from bubble count — NO scrollHeight read.
        // This avoids the forced synchronous layout that caused the original jank.
        const estimatedH = initialContentH + bubbleCount * avgBubbleH;
        const scrollTarget = Math.max(0, estimatedH - viewportH);
        editorMain.scrollTop = scrollTarget;

        // Fade the footer at ~25% — reveals bubbles that were behind it
        if (!footerFaded && eased > 0.25) {
          footerFaded = true;
          footer.style.opacity = '0';
          footer.style.pointerEvents = 'none';
        }

        if (t < 1) {
          requestAnimationFrame(tick);
        } else {
          // Remove the footer entirely now that it's invisible
          footer.style.display = 'none';
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  }

  // ============================================
  // Phase 9: Blur messages, then show gradient
  // ============================================
  async function compressAndBlur() {
    // Step 1: Blur the messages (transition was pre-set via blur-ready class)
    chatMessages.style.filter = '';  // remove micro-blur so transition starts clean
    chatMessages.classList.add('chat-messages--blurred');

    // Wait for the 0.8s blur+opacity CSS transition to fully complete
    await wait(900);

    // Step 2: Fade in the gradient overlay
    const backdrop = document.createElement('div');
    backdrop.className = 'stat-backdrop';
    editorMain.appendChild(backdrop);

    await wait(50); // let browser paint the element at opacity 0
    backdrop.classList.add('stat-backdrop--visible');

    // Wait for the 0.6s opacity transition to complete
    await wait(700);
  }

  // ============================================
  // Phase 10: Hero stat — 20,000 messages
  // ============================================
  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  function animateCounter(el, target, duration = 1500, from = 0) {
    return new Promise(resolve => {
      const startTime = performance.now();
      const range = target - from;
      function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(from + eased * range);
        el.textContent = formatNumber(value);
        if (progress < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = formatNumber(target);
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  async function showHeroStat() {
    // chatMessages stays as the colorful backdrop (absolutely positioned)
    // stat display will also be absolutely centered on top

    // Build the stat display (sits on top via z-index)
    const statDisplay = document.createElement('div');
    statDisplay.className = 'stat-display';

    // Ambient glow behind the number
    const glow = document.createElement('div');
    glow.className = 'stat-hero__glow';

    // Hero number
    const heroNum = document.createElement('div');
    heroNum.className = 'stat-hero__number';
    heroNum.textContent = '0';

    // Label
    const heroLabel = document.createElement('div');
    heroLabel.className = 'stat-hero__label';
    heroLabel.textContent = 'messages in 2025';

    // Split
    const split = document.createElement('div');
    split.className = 'stat-split';

    // You
    const youItem = document.createElement('div');
    youItem.className = 'stat-split__item';
    const youNum = document.createElement('div');
    youNum.className = 'stat-split__number stat-split__number--user';
    youNum.textContent = '0';
    const youLabel = document.createElement('div');
    youLabel.className = 'stat-split__label';
    youLabel.textContent = 'You';
    youItem.appendChild(youNum);
    youItem.appendChild(youLabel);

    // Dot
    const dot = document.createElement('div');
    dot.className = 'stat-split__dot';

    // ChatGPT
    const aiItem = document.createElement('div');
    aiItem.className = 'stat-split__item';
    const aiNum = document.createElement('div');
    aiNum.className = 'stat-split__number stat-split__number--ai';
    aiNum.textContent = '0';
    const aiLabel = document.createElement('div');
    aiLabel.className = 'stat-split__label';
    aiLabel.textContent = 'ChatGPT';
    aiItem.appendChild(aiNum);
    aiItem.appendChild(aiLabel);

    split.appendChild(youItem);
    split.appendChild(dot);
    split.appendChild(aiItem);

    statDisplay.appendChild(glow);
    statDisplay.appendChild(heroNum);
    statDisplay.appendChild(heroLabel);
    statDisplay.appendChild(split);
    editorMain.appendChild(statDisplay);

    // Reveal the stat display + glow
    await wait(100);
    statDisplay.classList.add('stat-display--visible');
    glow.classList.add('stat-hero__glow--visible');

    // Wait for the 0.7s stat reveal animation to fully complete so the
    // stat is fully opaque before we switch chatMessages to absolute.
    await wait(800);

    // NOW switch chatMessages to absolute backdrop mode.
    // The stat + gradient + blur fully cover the bubbles, so the
    // position change is invisible. Doing this earlier causes a visible
    // jump because the gradient edges are semi-transparent.
    chatMessages.classList.add('chat-messages--backdrop');
    chatMessages.classList.add('chat-messages--drifting');

    // Count up hero number
    await animateCounter(heroNum, 20000, 1800);

    // Show the label
    await wait(200);
    heroLabel.classList.add('stat-hero__label--visible');
    await wait(500);

    // Show the split and count both
    split.classList.add('stat-split--visible');
    await wait(100);
    await Promise.all([
      animateCounter(youNum, 8000, 1200),
      animateCounter(aiNum, 12000, 1200),
    ]);

    // Hold for a moment before transitioning
    await wait(2500);
  }

  // ============================================
  // Phase 10b: Morph stat → conversations count
  // The hero number counts down from 20,000 to 847,
  // the label cross-fades, split stats fade out.
  // ============================================
  async function morphToConversations() {
    const heroNum   = document.querySelector('.stat-hero__number');
    const heroLabel = document.querySelector('.stat-hero__label');
    const split     = document.querySelector('.stat-split');
    const glow      = document.querySelector('.stat-hero__glow');

    if (!heroNum || !heroLabel) return;

    // --- Step 1: Fade out the You / ChatGPT split ---
    // Remove the animation class so inline styles take effect,
    // then pin current values before transitioning.
    if (split) {
      split.classList.remove('stat-split--visible');
      split.style.opacity = '1';
      split.style.transform = 'translateY(0)';
      split.offsetHeight; // reflow

      split.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      split.style.opacity = '0';
      split.style.transform = 'translateY(8px)';
    }
    await wait(400);

    // --- Step 2: Count down hero number  20,000 → 847 ---
    // Use a faster ease-in so the big digits spin quickly, then
    // settle on the smaller number.
    await animateCounter(heroNum, 847, 1200, 20000);

    // --- Step 3: Cross-fade the label ---
    // Remove animation class so we can control opacity with inline styles
    heroLabel.classList.remove('stat-hero__label--visible');
    heroLabel.style.opacity = '1';
    heroLabel.offsetHeight; // reflow

    heroLabel.style.transition = 'opacity 0.3s ease';
    heroLabel.style.opacity = '0';
    await wait(300);

    // Swap text and fade in
    heroLabel.textContent = 'conversations in 2025';
    heroLabel.style.transition = 'opacity 0.4s ease';
    heroLabel.style.opacity = '1';
    await wait(400);

    // --- Step 4: Subtle glow color shift (optional flourish) ---
    if (glow) {
      glow.style.transition = 'background 1s ease';
      glow.style.background = `radial-gradient(
        ellipse at center,
        rgba(96, 165, 250, 0.22) 0%,
        rgba(192, 132, 252, 0.14) 40%,
        transparent 70%
      )`;
    }

    // Hold on the conversations number
    await wait(2500);
  }

  // ============================================
  // Phase 11+12: Transition from stat → sidebar
  // Scroll-up effect (content slides down as if
  // being left behind), cursor moves to sidebar
  // button — all in one fluid motion.
  // ============================================
  async function transitionToSidebar() {
    const statDisplay = document.querySelector('.stat-display');
    const glow = document.querySelector('.stat-hero__glow');
    const backdrop = document.querySelector('.stat-backdrop');
    const sidebarBtn = document.querySelector('.editor__sidebar-btn');

    // --- Step 1: Begin the "scroll up" by sliding content downward ---
    // The stat and backdrop messages drift downward as if the viewport
    // is panning up, leaving them behind.

    // Kill the glow
    if (glow) {
      glow.classList.remove('stat-hero__glow--visible');
    }

    // Stat: remove the reveal animation so inline styles take effect,
    // pin the current visual state, then slide it down
    if (statDisplay) {
      statDisplay.classList.remove('stat-display--visible');
      statDisplay.style.opacity = '1';
      statDisplay.style.transform = 'translate(-50%, -50%) scale(1)';
      statDisplay.offsetHeight; // reflow — lock the starting position

      statDisplay.style.transition =
        'transform 2.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 2.5s ease';
      statDisplay.style.transform = 'translate(-50%, 80%) scale(0.92)';
      statDisplay.style.opacity = '0';
    }

    // Backdrop gradient overlay fades slowly
    if (backdrop) {
      backdrop.style.transition = 'opacity 2s ease';
      backdrop.style.opacity = '0';
    }

    // Messages: stop the drift animation, pin position, slide down.
    // The opacity fade is DELAYED so the bubbles stay visible while
    // the stat slides away and the cursor begins moving.
    if (chatMessages) {
      chatMessages.classList.remove('chat-messages--drifting');
      chatMessages.style.transform = 'translateX(-50%) translateY(0)';
      chatMessages.offsetHeight; // reflow

      // Slide down immediately (parallax "left behind" effect)
      chatMessages.style.transition =
        'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)';
      chatMessages.style.transform = 'translateX(-50%) translateY(70%)';

      // Delay the fade — start it 1.6s later, over 2s
      setTimeout(() => {
        if (chatMessages) {
          chatMessages.style.transition =
            'transform 2.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 2s ease';
          chatMessages.style.opacity = '0';
        }
      }, 1600);
    }

    // --- Step 2: After scroll-up is clearly visible, bring in the cursor ---
    await wait(900);

    // Cursor appears from center area
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${window.innerWidth * 0.45}px`;
    fakeCursor.style.top = `${window.innerHeight * 0.4}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(120); // brief moment so cursor registers visually

    // Animate cursor toward the sidebar button (top-left)
    const btnRect = sidebarBtn.getBoundingClientRect();
    fakeCursor.style.transition =
      'left 1.1s cubic-bezier(0.4, 0, 0.15, 1), top 1.1s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top  = `${btnRect.top  + btnRect.height / 2 - 3}px`;

    await wait(1200); // wait for cursor to arrive

    // --- Step 3: Click the sidebar button ---
    sidebarBtn.style.transition = 'transform 0.1s ease, background 0.1s ease';
    sidebarBtn.style.transform = 'scale(0.85)';
    sidebarBtn.style.background = 'rgba(255, 255, 255, 0.1)';
    await wait(120);

    // Release
    sidebarBtn.style.transform = 'scale(1)';
    sidebarBtn.style.background = 'transparent';
    await wait(150);

    // Hide cursor
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(200);

    // --- Step 4: Deferred cleanup ---
    // Don't rip elements out immediately — let them finish fading
    // while the sidebar begins opening.
    if (statDisplay) statDisplay.remove();
    if (backdrop) backdrop.remove();
    // chatMessages stays in the DOM and is cleaned up after sidebar opens
  }

  // ============================================
  // Phase 13: Open sidebar with conversation list
  // ============================================

  // Topic color palette for the grouping animation
  const TOPIC_COLORS = {
    coding:    { bg: 'rgba(192, 132, 252, 0.25)', text: '#c084fc', label: 'Coding' },
    writing:   { bg: 'rgba(251, 146, 60, 0.25)',  text: '#fb923c', label: 'Writing' },
    learning:  { bg: 'rgba(96, 165, 250, 0.25)',  text: '#60a5fa', label: 'Learning' },
    career:    { bg: 'rgba(52, 211, 153, 0.25)',   text: '#34d399', label: 'Career' },
    lifestyle: { bg: 'rgba(244, 114, 182, 0.25)', text: '#f472b6', label: 'Lifestyle' },
  };

  // Message counts per category — placeholder; swap in real values later
  const CATEGORY_MESSAGES = {
    coding:    847,
    writing:   412,
    learning:  634,
    career:    289,
    lifestyle: 523,
  };

  // Specific topics (drill-down from categories) — placeholder data; swap in real values later
  const TOPIC_DETAILS = [
    { name: 'Real-time Systems', messages: 312, color: '#c084fc' },
    { name: 'Start-ups',         messages: 274, color: '#fb923c' },
    { name: 'Cooking',           messages: 198, color: '#34d399' },
    { name: 'Creative Writing',  messages: 156, color: '#60a5fa' },
    { name: 'Fitness & Health',  messages: 103, color: '#f472b6' },
  ];

  const SIDEBAR_CONVERSATIONS = [
    { group: 'Today', items: [
      { title: 'Give me my 2025 ChatGPT Wrapped', active: true, topic: 'lifestyle' },
      { title: 'Debug this React hook', topic: 'coding' },
      { title: 'Fix my CSS grid layout', topic: 'coding' },
    ]},
    { group: 'Yesterday', items: [
      { title: 'Plan a weekend trip to Tokyo', topic: 'lifestyle' },
      { title: 'Write me a poem about rain', topic: 'writing' },
      { title: 'Explain quantum computing', topic: 'learning' },
    ]},
    { group: 'Previous 7 days', items: [
      { title: 'Help me write a cover letter', topic: 'career' },
      { title: 'Create a workout plan', topic: 'lifestyle' },
      { title: 'Summarize this article', topic: 'learning' },
      { title: 'Translate this to Spanish', topic: 'learning' },
      { title: 'What should I cook tonight', topic: 'lifestyle' },
    ]},
  ];

  async function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarList = document.getElementById('sidebar-list');

    // Build the conversation list — store topic data on each item
    const allItems = [];
    for (const group of SIDEBAR_CONVERSATIONS) {
      const groupLabel = document.createElement('div');
      groupLabel.className = 'sidebar__group';
      groupLabel.textContent = group.group;
      sidebarList.appendChild(groupLabel);

      for (const conv of group.items) {
        const item = document.createElement('div');
        item.className = 'sidebar__item';
        if (conv.active) item.classList.add('sidebar__item--active');
        item.textContent = conv.title;
        item.dataset.topic = conv.topic;
        sidebarList.appendChild(item);
        allItems.push(item);
      }
    }

    // Slide the sidebar open
    sidebar.classList.add('editor__sidebar--open');
    editor.classList.add('editor--sidebar-open');
    await wait(300);

    // Stagger the conversation items in
    for (let i = 0; i < allItems.length; i++) {
      allItems[i].classList.add('sidebar__item--entering');
      await wait(40);
    }

    // Clean up the old backdrop messages now that the sidebar is the focus
    if (chatMessages) {
      chatMessages.remove();
      chatMessages = null;
    }

    // Hold so user can read the sidebar
    await wait(1200);

    return allItems;
  }

  // ============================================
  // Phase 14: Group conversations into topics
  // Sidebar stays visible; clones are "pulled out"
  // one-by-one like dealing cards, then organized
  // by topic. Sidebar closes afterward.
  // ============================================
  async function groupConversations(sidebarItems) {
    const sidebar = document.getElementById('sidebar');
    const allClones = [];       // { clone, topic }
    const allLabels = [];       // topic column label elements

    // --- Step 1: Color-highlight sidebar items by topic ---
    for (let i = 0; i < sidebarItems.length; i++) {
      const item = sidebarItems[i];
      const topic = item.dataset.topic;
      const color = TOPIC_COLORS[topic];
      if (color) {
        item.style.transition = 'border-left 0.25s ease, background 0.25s ease';
        item.style.borderLeft = `3px solid ${color.text}`;
        item.style.background = color.bg;
      }
      await wait(70);
    }

    // Hold so user can see the color grouping
    await wait(1000);

    // --- Pre-compute topic layout ---
    const topicCounts = {};
    for (const item of sidebarItems) {
      const t = item.dataset.topic;
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
    const rankedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([topic], i) => ({ topic, rank: i + 1 }));

    // Compute target columns inside the main area (sidebar still open)
    const mainRect = editorMain.getBoundingClientRect();
    const colPad = 10;
    const usableWidth = mainRect.width - colPad * 2;
    const colWidth = usableWidth / rankedTopics.length;
    const topicTargets = {};
    rankedTopics.forEach((t, i) => {
      topicTargets[t.topic] = {
        centerX: mainRect.left + colPad + colWidth * i + colWidth / 2,
        startY: mainRect.top + 50,   // leave room for column label
        nextSlot: 0,
      };
    });

    // --- Step 2: Pull out clones one-by-one ---
    for (let i = 0; i < sidebarItems.length; i++) {
      const item = sidebarItems[i];
      const topic = item.dataset.topic;
      const color = TOPIC_COLORS[topic];
      const rect = item.getBoundingClientRect();

      // Create floating clone
      const clone = document.createElement('div');
      clone.className = 'topic-clone';
      clone.textContent = item.textContent;
      clone.style.position = 'fixed';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      if (color) {
        clone.style.borderLeft = `3px solid ${color.text}`;
        clone.style.background = color.bg;
        clone.style.color = 'rgba(255, 255, 255, 0.85)';
      }
      document.body.appendChild(clone);

      // Collapse the original sidebar item out — looks physically extracted
      item.style.transition = 'opacity 0.25s ease, height 0.25s ease 0.05s, padding 0.25s ease 0.05s, margin 0.25s ease 0.05s';
      item.style.opacity = '0';
      item.style.height = '0';
      item.style.padding = '0';
      item.style.margin = '0';
      item.style.overflow = 'hidden';

      // Force reflow so the clone starts at its sidebar position
      clone.offsetHeight;

      // Fly clone to its target column in the main area
      const target = topicTargets[topic];
      const targetX = target.centerX - (colWidth - 16) / 2;
      const targetY = target.startY + 24 + target.nextSlot * 30;
      target.nextSlot++;

      clone.style.transition = 'left 0.7s cubic-bezier(0.4, 0, 0.15, 1), top 0.7s cubic-bezier(0.4, 0, 0.15, 1), width 0.7s ease, height 0.7s ease';
      clone.style.left = `${targetX}px`;
      clone.style.top = `${targetY}px`;
      clone.style.width = `${colWidth - 16}px`;
      clone.style.height = '24px';

      allClones.push({ clone, topic });

      // Stagger — like dealing cards
      await wait(120);
    }

    // Wait for the last clone's flight to finish
    await wait(600);

    // --- Step 3: Topic column labels ---
    for (const rt of rankedTopics) {
      const color = TOPIC_COLORS[rt.topic];
      const target = topicTargets[rt.topic];
      const lbl = document.createElement('div');
      lbl.className = 'topic-column-label';
      lbl.textContent = color.label;
      lbl.style.position = 'fixed';
      lbl.style.left = `${target.centerX - (colWidth - 16) / 2}px`;
      lbl.style.top = `${target.startY}px`;
      lbl.style.width = `${colWidth - 16}px`;
      lbl.style.color = color.text;
      document.body.appendChild(lbl);
      allLabels.push(lbl);

      // Stagger label appearances
      await wait(80);
      lbl.classList.add('topic-column-label--visible');
    }

    // Hold so user can read the grouped view
    await wait(1200);

    // --- Step 4: Close the sidebar ---
    sidebar.classList.remove('editor__sidebar--open');
    editor.classList.remove('editor--sidebar-open');
    await wait(600);

    // --- Step 5: Re-center clones after sidebar closes ---
    const newMainRect = editorMain.getBoundingClientRect();
    const newUsable = newMainRect.width - colPad * 2;
    const newColWidth = newUsable / rankedTopics.length;

    // Recalculate target positions for full-width layout
    const newTargets = {};
    rankedTopics.forEach((t, i) => {
      newTargets[t.topic] = {
        centerX: newMainRect.left + colPad + newColWidth * i + newColWidth / 2,
        startY: newMainRect.top + 50,
        nextSlot: 0,
      };
    });

    // Slide clones and labels to new centered positions
    for (const { clone, topic } of allClones) {
      const nt = newTargets[topic];
      const nx = nt.centerX - (newColWidth - 16) / 2;
      const ny = nt.startY + 24 + nt.nextSlot * 30;
      nt.nextSlot++;

      clone.style.transition = 'left 0.5s cubic-bezier(0.4, 0, 0.15, 1), top 0.5s ease, width 0.5s ease';
      clone.style.left = `${nx}px`;
      clone.style.top = `${ny}px`;
      clone.style.width = `${newColWidth - 16}px`;
    }
    // Slide labels too
    rankedTopics.forEach((rt, i) => {
      const nt = newTargets[rt.topic];
      const lbl = allLabels[i];
      lbl.style.transition = 'left 0.5s cubic-bezier(0.4, 0, 0.15, 1), width 0.5s ease';
      lbl.style.left = `${nt.centerX - (newColWidth - 16) / 2}px`;
      lbl.style.width = `${newColWidth - 16}px`;
    });

    await wait(600);

    // --- Step 6a: Merge clones into one bar per topic ---
    // For each topic, collapse all its clones to the same Y position,
    // shrink height, and hide text — so they overlap into one thick bar.
    const maxCount = Math.max(...Object.values(topicCounts));

    // Group clones by topic
    const clonesByTopic = {};
    for (const { clone, topic } of allClones) {
      if (!clonesByTopic[topic]) clonesByTopic[topic] = [];
      clonesByTopic[topic].push(clone);
    }

    // Fade out column labels simultaneously
    for (const lbl of allLabels) {
      lbl.style.transition = 'opacity 0.4s ease';
      lbl.style.opacity = '0';
    }

    // For each topic, compress all clones to the first clone's position
    for (const rt of rankedTopics) {
      const clones = clonesByTopic[rt.topic];
      if (!clones || clones.length === 0) continue;
      const color = TOPIC_COLORS[rt.topic];

      // Target: first clone's left/top position
      const firstRect = clones[0].getBoundingClientRect();
      const mergeY = firstRect.top;
      const mergeX = firstRect.left;
      const mergeW = parseFloat(clones[0].style.width);

      for (const c of clones) {
        c.style.transition = 'top 0.5s cubic-bezier(0.4, 0, 0.15, 1), height 0.5s ease, font-size 0.3s ease, padding 0.3s ease, border-radius 0.3s ease, background 0.3s ease, border-left 0.3s ease';
        c.style.top = `${mergeY}px`;
        c.style.height = '8px';
        c.style.fontSize = '0px';
        c.style.padding = '0';
        c.style.overflow = 'hidden';
        c.style.borderRadius = '4px';
        c.style.borderLeft = 'none';
        c.style.background = color ? color.text : 'rgba(255,255,255,0.2)';
      }
    }

    await wait(600);

    // Remove all but one clone per topic (keep the first as the "bar")
    const topicBars = []; // { bar (DOM element), topic, rank }
    for (const rt of rankedTopics) {
      const clones = clonesByTopic[rt.topic];
      if (!clones) continue;
      const bar = clones[0];
      // Remove extra clones
      for (let j = 1; j < clones.length; j++) {
        clones[j].remove();
      }
      topicBars.push({ bar, topic: rt.topic, rank: rt.rank });
    }

    // Clean up labels
    for (const lbl of allLabels) lbl.remove();

    await wait(200);

    // --- Step 6b: Reposition bars into centered vertical chart ---
    const chartRect = editorMain.getBoundingClientRect();
    const chartLeft = chartRect.left + chartRect.width * 0.15; // 15% left margin
    const chartMaxWidth = chartRect.width * 0.7;               // bars use up to 70%
    const barHeight = 36;
    const barGap = 78;   // gap between bar rows (room for name above + count below)
    const totalChartHeight = topicBars.length * barHeight + (topicBars.length - 1) * barGap;
    const chartTopY = chartRect.top + (chartRect.height - totalChartHeight) / 2;

    // Move each bar to its chart row, but start at 0 width
    for (let i = 0; i < topicBars.length; i++) {
      const { bar } = topicBars[i];
      const rowY = chartTopY + i * (barHeight + barGap);

      bar.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1), width 0.6s ease, height 0.6s ease, border-radius 0.4s ease';
      bar.style.left = `${chartLeft}px`;
      bar.style.top = `${rowY}px`;
      bar.style.width = '4px'; // starts as a thin line
      bar.style.height = `${barHeight}px`;
      bar.style.borderRadius = '8px';
      bar.style.opacity = '1';
    }

    await wait(700);

    // --- Step 6c: Grow bars proportionally (staggered) ---
    for (let i = 0; i < topicBars.length; i++) {
      const { bar, topic } = topicBars[i];
      const count = topicCounts[topic];
      const barWidth = (count / maxCount) * chartMaxWidth;

      bar.style.transition = 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'; // overshoot easing
      bar.style.width = `${barWidth}px`;

      await wait(300);
    }

    // Wait for the last bar to finish growing
    await wait(500);

    // --- Step 6d: Reveal labels around each bar ---
    // Layout per row: name + rank above bar, message count below bar
    const barLabelEls = [];
    for (let i = 0; i < topicBars.length; i++) {
      const { bar, topic, rank } = topicBars[i];
      const color = TOPIC_COLORS[topic];
      const messages = CATEGORY_MESSAGES[topic] || 0;
      const rowY = chartTopY + i * (barHeight + barGap);

      // Rank + Name — single line above the bar
      const nameEl = document.createElement('div');
      nameEl.className = 'topic-bar__name';
      nameEl.textContent = color.label;
      nameEl.style.position = 'fixed';
      nameEl.style.left = `${chartLeft}px`;
      nameEl.style.top = `${rowY - 28}px`;
      nameEl.style.lineHeight = '1';
      nameEl.style.color = color.text;
      document.body.appendChild(nameEl);
      barLabelEls.push(nameEl);

      const rankEl = document.createElement('div');
      rankEl.className = 'topic-bar__rank';
      rankEl.textContent = `#${rank}`;
      rankEl.style.position = 'fixed';
      rankEl.style.left = `${chartLeft - 30}px`;
      rankEl.style.top = `${rowY - 26}px`;
      document.body.appendChild(rankEl);
      barLabelEls.push(rankEl);

      // Message count — below the bar
      const msgEl = document.createElement('div');
      msgEl.className = 'topic-bar__messages';
      msgEl.textContent = '0 messages';
      msgEl.style.position = 'fixed';
      msgEl.style.left = `${chartLeft}px`;
      msgEl.style.top = `${rowY + barHeight + 4}px`;
      document.body.appendChild(msgEl);
      barLabelEls.push(msgEl);

      // Stagger the label reveal
      await wait(50);
      rankEl.classList.add('topic-bar__rank--visible');
      nameEl.classList.add('topic-bar__name--visible');
      msgEl.classList.add('topic-bar__messages--visible');
      animateCount(msgEl, messages, ' messages', 700);

      await wait(150);
    }

    // --- Step 6e: Subline ---
    await wait(300);
    const subline = document.createElement('div');
    subline.className = 'topic-bar__subline';
    const sublineY = chartTopY + topicBars.length * (barHeight + barGap) + 10;
    subline.textContent = 'Your most talked-about categories in 2025';
    subline.style.position = 'fixed';
    subline.style.left = `${chartRect.left}px`;
    subline.style.width = `${chartRect.width}px`;
    subline.style.top = `${sublineY}px`;
    document.body.appendChild(subline);
    barLabelEls.push(subline);
    await wait(50);
    subline.classList.add('topic-bar__subline--visible');

    // Hold on the category bar chart
    await wait(2000);

    // --- Step 6f: Morph bars from categories → specific topics ---

    // 6f-i: Fade out current labels
    for (const el of barLabelEls) {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '0';
    }
    await wait(350);

    // Remove old labels from DOM (but keep array reference for new ones)
    for (const el of barLabelEls) el.remove();
    barLabelEls.length = 0;

    // 6f-ii: Shrink bars to thin lines
    for (const { bar } of topicBars) {
      bar.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.15, 1)';
      bar.style.width = '4px';
    }
    await wait(500);

    // 6f-iii: Reposition + recolor bars for topic data
    const sortedTopics = [...TOPIC_DETAILS].sort((a, b) => b.messages - a.messages);
    const maxMessages = sortedTopics[0].messages;

    // Recalculate chart layout (may have shifted)
    const topicChartRect = editorMain.getBoundingClientRect();
    const topicChartLeft = topicChartRect.left + topicChartRect.width * 0.15;
    const topicChartMaxWidth = topicChartRect.width * 0.7;
    const topicTotalHeight = sortedTopics.length * barHeight + (sortedTopics.length - 1) * barGap;
    const topicChartTopY = topicChartRect.top + (topicChartRect.height - topicTotalHeight) / 2;

    // Ensure we have enough bars — reuse existing, create extras if needed
    while (topicBars.length < sortedTopics.length) {
      const extraBar = document.createElement('div');
      extraBar.className = 'topic-clone';
      extraBar.style.position = 'fixed';
      extraBar.style.left = `${topicChartLeft}px`;
      extraBar.style.width = '4px';
      extraBar.style.height = `${barHeight}px`;
      extraBar.style.borderRadius = '8px';
      extraBar.style.opacity = '1';
      extraBar.style.fontSize = '0';
      extraBar.style.padding = '0';
      extraBar.style.overflow = 'hidden';
      extraBar.style.borderLeft = 'none';
      document.body.appendChild(extraBar);
      topicBars.push({ bar: extraBar, topic: null, rank: topicBars.length + 1 });
    }

    for (let i = 0; i < sortedTopics.length; i++) {
      const { bar } = topicBars[i];
      const topic = sortedTopics[i];
      const rowY = topicChartTopY + i * (barHeight + barGap);

      bar.style.transition = 'left 0.5s cubic-bezier(0.4, 0, 0.15, 1), top 0.5s cubic-bezier(0.4, 0, 0.15, 1), background 0.5s ease, height 0.5s ease';
      bar.style.left = `${topicChartLeft}px`;
      bar.style.top = `${rowY}px`;
      bar.style.height = `${barHeight}px`;
      bar.style.background = topic.color;
    }
    await wait(550);

    // 6f-iv: Grow bars to new proportional widths (staggered)
    for (let i = 0; i < sortedTopics.length; i++) {
      const { bar } = topicBars[i];
      const topic = sortedTopics[i];
      const barWidth = (topic.messages / maxMessages) * topicChartMaxWidth;

      bar.style.transition = 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
      bar.style.width = `${barWidth}px`;

      await wait(300);
    }

    // Wait for last bar to finish growing
    await wait(500);

    // 6f-v: Reveal new topic labels + message counts
    // Layout per row: rank + name above bar, message count below bar
    for (let i = 0; i < sortedTopics.length; i++) {
      const topic = sortedTopics[i];
      const rowY = topicChartTopY + i * (barHeight + barGap);

      // Name — above the bar
      const nameEl = document.createElement('div');
      nameEl.className = 'topic-bar__name';
      nameEl.textContent = topic.name;
      nameEl.style.position = 'fixed';
      nameEl.style.left = `${topicChartLeft}px`;
      nameEl.style.top = `${rowY - 28}px`;
      nameEl.style.lineHeight = '1';
      nameEl.style.color = topic.color;
      document.body.appendChild(nameEl);
      barLabelEls.push(nameEl);

      // Rank — to the left of the name
      const rankEl = document.createElement('div');
      rankEl.className = 'topic-bar__rank';
      rankEl.textContent = `#${i + 1}`;
      rankEl.style.position = 'fixed';
      rankEl.style.left = `${topicChartLeft - 30}px`;
      rankEl.style.top = `${rowY - 26}px`;
      document.body.appendChild(rankEl);
      barLabelEls.push(rankEl);

      // Message count — below the bar
      const msgEl = document.createElement('div');
      msgEl.className = 'topic-bar__messages';
      msgEl.textContent = '0 messages';
      msgEl.style.position = 'fixed';
      msgEl.style.left = `${topicChartLeft}px`;
      msgEl.style.top = `${rowY + barHeight + 4}px`;
      document.body.appendChild(msgEl);
      barLabelEls.push(msgEl);

      // Stagger the label reveal
      await wait(50);
      rankEl.classList.add('topic-bar__rank--visible');
      nameEl.classList.add('topic-bar__name--visible');
      msgEl.classList.add('topic-bar__messages--visible');
      animateCount(msgEl, topic.messages, ' messages', 700);

      await wait(150);
    }

    // 6f-vi: New subline for topics
    await wait(300);
    const topicSubline = document.createElement('div');
    topicSubline.className = 'topic-bar__subline';
    const topicSublineY = topicChartTopY + sortedTopics.length * (barHeight + barGap) + 10;
    topicSubline.textContent = 'Your most talked-about topics in 2025';
    topicSubline.style.position = 'fixed';
    topicSubline.style.left = `${topicChartRect.left}px`;
    topicSubline.style.width = `${topicChartRect.width}px`;
    topicSubline.style.top = `${topicSublineY}px`;
    document.body.appendChild(topicSubline);
    barLabelEls.push(topicSubline);
    await wait(50);
    topicSubline.classList.add('topic-bar__subline--visible');

    // Hold on the topic bar chart
    await wait(3000);

    // Return references for the next phase to collapse
    return { topicBars, barLabelEls, topicCounts, chartRect: editorMain.getBoundingClientRect() };
  }

  // ============================================
  // Growth insight data
  // ============================================
  const GROWTH_DATA = {
    prompt: 'Show me my growth in real-time systems',
    monthly: [
      { month: 'Jan', value: 40 },
      { month: 'Feb', value: 55 },
      { month: 'Mar', value: 72 },
      { month: 'Apr', value: 90 },
      { month: 'May', value: 108 },
      { month: 'Jun', value: 125 },
      { month: 'Jul', value: 148 },
      { month: 'Aug', value: 180 },
      { month: 'Sep', value: 178 },
      { month: 'Oct', value: 185 },
      { month: 'Nov', value: 190 },
      { month: 'Dec', value: 195 },
    ],
    message: [
      { text: 'You started with ' },
      { text: '40 conversations', cls: 'ai-accent' },
      { text: ' in January. By August you hit ' },
      { text: '180', cls: 'ai-accent--warm' },
      { text: '. You didn\'t just use ChatGPT more — you made it part of how you think. ' },
      { text: '4.5x growth', cls: 'ai-accent' },
      { text: ' in 8 months.' },
    ],
  };

  // ============================================
  // Growth insight phase 2 — follow-up chart
  // The AI morphs the graph into a new view.
  // Set type: 'line' or 'bar' to control which
  // transition plays.
  // ============================================
  const GROWTH_PHASE_2 = {
    type: 'bar',  // 'line' or 'bar'
    title: 'Real-Time Systems — Conversations by Topic',
    message: [
      { text: 'Your questions got ' },
      { text: 'progressively deeper', cls: 'ai-accent' },
      { text: '. Early on you asked setup questions — by Q3 you were designing ' },
      { text: 'distributed architectures', cls: 'ai-accent--warm' },
      { text: ' and debugging ' },
      { text: 'race conditions', cls: 'ai-accent' },
      { text: ' at scale.' },
    ],
    // Used when type === 'line'
    monthly: [
      { month: 'Jan', value: 10 },
      { month: 'Feb', value: 18 },
      { month: 'Mar', value: 32 },
      { month: 'Apr', value: 45 },
      { month: 'May', value: 58 },
      { month: 'Jun', value: 72 },
      { month: 'Jul', value: 95 },
      { month: 'Aug', value: 130 },
      { month: 'Sep', value: 142 },
      { month: 'Oct', value: 160 },
      { month: 'Nov', value: 175 },
      { month: 'Dec', value: 190 },
    ],
    // Used when type === 'bar'
    yLabel: 'conversations',
    categories: [
      { label: 'Architecture', value: 45 },
      { label: 'Pub/Sub', value: 38 },
      { label: 'WebSockets', value: 32 },
      { label: 'Debugging', value: 28 },
      { label: 'Scaling', value: 22 },
      { label: 'Security', value: 15 },
    ],
  };

  // ============================================
  // Phase 15: Collapse bar chart
  // ============================================
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

  // ============================================
  // Phase 16a: Cursor travels to input field
  // ============================================
  async function cursorToInput() {
    // Restore the footer — cascade (Phase 8) hides it via inline styles:
    // position:absolute, display:none, opacity:0, pointerEvents:none, etc.
    // Reset ALL of those so the footer returns to normal document flow.
    const footer = document.querySelector('.editor__footer');
    if (footer && (footer.style.display === 'none' || footer.classList.contains('editor__footer--hidden'))) {
      footer.classList.remove('editor__footer--hidden');
      // Clear every inline style the cascade set
      footer.style.display = '';
      footer.style.position = '';
      footer.style.bottom = '';
      footer.style.left = '';
      footer.style.right = '';
      footer.style.zIndex = '';
      footer.style.pointerEvents = '';
      // Fade it in
      footer.style.opacity = '0';
      footer.offsetHeight;
      footer.style.transition = 'opacity 0.4s ease';
      footer.style.opacity = '1';
      await wait(400);
      footer.style.transition = '';
      footer.style.opacity = '';
    }

    const mainRect = editorMain.getBoundingClientRect();
    const inputRect = inputWrap.getBoundingClientRect();

    // Show fake cursor near chart center (mid-screen)
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${mainRect.left + mainRect.width / 2}px`;
    fakeCursor.style.top = `${mainRect.top + mainRect.height / 2}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(100);

    // Travel down to the input field
    fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${inputRect.left + inputRect.width / 2}px`;
    fakeCursor.style.top = `${inputRect.top + inputRect.height / 2}px`;
    await wait(650);

    // Click effect on input field
    inputWrap.style.transition = 'border-color 0.15s ease';
    inputWrap.style.borderColor = 'rgba(255, 255, 255, 0.25)';
    await wait(150);
    inputWrap.style.borderColor = '';

    // Fade cursor out as text cursor takes over
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(100);

    // Zoom in on input
    placeholder.classList.add('editor__placeholder--hidden');
    editor.classList.add('editor--zoomed');
    inputWrap.classList.add('editor__input-wrap--expanded');
    sendBtn.classList.add('editor__send-btn--active');
    cursor.classList.remove('editor__cursor--hidden');
    await wait(400);
  }

  // ============================================
  // Phase 16b: Type prompt (parameterized)
  // ============================================
  async function typeNewPrompt(text) {
    let typed = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      typed += ch;
      inputText.textContent = typed;

      let delay = jitter(CHAR_MS);
      if (ch === ' ') delay += SPACE_EXTRA;
      await wait(delay);
    }
  }

  // ============================================
  // Phase 16b (cont): Send new message
  // Lighter version — no welcome hide, reuses
  // existing chat container or creates a new one
  // ============================================
  async function sendNewMessage() {
    const messageText = inputText.textContent;

    // Clear input
    inputText.textContent = '';
    placeholder.classList.remove('editor__placeholder--hidden');
    sendBtn.classList.remove('editor__send-btn--active');
    inputWrap.classList.remove('editor__input-wrap--expanded');
    cursor.classList.add('editor__cursor--hidden');

    // Zoom out
    editor.classList.remove('editor--zoomed');
    await wait(400);

    // Ensure we have a chat messages container
    if (!chatMessages) {
      editorMain.style.justifyContent = 'flex-start';
      editorMain.style.alignItems = 'stretch';
      chatMessages = document.createElement('div');
      chatMessages.className = 'chat-messages';
      editorMain.appendChild(chatMessages);
    }

    // Add user bubble
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = messageText;
    chatMessages.appendChild(bubble);

    await wait(50);
    bubble.classList.add('chat-bubble--visible');
    await wait(500);
  }

  // ============================================
  // Phase 17: Growth insight — AI message streams
  // in, iOS-style graph draws, then zoom.
  //
  // Flow: thinking dots → AI message bubble (stays
  // visible) → graph container fades in → line
  // draws with gradient fill → labels appear →
  // zoom (user bubble disappears).
  // ============================================
  async function showGrowthInsight(data) {
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
    chatMessages.appendChild(thinkingContainer);
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
    chatMessages.appendChild(aiResponse);

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
    chatMessages.appendChild(graphWrap);

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

    // --- Step 7: Zoom — camera pushes into the graph ---
    // We combine scale + translateY in ONE transform so the graph
    // simultaneously zooms in AND slides to vertical centre.  With
    // transform-origin: center center and the transform order
    //   scale(S) translateY(N)          (CSS applies right-to-left)
    // a point at offset d from centre ends up at (d + N) * S.
    // Setting N = -d puts the combo at the origin before scaling,
    // so it stays dead-centre as the zoom lands.

    const userBubbles = chatMessages.querySelectorAll('.chat-bubble');
    const userBubble = userBubbles.length ? userBubbles[userBubbles.length - 1] : null;

    const editorMainEl = document.querySelector('.editor__main');

    // Scroll so the graph combo is roughly in view before we measure
    if (editorMainEl) {
      const msgTop = aiResponse.offsetTop;
      const graphBottom = graphWrap.offsetTop + graphWrap.offsetHeight;
      const comboH = graphBottom - msgTop;
      const viewH = editorMainEl.clientHeight;
      const scrollTarget = msgTop - (viewH - comboH) / 2;
      editorMainEl.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
      await wait(400);

      // Lock scroll so transform math stays stable
      editorMainEl.style.overflow = 'hidden';
    }

    // Measure where the combo (AI msg + graph) sits relative to editor centre
    const editorRect = editor.getBoundingClientRect();
    const aiRect     = aiResponse.getBoundingClientRect();
    const graphRect  = graphWrap.getBoundingClientRect();

    const comboCenterY = ((aiRect.top + graphRect.bottom) / 2) - editorRect.top;
    const editorCenterY = editorRect.height / 2;
    // Positive = combo is below centre, need to shift up (negative translate)
    const translateY = editorCenterY - comboCenterY;

    // Use center center so scale works symmetrically
    editor.style.transformOrigin = 'center center';

    // Fade out header, footer, and user's bubble — fires simultaneously with zoom
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

    // Apply combined zoom + recentre as one transform — the existing 0.9s
    // cubic-bezier transition on .editor animates both simultaneously,
    // giving a smooth "camera dolly-in" effect.
    editor.style.transform = `scale(1.3) translateY(${translateY}px)`;

    // Wait for the transition to finish (0.9s + small buffer)
    await wait(1000);

    // Hold — let user take in the full zoomed picture
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

  // ============================================
  // Phase 18a: Unwrite AI text — word-by-word
  // in reverse (last word disappears first)
  // ============================================
  async function unwriteText(textContainer, streamCursor) {
    // Show the stream cursor again so it looks like the AI is editing
    streamCursor.classList.remove('chat-ai-response__cursor--hidden');

    // Flatten every child of textContainer into an ordered list of
    // { node, text } entries where node is either a TextNode or <span>.
    // We'll trim words off the END of each node in reverse order.
    const nodes = Array.from(textContainer.childNodes);
    // Walk the list backwards
    for (let n = nodes.length - 1; n >= 0; n--) {
      const node = nodes[n];
      const isSpan = node.nodeType === Node.ELEMENT_NODE;
      const textNode = isSpan ? node.firstChild : node;
      if (!textNode || !textNode.textContent) {
        if (isSpan) node.remove();
        else node.remove();
        continue;
      }

      // Split into words (preserve whitespace tokens for faithful removal)
      let content = textNode.textContent;
      while (content.length > 0) {
        // Trim trailing whitespace first
        const trimmed = content.replace(/\s+$/, '');
        if (trimmed.length < content.length) {
          content = trimmed;
          textNode.textContent = content;
        }
        if (content.length === 0) break;

        // Find last word boundary
        const lastSpace = content.lastIndexOf(' ');
        if (lastSpace === -1) {
          // Last remaining word — remove it
          content = '';
          textNode.textContent = content;
        } else {
          content = content.substring(0, lastSpace);
          textNode.textContent = content;
        }
        await wait(jitter(40, 10));
      }

      // If the node is now empty, remove it from the DOM
      if (isSpan) node.remove();
      else node.remove();
    }

    // Ensure the container is fully empty
    textContainer.textContent = '';
  }

  // ============================================
  // Phase 18b: Re-stream new AI text — word-by-
  // word forward (same style as original stream)
  // ============================================
  async function restreamText(textContainer, streamCursor, messageParts) {
    // Cursor should already be visible from unwriteText
    streamCursor.classList.remove('chat-ai-response__cursor--hidden');

    for (const part of messageParts) {
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
          await wait(jitter(55, 15));
        }
      }
    }

    streamCursor.classList.add('chat-ai-response__cursor--hidden');
  }

  // ============================================
  // Shared helpers for graph building
  // ============================================

  /** Build a Catmull-Rom spline path string from an array of {x,y} points */
  function buildCatmullRomPath(pts) {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  /** Cubic-bezier ease-in-out approximation (0.4, 0, 0.15, 1) */
  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // ============================================
  // Phase 19a: Morph line graph → new line graph
  // via JS point interpolation (rAF tween)
  // ============================================
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
    // Fade title
    titleEl.style.transition = 'opacity 0.25s ease';
    titleEl.style.opacity = '0';
    await wait(300);

    // Remove old labels from DOM
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
    // Create a temporary hidden path to sample
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
    // Clear dash animation from the initial draw
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

        // Rebuild Catmull-Rom from interpolated points
        const lineD = buildCatmullRomPath(pts);
        const lastP = pts[pts.length - 1];
        const firstP = pts[0];
        const areaD = lineD + ` L ${lastP.x} ${chartBottom} L ${firstP.x} ${chartBottom} Z`;

        linePath.setAttribute('d', lineD);
        areaPath.setAttribute('d', areaD);

        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });

    // --- Step 5: Update gridlines ---
    // Remove old gridlines
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

  // ============================================
  // Phase 19b: Morph line graph → bar graph
  // Line reverse-draws, SVG removed, HTML bars
  // stagger-grow inside the same container.
  // ============================================
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

    // --- Step 2: Reverse-draw the line (stroke-dashoffset back to full) ---
    const pathLen = linePath.getTotalLength();
    linePath.style.strokeDasharray = pathLen;
    linePath.style.strokeDashoffset = '0';
    svg.getBoundingClientRect(); // reflow
    linePath.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    linePath.style.strokeDashoffset = String(pathLen);
    areaPath.style.transition = 'opacity 0.6s ease';
    areaPath.style.opacity = '0';
    await wait(850);

    // --- Step 3: Remove SVG + update title (no gap) ---
    svg.remove();
    titleEl.textContent = barData.title;
    titleEl.style.transition = 'opacity 0.35s ease';
    titleEl.style.opacity = '1';

    // --- Step 5: Build bar chart (HTML divs) ---
    const categories = barData.categories;
    const maxVal = Math.max(...categories.map(c => c.value));
    const barChartPadTop = 36;
    const barChartPadBottom = 28;
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

    // --- Step 7: Fade in labels + values together (overlaps with bar grow finishing) ---
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

  // ============================================
  // Phase 19: Orchestrator — sequences the full
  // unwrite → morph → restream transition
  // ============================================
  async function transitionToNextChart(refs, nextData) {
    const { aiResponse, textContainer, streamCursor } = refs;

    // Phase A: Un-animate the bubble first
    aiResponse.classList.remove('chat-ai-response--wrapped');
    await wait(300);  // let bubble start collapsing visually before text moves

    // Phase B: Unwrite the old text — graph morph will start overlapping the tail end
    const unwritePromise = unwriteText(textContainer, streamCursor);

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
    await restreamText(textContainer, streamCursor, nextData.message);

    // Phase D: Then animate the bubble around the finished text
    await wait(150);
    aiResponse.classList.add('chat-ai-response--wrapped');
  }

  // ============================================
  // Phase 20: Deconstruct bar chart → rolling square
  // ============================================

  /**
   * Roll a square element from its current left position to targetX.
   * The square flips side-to-side: each step pivots 90° on the leading
   * bottom corner, then we snap-reposition and repeat. No new elements
   * are created — the same DOM node rolls the whole way.
   *
   * @param {HTMLElement} el       – the absolutely-positioned square
   * @param {number}      size     – side length in px
   * @param {number}      targetX  – destination `left` in px
   */
  async function rollSquareToCenter(el, size, targetX) {
    let currentX = parseFloat(el.style.left);
    const distance = targetX - currentX;
    if (Math.abs(distance) < 2) return;

    const direction = distance > 0 ? 1 : -1;
    const steps = Math.max(1, Math.round(Math.abs(distance) / size));
    const stepDist = distance / steps;

    const baseDuration = 300;

    for (let s = 0; s < steps; s++) {
      const progress = s / steps;
      const stepDuration = Math.round(baseDuration * (1 - progress * 0.4));

      // Pivot on the leading bottom corner
      if (direction > 0) {
        el.style.transformOrigin = `${size}px ${size}px`;
      } else {
        el.style.transformOrigin = `0px ${size}px`;
      }

      // Flip 90°
      el.style.transition = `transform ${stepDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
      el.style.transform = `rotate(${90 * direction}deg)`;

      await wait(stepDuration + 10);

      // Snap: reposition and clear rotation so next step starts fresh
      currentX += stepDist;
      el.style.transition = 'none';
      el.style.transform = 'rotate(0deg)';
      el.style.left = `${currentX}px`;

      // Force reflow so the snap takes before next step
      el.offsetHeight;
    }
  }

  async function deconstructBarChart(refs) {
    const {
      aiResponse, textContainer, streamCursor,
      graphContainer, graphWrap,
    } = refs;

    // Grab live DOM elements inside the graph
    const titleEl = graphContainer.querySelector('.line-graph__title');
    const barChart = graphContainer.querySelector('.insight-bar-chart');
    const barCols = barChart ? Array.from(barChart.querySelectorAll('.insight-bar-col')) : [];
    const barEls = barChart ? Array.from(barChart.querySelectorAll('.insight-bar')) : [];
    const valueEls = barChart ? Array.from(barChart.querySelectorAll('.insight-bar__value')) : [];
    const labelEls = barChart ? Array.from(barChart.querySelectorAll('.insight-bar__label')) : [];

    // -------------------------------------------------------
    // Wave 1: Text + bubble removal (~800ms)
    // -------------------------------------------------------

    // Unbubble the AI response
    aiResponse.classList.remove('chat-ai-response--wrapped');

    // Fade out the text container
    textContainer.style.transition = 'opacity 0.4s ease, max-height 0.6s ease';
    textContainer.style.opacity = '0';
    setTimeout(() => {
      textContainer.style.maxHeight = '0';
      textContainer.style.overflow = 'hidden';
    }, 250);

    // Hide the stream cursor
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    // Fade the insight-bubble background to transparent
    graphWrap.style.transition = 'background 0.6s ease, box-shadow 0.6s ease, padding 0.6s ease, gap 0.6s ease';
    graphWrap.style.background = 'transparent';
    graphWrap.style.boxShadow = 'none';

    await wait(500);

    // Collapse padding now that text is gone
    graphWrap.style.padding = '0';
    graphWrap.style.gap = '0';

    await wait(300);

    // -------------------------------------------------------
    // Wave 2: Zoom tighter onto the graph (~900ms)
    // -------------------------------------------------------

    const targetScale = 2.2;

    // Temporarily strip the transform so we can measure the graph's
    // true LOCAL position inside the editor (no scale distortion).
    const savedTransform = editor.style.transform;
    const savedTransition = editor.style.transition;
    editor.style.transition = 'none';
    editor.style.transform = 'none';
    editor.offsetHeight; // force reflow

    const editorRect = editor.getBoundingClientRect();
    const graphRect = graphContainer.getBoundingClientRect();

    const graphCenterY = (graphRect.top + graphRect.bottom) / 2 - editorRect.top;
    const editorCenterY = editorRect.height / 2;
    const translateY = editorCenterY - graphCenterY;

    // Restore the old transform instantly, then animate to the new one
    editor.style.transform = savedTransform;
    editor.offsetHeight; // force reflow so browser sees the old state

    editor.style.transition = 'transform 0.9s cubic-bezier(0.4, 0, 0.2, 1)';
    editor.style.transform = `scale(${targetScale}) translateY(${translateY}px)`;

    await wait(1000);

    // -------------------------------------------------------
    // Wave 3: Parallel bar chart deconstruction (~1200ms)
    // -------------------------------------------------------

    // All these fire concurrently via Promise.all
    const wave3 = [];

    // 3a: Title unwrite (word-by-word reverse)
    wave3.push((async () => {
      if (!titleEl) return;
      let text = titleEl.textContent;
      while (text.length > 0) {
        const lastSpace = text.lastIndexOf(' ');
        if (lastSpace === -1) {
          text = '';
        } else {
          text = text.substring(0, lastSpace);
        }
        titleEl.textContent = text;
        await wait(jitter(50, 15));
      }
      titleEl.style.transition = 'opacity 0.2s ease';
      titleEl.style.opacity = '0';
    })());

    // 3b: Fade out value labels
    wave3.push((async () => {
      for (const v of valueEls) {
        v.style.transition = 'opacity 0.3s ease';
        v.style.opacity = '0';
      }
      await wait(350);
    })());

    // 3c: Fade out category labels
    wave3.push((async () => {
      for (const l of labelEls) {
        l.style.transition = 'opacity 0.3s ease';
        l.style.opacity = '0';
      }
      await wait(350);
    })());

    // 3d: Fade green background + border
    wave3.push((async () => {
      graphContainer.style.transition = 'background 0.5s ease, border-color 0.5s ease';
      graphContainer.style.background = 'transparent';
      graphContainer.style.borderColor = 'transparent';
      await wait(550);
    })());

    // -------------------------------------------------------
    // 3e + 3f: Place overlay on first bar WHILE chart is stable,
    //          then collapse all bars underneath it.
    //
    // Because the editor has a CSS scale transform, getBoundingClientRect
    // returns screen pixels.  We need LOCAL coordinates for positioning
    // inside graphContainer.  Dividing screen deltas by the scale factor
    // converts them to local px.
    // -------------------------------------------------------

    // Derive the current scale from the editor transform
    const gcScreenRect = graphContainer.getBoundingClientRect();
    const localW = graphContainer.offsetWidth;
    const scale = gcScreenRect.width / localW;

    // Measure first bar in screen coords, convert to local
    const fbScreen = barEls[0].getBoundingClientRect();
    const localBarLeft   = (fbScreen.left   - gcScreenRect.left) / scale;
    const localBarTop    = (fbScreen.top    - gcScreenRect.top)  / scale;
    const localBarWidth  = fbScreen.width  / scale;
    const localBarHeight = fbScreen.height / scale;

    // Create the overlay — same colour, same size, sits right on top
    const overlay = document.createElement('div');
    overlay.style.position    = 'absolute';
    overlay.style.left        = `${localBarLeft}px`;
    overlay.style.top         = `${localBarTop}px`;
    overlay.style.width       = `${localBarWidth}px`;
    overlay.style.height      = `${localBarHeight}px`;
    overlay.style.background  = 'rgba(16, 185, 129, 0.85)';
    overlay.style.borderRadius = '6px 6px 2px 2px';
    overlay.style.zIndex      = '10';
    overlay.style.pointerEvents = 'none';
    graphContainer.appendChild(overlay);

    // Now collapse ALL bars (including the first) — overlay covers the gap
    wave3.push((async () => {
      for (let i = barEls.length - 1; i >= 0; i--) {
        barEls[i].style.transition = 'height 0.4s cubic-bezier(0.4, 0, 0.15, 1), opacity 0.35s ease';
        barEls[i].style.height = '0px';
        barEls[i].style.opacity = '0';
        await wait(80);
      }
      await wait(450);
      // Remove the entire bar chart from the DOM
      barChart.remove();
    })());

    await Promise.all(wave3);
    await wait(200);

    // -------------------------------------------------------
    // Wave 4: Overlay shrinks to a perfect square (on the left)
    // -------------------------------------------------------

    graphContainer.style.overflow = 'visible';

    const squareSize = 36;
    const bottomEdge = localBarTop + localBarHeight; // keep bottom in place
    const squareTop  = bottomEdge - squareSize;

    overlay.style.transition = 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                'height 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                'top 0.5s cubic-bezier(0.4, 0, 0.2, 1), ' +
                                'border-radius 0.4s ease';
    overlay.style.width       = `${squareSize}px`;
    overlay.style.height      = `${squareSize}px`;
    overlay.style.top         = `${squareTop}px`;
    overlay.style.borderRadius = '0px';

    await wait(650);

    // Clean state before rolling
    overlay.style.transition = 'none';
    overlay.style.transform  = 'rotate(0deg)';
    overlay.offsetHeight;

    await wait(400);

    // -------------------------------------------------------
    // Wave 5: Square rolls side-to-side to center
    // -------------------------------------------------------

    const targetX = (localW / 2) - (squareSize / 2);

    await rollSquareToCenter(overlay, squareSize, targetX);

    // Square rests at center — stays visible permanently
    overlay.style.transition = 'none';

    return overlay;
  }

  // ============================================
  // Phase 21: Heatmap
  // ============================================

  /**
   * Generate a 52×7 array of activity levels (0–4) that mimics
   * realistic ChatGPT usage across a full year.
   *
   * Patterns baked in:
   *   – Weekdays (Mon–Fri) are busier than weekends
   *   – Activity ramps up from Jan, peaks mid-year, dips in summer, peaks again in fall
   *   – Some random "streak" weeks and quiet weeks
   */
  function generateActivityData() {
    const COLS = 52;
    const ROWS = 7; // Sun=0, Mon=1, … Sat=6

    // Monthly intensity curve (0–1) — busier in spring/fall, lighter in summer/winter edges
    const monthlyCurve = [
      0.35, 0.45, 0.60, 0.75, 0.85, 0.70,
      0.55, 0.50, 0.65, 0.80, 0.90, 0.60,
    ];

    const data = [];

    for (let col = 0; col < COLS; col++) {
      const week = [];
      // Map column to approximate month (0–11)
      const month = Math.min(11, Math.floor((col / COLS) * 12));
      const monthIntensity = monthlyCurve[month];

      // Occasional "streak week" boost or "quiet week" dip
      let weekBoost = 0;
      if (Math.random() < 0.12) weekBoost = 0.25;       // hot streak
      else if (Math.random() < 0.10) weekBoost = -0.20;  // quiet week

      for (let row = 0; row < ROWS; row++) {
        const isWeekend = (row === 0 || row === 6);
        const dayBase = isWeekend ? 0.25 : 0.65;

        const raw = dayBase * (monthIntensity + weekBoost) + (Math.random() * 0.35 - 0.10);
        const clamped = Math.max(0, Math.min(1, raw));

        // Quantize to 0–4
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
   *
   * The existing overlay cube is visually preserved throughout — we add
   * border-radius, then create a "phantom" clone on the viewport at its
   * exact screen position, hide the original, shrink the phantom to cell
   * size, and finally swap it for the real grid cell.  The audience never
   * sees a discontinuity.
   *
   * @param {HTMLElement} overlay         – the 36×36 cube from deconstructBarChart
   * @param {HTMLElement} graphContainer  – the graph container the overlay lives in
   */
  async function buildHeatmap(overlay, graphContainer) {
    const viewport = document.getElementById('viewport');

    const COLS = 52;
    const ROWS = 7;
    const CELL_SIZE = 14;
    const GAP = 3;
    const centerCol = Math.floor(COLS / 2);  // 26
    const centerRow = Math.floor(ROWS / 2);  // 3

    const activityData = generateActivityData();

    // Force the seed cell at center to be high-activity green
    activityData[centerCol][centerRow] = 4;

    // ---------------------------------------------------------
    // 21a-1  Round the existing overlay cube (visual continuity)
    // ---------------------------------------------------------

    overlay.style.transition = 'border-radius 0.4s ease';
    overlay.style.borderRadius = '6px';

    await wait(500);

    // ---------------------------------------------------------
    // 21a-2  Create "phantom" clone on viewport at overlay's
    //        exact screen position, then hide the original.
    //        The phantom lives outside the editor transform.
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
    phantom.style.borderRadius = `${6 * (overlayRect.width / 36)}px`; // scale the radius
    phantom.style.zIndex = '30';
    phantom.style.pointerEvents = 'none';
    viewport.appendChild(phantom);

    // Hide the original overlay — phantom is the visual stand-in
    overlay.style.transition = 'none';
    overlay.style.opacity = '0';

    // ---------------------------------------------------------
    // 21a-3  Build the full heatmap DOM (hidden) at scale(2.2)
    // ---------------------------------------------------------

    const heatmap = document.createElement('div');
    heatmap.className = 'heatmap';
    heatmap.style.opacity = '0';
    heatmap.style.transform = 'translate(-50%, -50%) scale(2.2)';

    // Grid area = day-labels + grid
    const gridArea = document.createElement('div');
    gridArea.className = 'heatmap__grid-area';

    // Day-of-week labels (left column)
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

    // The grid
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

        // Distance from center (for stagger delay)
        const dx = col - centerCol;
        const dy = row - centerRow;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Rain timing: near-center cells land first
        const baseDelay = dist * 25;
        const jit = (Math.random() * 300) - 150;
        const delay = Math.max(0, Math.min(3500, baseDelay + jit));

        // Fall duration varies slightly per cell
        const fallDuration = 400 + Math.random() * 200;

        if (isSeed) {
          // Seed — hidden for now; phantom is its stand-in
          cell.style.opacity = '0';
          cell.style.transform = 'translateY(0)';
          seedCell = cell;
        } else {
          // Start above the viewport
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

    // Month labels (below grid)
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthRow = document.createElement('div');
    monthRow.className = 'heatmap__month-labels';

    const colPx = CELL_SIZE + GAP;  // 17px per column
    const weeksPerMonth = COLS / 12;

    MONTHS.forEach(name => {
      const lbl = document.createElement('div');
      lbl.className = 'heatmap__month-label';
      lbl.textContent = name;
      lbl.style.width = `${Math.round(weeksPerMonth * colPx)}px`;
      monthRow.appendChild(lbl);
    });
    heatmap.appendChild(monthRow);

    // Append heatmap (invisible) and reflow so we can measure the seed cell
    viewport.appendChild(heatmap);
    heatmap.offsetHeight;

    // ---------------------------------------------------------
    // 21a-4  Shrink phantom to cell size and move to the center
    //        cell's position.  Fade out editor behind it.
    // ---------------------------------------------------------

    // Measure where the center grid cell sits on screen (at scale 2.2)
    const seedRect = seedCell.getBoundingClientRect();
    const targetLeft = seedRect.left - vpRect.left;
    const targetTop = seedRect.top - vpRect.top;
    const targetW = seedRect.width;   // ~14 * 2.2 ≈ 31px
    const targetH = seedRect.height;

    // Animate phantom → center cell position + size
    phantom.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'top 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'width 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'height 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
                               'border-radius 0.5s ease';
    phantom.style.left = `${targetLeft}px`;
    phantom.style.top = `${targetTop}px`;
    phantom.style.width = `${targetW}px`;
    phantom.style.height = `${targetH}px`;
    phantom.style.borderRadius = `${3 * 2.2}px`; // cell radius at 2.2× scale

    // Simultaneously fade out the editor
    editor.style.transition = 'opacity 0.5s ease';
    editor.style.opacity = '0';

    // Fade in the heatmap grid (seed cell still invisible — phantom covers it)
    heatmap.style.transition = 'opacity 0.5s ease';
    heatmap.style.opacity = '1';

    await wait(700);

    // ---------------------------------------------------------
    // 21a-5  Swap phantom for the real grid cell (seamless)
    // ---------------------------------------------------------

    seedCell.style.opacity = '1';
    phantom.remove();

    // ---------------------------------------------------------
    // 21b  Start rain — still zoomed in at 2.2×
    //       Only ~5×3 cells around center are visible
    // ---------------------------------------------------------

    // Set transitions on every non-seed cell, then trigger fall
    allCells.forEach(c => {
      if (!c.isSeed) {
        c.el.style.transition =
          `transform ${c.fallDuration}ms cubic-bezier(0.34, 1.56, 0.64, 1) ${c.delay}ms`;
      }
    });

    grid.offsetHeight; // force reflow so transitions apply from current state

    allCells.forEach(c => {
      if (!c.isSeed) {
        c.el.style.transform = 'translateY(0)';
      }
    });

    // ---------------------------------------------------------
    // 21c  Zoom out mid-rain (~1.2s in, over 1.2s)
    //       Camera pulls back to reveal full grid
    // ---------------------------------------------------------

    await wait(1200);

    heatmap.style.transition = 'transform 1.2s cubic-bezier(0.4, 0, 0.15, 1)';
    heatmap.style.transform = 'translate(-50%, -50%) scale(1.0)';

    // ---------------------------------------------------------
    // 21d  Wait for rain to complete
    //       Max delay is 3500ms + ~600ms fall = ~4100ms total.
    //       We've already waited 1200ms, so wait the remainder.
    // ---------------------------------------------------------

    const maxDelay = Math.max(...allCells.filter(c => !c.isSeed).map(c => c.delay));
    const maxFall = 600; // longest possible fall
    const totalRainMs = maxDelay + maxFall;
    const remaining = Math.max(0, totalRainMs - 1200);
    await wait(remaining + 100); // small buffer

    // ---------------------------------------------------------
    // 21e  Polish: fade in labels
    // ---------------------------------------------------------

    // Day-of-week labels (staggered)
    const dayLabelEls = dayLabelsEl.querySelectorAll('.heatmap__day-label');
    dayLabelEls.forEach((lbl, i) => {
      setTimeout(() => { lbl.style.opacity = '1'; }, i * 60);
    });

    // Month labels (staggered)
    const monthLabelEls = monthRow.querySelectorAll('.heatmap__month-label');
    monthLabelEls.forEach((lbl, i) => {
      setTimeout(() => { lbl.style.opacity = '1'; }, i * 50);
    });

    await wait(800);

    // GPU cleanup — also clear inline opacity so CSS classes
    // (like --faded, --dimmed) can take effect on ALL cells including the seed.
    allCells.forEach(c => {
      c.el.style.willChange = 'auto';
      c.el.style.transition = 'none';
      c.el.style.opacity = '';
    });

    // Return references for post-heatmap phases
    return { heatmap, grid, allCells, activityData, COLS, ROWS };
  }

  // ============================================
  // Phase 22: Active Days — Wave Reveal
  // ============================================

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
    // Build a per-column count so we can sync the counter to wave progress
    const cumulativeByCol = []; // cumulativeByCol[col] = total active days in cols 0..col
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

    // --- Build stat DOM (all children created upfront, hidden) ---
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

    // Position relative to the heatmap's grid-area
    heatmap.appendChild(stat);
    // Force layout so the browser registers initial hidden states
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

  // ============================================
  // Phase 23: Longest Streak — The Ribbon
  // ============================================

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
    // Flatten the grid into chronological order (col 0 row 0 = Jan 1 Sun,
    // col 0 row 1 = Jan 1 Mon, etc.)
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
    // Col = week number, row = day-of-week (0=Sun..6=Sat)
    const startDay = streakCells[0];
    const endDay = streakCells[streakCells.length - 1];
    const jan1 = new Date(2025, 0, 1);
    const jan1Dow = jan1.getDay(); // 0=Sun
    const startDate = new Date(2025, 0, 1 + (startDay.col * 7 + startDay.row) - jan1Dow);
    const endDate = new Date(2025, 0, 1 + (endDay.col * 7 + endDay.row) - jan1Dow);
    const fmtOpts = { month: 'short', day: 'numeric' };
    const dateStr = `${startDate.toLocaleDateString('en-US', fmtOpts)} – ${endDate.toLocaleDateString('en-US', fmtOpts)}`;

    // Build a Set for fast streak membership lookup
    const streakSet = new Set(streakCells.map(sc => `${sc.col},${sc.row}`));

    // Previous stat stays — don't touch it.

    // --- 1. Unhighlight: fade out every cell NOT in the streak ---
    // Collect non-streak cells and shuffle them randomly
    const nonStreakCells = allCells.filter(c => !streakSet.has(`${c.col},${c.row}`));

    // Fisher-Yates shuffle
    for (let i = nonStreakCells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonStreakCells[i], nonStreakCells[j]] = [nonStreakCells[j], nonStreakCells[i]];
    }

    // Stagger the fading — spread over ~1.5s, random order
    const fadeSpread = 1500;
    const perCellDelay = fadeSpread / nonStreakCells.length;

    nonStreakCells.forEach((c, i) => {
      setTimeout(() => {
        c.el.classList.add('heatmap__cell--faded');
      }, i * perCellDelay);
    });

    // Wait for the full fade spread + transition time
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

  // ============================================
  // Phase 24: Busiest Day — The Spotlight
  // ============================================

  /**
   * After the streak, fade the remaining visible cells randomly,
   * then spotlight the single busiest day. If that cell lives outside
   * the streak it gets un-faded; if it's inside, everything just
   * stays dim and the stat speaks for itself.
   *
   * The three stat cards rebalance into a left / center / right layout.
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
    // Map activity levels to plausible message counts
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

    // Fisher-Yates shuffle for asymmetric fade
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

    // --- 2. Highlight the busiest day cell (whether or not it was in the streak) ---
    const bCell = allCells.find(
      c => c.col === busiestCol && c.row === busiestRow
    );
    if (bCell) {
      // Step A: un-fade it — opacity animates from 0.1 → 1 over 0.8s
      bCell.el.classList.remove('heatmap__cell--faded', 'heatmap__cell--dimmed');
      bCell.el.classList.add('heatmap__cell--busiest');
    }

    // Step B: after it's become visible, gradually bring in the glow
    await wait(400);
    if (bCell) {
      bCell.el.classList.add('heatmap__cell--busiest-glow');
    }

    await wait(800);

    // --- 3. Rebalance to 3-stat layout (left / center / right) ---
    if (activeDaysResult && activeDaysResult.stat) {
      activeDaysResult.stat.style.transform =
        'translateX(calc(-50% - 200px))';
    }
    if (streakResult && streakResult.stat) {
      streakResult.stat.style.transform = 'translateX(-50%)';
    }

    await wait(400);

    // --- 4. Build + reveal the busiest-day stat on the right ---
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
    stat.offsetHeight; // force reflow

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

  // ============================================
  // Phase 25 — Launch busiest cell into the sky
  // ============================================
  // After the three-stat layout, this phase:
  //   1) Fades out all stat numbers above the heatmap
  //   2) Zooms into the glowing busiest-day cell
  //   3) Fades out every other cell so only the glow remains
  //   4) Breaks the cell out of the grid as a free-floating element
  //   5) Launches it spinning + shrinking + fading into the air

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
    // (It may have been faded if it was part of the streak.)
    busiestCell.el.classList.remove('heatmap__cell--faded', 'heatmap__cell--dimmed');
    busiestCell.el.classList.add('heatmap__cell--busiest');
    busiestCell.el.style.opacity = '1';

    // --- 3. Zoom the heatmap toward the busiest cell ---
    // The full grid stays visible — it only disappears when the heatmap falls away.
    const cellRect = busiestCell.el.getBoundingClientRect();
    const heatmapRect = heatmap.getBoundingClientRect();

    const heatmapCenterX = heatmapRect.left + heatmapRect.width / 2;
    const heatmapCenterY = heatmapRect.top + heatmapRect.height / 2;
    const cellCenterX = cellRect.left + cellRect.width / 2;
    const cellCenterY = cellRect.top + cellRect.height / 2;

    const offsetX = heatmapCenterX - cellCenterX;
    const offsetY = heatmapCenterY - cellCenterY;

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

    // Place a clone at the exact screen position BEFORE touching the heatmap
    const flyingCell = document.createElement('div');
    flyingCell.className = 'heatmap-flying-cell';
    flyingCell.style.left = `${finalCellRect.left}px`;
    flyingCell.style.top = `${finalCellRect.top}px`;
    flyingCell.style.width = `${finalCellRect.width}px`;
    flyingCell.style.height = `${finalCellRect.height}px`;

    const viewport = document.getElementById('viewport');
    viewport.appendChild(flyingCell);

    // Hide the busiest cell inside the heatmap so when the heatmap
    // falls away, no square falls with it.
    // (Must remove --busiest first — its !important opacity overrides inline styles)
    busiestCell.el.classList.remove('heatmap__cell--busiest', 'heatmap__cell--busiest-glow');
    busiestCell.el.style.transition = 'none';
    busiestCell.el.style.opacity = '0';
    busiestCell.el.style.visibility = 'hidden';

    // --- 6. Heatmap falls away downward (illusion the cell rises) ---
    // Small pause so the swap is seamless
    await wait(50);

    // --- 6a. Cell starts spinning in place while heatmap falls ---
    flyingCell.offsetHeight; // force reflow
    flyingCell.classList.add('heatmap-flying-cell--spinning');

    heatmap.style.transition = 'transform 1.8s cubic-bezier(0.55, 0, 1, 0.45), opacity 1.6s ease-in';
    heatmap.style.transform =
      `translate(calc(-50% + ${offsetX * zoomScale}px), calc(-50% + ${offsetY * zoomScale}px + 120vh)) scale(${zoomScale})`;
    heatmap.style.opacity = '0';

    // Wait for heatmap to be fully off screen
    await wait(2000);

    // --- 7. Stop spinning, centre the cell, clean up heatmap ---
    flyingCell.classList.remove('heatmap-flying-cell--spinning');
    flyingCell.offsetHeight; // force reflow

    // Move cell to screen centre (prep for morph in Phase 26)
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

  // ============================================
  // Phase 26: Square → circle word bubble morph
  // ============================================

  /**
   * Takes the flying emerald cell from Phase 25 and morphs it:
   *   square → circle → grow → reveal word + count → gentle float.
   *
   * @param {HTMLElement} cell — the heatmap-flying-cell element
   */
  // AI message about most-used words — with accented stats
  const WORDS_RESPONSE_PARTS = [
    { text: 'Here are your most used words of 2025. You said ' },
    { text: '"code"', cls: 'ai-accent' },
    { text: ' a staggering ' },
    { text: '3,700 times', cls: 'ai-accent' },
    { text: ' — that\'s roughly ' },
    { text: '10 times a day', cls: 'ai-accent--warm' },
    { text: '. Your vocabulary leaned heavily into ' },
    { text: 'technical problem-solving', cls: 'ai-accent' },
    { text: ', with ' },
    { text: '68%', cls: 'ai-accent--warm' },
    { text: ' of your top words being action verbs.' },
  ];

  async function morphCellToWordBubble(cell) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wordData = WORD_FREQUENCY_DATA[0]; // first word for now
    const targetSize = 180; // px — final circle diameter

    // --- Step 1: Morph square → circle ---
    cell.style.transition =
      'border-radius 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)';
    cell.style.borderRadius = '50%';

    await wait(900);

    // --- Step 2: Grow circle + morph style + bring back editor with header ---

    // Prepare the editor: reset transforms, show header, set up chat area
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    const sidebar = document.getElementById('sidebar');

    sidebar.classList.remove('editor__sidebar--open');
    editor.classList.remove('editor--sidebar-open');
    footer.style.display = 'none';
    editorMain.innerHTML = '';
    editorMain.style.justifyContent = 'flex-start';
    editorMain.style.alignItems = 'stretch';
    editorMain.style.overflow = 'hidden';

    // Create chat container for the AI message (sits at the top of main)
    chatMessages = document.createElement('div');
    chatMessages.className = 'chat-messages';
    chatMessages.style.paddingTop = '24px';
    editorMain.appendChild(chatMessages);

    // Reset editor to invisible
    editor.style.transition = 'none';
    editor.style.transform = 'none';
    editor.style.transformOrigin = '';
    editor.style.opacity = '0';
    header.style.transition = 'none';
    header.style.opacity = '1';
    editor.offsetHeight; // reflow

    // Grow the circle AND morph from solid fill → transparent border style
    cell.style.transition =
      'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'height 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'left 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'top 1.2s cubic-bezier(0.34, 1.56, 0.64, 1), ' +
      'background 1s ease, ' +
      'border 1s ease, ' +
      'box-shadow 1s ease';

    cell.style.width = `${targetSize}px`;
    cell.style.height = `${targetSize}px`;
    cell.style.left = `${(vw - targetSize) / 2}px`;
    cell.style.top = `${(vh - targetSize) / 2}px`;
    cell.style.background = 'rgba(16, 185, 129, 0.08)';
    cell.style.border = '2px solid rgba(16, 185, 129, 0.40)';
    cell.style.boxShadow =
      '0 0 20px rgba(16, 185, 129, 0.10), ' +
      'inset 0 0 20px rgba(16, 185, 129, 0.06)';

    // Simultaneously fade the editor (with header) back in
    editor.style.transition = 'opacity 1s ease';
    editor.style.opacity = '1';

    await wait(1400);

    // --- Step 3: Add word text + count inside the cell ---
    cell.style.display = 'flex';
    cell.style.flexDirection = 'column';
    cell.style.alignItems = 'center';
    cell.style.justifyContent = 'center';
    cell.style.overflow = 'hidden';

    const textEl = document.createElement('span');
    textEl.className = 'word-bubble__text';
    textEl.style.fontSize = '20px';
    textEl.textContent = wordData.word;
    cell.appendChild(textEl);

    const countEl = document.createElement('span');
    countEl.className = 'word-bubble__count';
    countEl.style.fontSize = '13px';
    countEl.textContent = wordData.displayCount;
    cell.appendChild(countEl);

    await wait(50);
    textEl.classList.add('word-bubble__text--visible');
    await wait(300);
    countEl.classList.add('word-bubble__count--visible');

    await wait(800);

    // --- Step 4: Thinking dots → AI message streams in + bubbles pop out ---

    const TOTAL_EXTRA = 5; // 5 more bubbles (6 total with the first)
    const viewport = document.getElementById('viewport');
    const allBubbles = [{ el: cell, txtEl: textEl, cntEl: countEl }];

    // Compute sizes for extra bubbles proportional to the first
    const bubbleMeta = [];
    for (let i = 1; i <= TOTAL_EXTRA; i++) {
      const d = WORD_FREQUENCY_DATA[i];
      const size = Math.round(targetSize * (d.count / wordData.count));
      bubbleMeta.push({ data: d, size });
    }

    // Pre-compute non-overlapping final positions using random placement
    // with collision rejection. Reserve the top 25% for the AI message.
    const placed = []; // { cx, cy, r } for collision checks
    const firstR = targetSize / 2;

    // Helper: find a random non-overlapping position within a tight cluster zone
    function findPosition(r) {
      const padding = 14; // min gap between edges
      // Constrain to a centred box: ~60% of width, between 30%-75% of height
      const zoneLeft   = vw * 0.20;
      const zoneRight  = vw * 0.80;
      const zoneTop    = vh * 0.30;
      const zoneBottom = vh * 0.75;
      let bestX, bestY, tries = 0;
      do {
        bestX = zoneLeft + r + Math.random() * (zoneRight - zoneLeft - 2 * r);
        bestY = zoneTop  + r + Math.random() * (zoneBottom - zoneTop - 2 * r);
        tries++;
        const overlaps = placed.some(p => {
          const dx = bestX - p.cx;
          const dy = bestY - p.cy;
          return Math.sqrt(dx * dx + dy * dy) < (r + p.r + padding);
        });
        if (!overlaps) break;
      } while (tries < 120);
      return { cx: bestX, cy: bestY };
    }

    // Place the first bubble
    const firstPos = findPosition(firstR);
    placed.push({ cx: firstPos.cx, cy: firstPos.cy, r: firstR });

    // Place all extra bubbles
    const extraPositions = [];
    for (const bm of bubbleMeta) {
      const r = bm.size / 2;
      const pos = findPosition(r);
      placed.push({ cx: pos.cx, cy: pos.cy, r });
      extraPositions.push(pos);
    }

    // Show thinking dots
    const thinking = document.createElement('div');
    thinking.className = 'chat-thinking';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'chat-thinking__dot';
      thinking.appendChild(dot);
    }
    chatMessages.appendChild(thinking);

    await wait(1500);
    thinking.classList.add('chat-thinking--intense');
    await wait(600);

    // Remove thinking dots
    thinking.style.transition = 'opacity 0.2s ease';
    thinking.style.opacity = '0';
    await wait(200);
    thinking.remove();

    // Create AI response element
    const response = document.createElement('div');
    response.className = 'chat-ai-response';

    const textContainer = document.createElement('span');
    response.appendChild(textContainer);

    const streamCursor = document.createElement('span');
    streamCursor.className = 'chat-ai-response__cursor';
    response.appendChild(streamCursor);

    chatMessages.appendChild(response);

    await wait(50);
    response.classList.add('chat-ai-response--visible');
    await wait(200);

    // First bubble stays where it is (centre of screen) until the drift phase.
    // Record its current centre so spawned bubbles originate from it.
    const firstCX = parseFloat(cell.style.left) + firstR;
    const firstCY = parseFloat(cell.style.top) + firstR;

    // --- Schedule bubble spawns at random points during streaming ---
    // Flatten the response text to count total "real" words for timing
    let totalWords = 0;
    for (const part of WORDS_RESPONSE_PARTS) {
      const ws = part.text.split(/(\s+)/);
      for (const w of ws) { if (w && w.trim()) totalWords++; }
    }

    // Pick random word indices at which to spawn each bubble
    const spawnAtWord = [];
    const spawnRange = Math.floor(totalWords * 0.85); // spread across first 85% of text
    const usedIndices = new Set();
    for (let i = 0; i < TOTAL_EXTRA; i++) {
      let idx;
      do {
        idx = 2 + Math.floor(Math.random() * spawnRange);
      } while (usedIndices.has(idx));
      usedIndices.add(idx);
      spawnAtWord.push(idx);
    }
    spawnAtWord.sort((a, b) => a - b);

    // Helper: create and launch a bubble
    let spawnIdx = 0;
    function spawnBubble() {
      if (spawnIdx >= TOTAL_EXTRA) return;
      const { data, size } = bubbleMeta[spawnIdx];
      const pos = extraPositions[spawnIdx];
      const r = size / 2;

      const bubble = document.createElement('div');
      bubble.style.position = 'fixed';
      bubble.style.borderRadius = '50%';
      bubble.style.zIndex = '100';
      bubble.style.willChange = 'transform, opacity';
      bubble.style.pointerEvents = 'none';
      bubble.style.display = 'flex';
      bubble.style.flexDirection = 'column';
      bubble.style.alignItems = 'center';
      bubble.style.justifyContent = 'center';
      bubble.style.overflow = 'hidden';
      bubble.style.background = 'rgba(16, 185, 129, 0.08)';
      bubble.style.border = '2px solid rgba(16, 185, 129, 0.40)';
      bubble.style.boxShadow =
        '0 0 20px rgba(16, 185, 129, 0.10), inset 0 0 20px rgba(16, 185, 129, 0.06)';

      // Start tiny at first bubble's centre (it stays put in the middle)
      bubble.style.width = '10px';
      bubble.style.height = '10px';
      bubble.style.left = `${firstCX - 5}px`;
      bubble.style.top = `${firstCY - 5}px`;
      bubble.style.opacity = '0';

      // Word text (hidden)
      const txtEl = document.createElement('span');
      txtEl.className = 'word-bubble__text';
      txtEl.style.fontSize = `${Math.max(12, Math.min(20, size * 0.14))}px`;
      txtEl.textContent = data.word;
      bubble.appendChild(txtEl);

      // Count label (hidden)
      const cntEl = document.createElement('span');
      cntEl.className = 'word-bubble__count';
      cntEl.style.fontSize = `${Math.max(9, size * 0.14 * 0.65)}px`;
      cntEl.textContent = data.displayCount;
      bubble.appendChild(cntEl);

      viewport.appendChild(bubble);
      bubble.offsetHeight; // reflow

      // Random travel duration for variety
      const travelTime = 0.8 + Math.random() * 0.6; // 0.8–1.4s

      bubble.style.transition =
        `width ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        `height ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        `left ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        `top ${travelTime}s cubic-bezier(0.34, 1.56, 0.64, 1), ` +
        'opacity 0.35s ease';
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${pos.cx - r}px`;
      bubble.style.top = `${pos.cy - r}px`;
      bubble.style.opacity = '1';

      allBubbles.push({ el: bubble, txtEl, cntEl });
      spawnIdx++;
    }

    // --- Stream text word by word, spawning bubbles at scheduled words ---
    let wordCount = 0;
    let nextSpawn = 0; // index into spawnAtWord

    for (const part of WORDS_RESPONSE_PARTS) {
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
          wordCount++;
          // Check if a bubble should spawn at this word
          if (nextSpawn < spawnAtWord.length && wordCount >= spawnAtWord[nextSpawn]) {
            spawnBubble();
            nextSpawn++;
          }
          await wait(jitter(55, 20));
        }
      }
    }

    // Spawn any remaining bubbles that didn't get triggered
    while (spawnIdx < TOTAL_EXTRA) {
      spawnBubble();
      await wait(200);
    }

    // Done streaming — hide cursor
    await wait(400);
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    await wait(800);

    // Wrap the response
    response.classList.add('chat-ai-response--wrapped');

    await wait(600);

    // --- Step 5: Reveal text + count on all extra bubbles ---
    for (let i = 1; i < allBubbles.length; i++) {
      const b = allBubbles[i];
      b.txtEl.classList.add('word-bubble__text--visible');
      await wait(80);
      b.cntEl.classList.add('word-bubble__count--visible');
      await wait(150);
    }

    await wait(1000);

    // --- Step 6: Gentle drift on all bubbles (first bubble stays where it is) ---
    function applyDrift(el) {
      const dx1 = (Math.random() - 0.5) * 40;
      const dy1 = (Math.random() - 0.5) * 30;
      const dx2 = (Math.random() - 0.5) * 35;
      const dy2 = (Math.random() - 0.5) * 25;
      el.style.setProperty('--drift-duration', `${6 + Math.random() * 4}s`);
      el.style.setProperty('--drift-delay', `${Math.random() * 2}s`);
      el.style.setProperty('--drift-x1', `${dx1}px`);
      el.style.setProperty('--drift-y1', `${dy1}px`);
      el.style.setProperty('--drift-x2', `${dx2}px`);
      el.style.setProperty('--drift-y2', `${dy2}px`);
      el.style.setProperty('--drift-x3', `${dx1 * 0.5}px`);
      el.style.setProperty('--drift-y3', `${dy1 * -0.6}px`);
      el.style.transition = 'none';
      el.offsetHeight;
      el.classList.add('word-bubble--drifting');
    }

    for (const b of allBubbles) {
      applyDrift(b.el);
    }

    // Hold while the viewer absorbs everything
    await wait(5000);

    // --- Step 7: Unbubble + fade AI text, drop bubbles, restore footer ---

    // Unbubble the AI response (matches existing pattern)
    response.classList.remove('chat-ai-response--wrapped');

    // Fade out the text content
    const responseText = response.querySelector('span');
    if (responseText) {
      responseText.style.transition = 'opacity 0.4s ease, max-height 0.6s ease';
      responseText.style.opacity = '0';
      setTimeout(() => {
        responseText.style.maxHeight = '0';
        responseText.style.overflow = 'hidden';
      }, 250);
    }

    // Hide the stream cursor
    streamCursor.classList.add('chat-ai-response__cursor--hidden');

    await wait(600);

    // Drop each bubble off the bottom with random stagger and velocity
    const dropOrder = [...allBubbles].sort(() => Math.random() - 0.5);

    for (const b of dropOrder) {
      const el = b.el;
      // Stop the drift animation
      el.classList.remove('word-bubble--drifting');
      el.style.animation = 'none';
      el.offsetHeight; // reflow

      const fallDuration = 0.8 + Math.random() * 0.6; // 0.8–1.4s
      const overshoot = vh + 100 + Math.random() * 200; // below viewport
      const drift = (Math.random() - 0.5) * 100; // slight horizontal drift

      el.style.transition =
        `top ${fallDuration}s cubic-bezier(0.55, 0, 1, 0.45), ` +
        `left ${fallDuration}s ease, ` +
        `opacity ${fallDuration * 0.6}s ease ${fallDuration * 0.4}s`;
      el.style.top = `${overshoot}px`;
      el.style.left = `${parseFloat(el.style.left) + drift}px`;
      el.style.opacity = '0';

      // Stagger between drops
      await wait(120 + Math.random() * 180);
    }

    // Wait for the last bubble to finish falling
    await wait(1600);

    // Clean up: remove all bubble elements
    for (const b of allBubbles) {
      b.el.remove();
    }

    // Fade out just the chat messages area (header stays visible)
    chatMessages.style.transition = 'opacity 0.5s ease';
    chatMessages.style.opacity = '0';
    await wait(500);
    chatMessages.remove();

    // Restore the footer (text field at the bottom)
    if (footer) {
      footer.style.display = '';
      footer.style.position = '';
      footer.style.bottom = '';
      footer.style.left = '';
      footer.style.right = '';
      footer.style.zIndex = '';
      footer.style.pointerEvents = '';
      footer.style.opacity = '0';
      footer.offsetHeight; // reflow
      footer.style.transition = 'opacity 0.4s ease';
      footer.style.opacity = '1';
      await wait(400);
      footer.style.transition = '';
      footer.style.opacity = '';
    }

    await wait(500);

    return allBubbles;
  }

  // ============================================
  // Phase 27: Cursor moves to image button
  // ============================================
  async function moveCursorToImageBtn() {
    const imageBtn = document.querySelector('.editor__attach-btn');
    const btnRect = imageBtn.getBoundingClientRect();

    // Show fake cursor near the centre of the main area
    const mainRect = editorMain.getBoundingClientRect();
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${mainRect.left + mainRect.width / 2}px`;
    fakeCursor.style.top = `${mainRect.top + mainRect.height * 0.6}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight; // reflow

    await wait(200);

    // Glide to the image button
    fakeCursor.style.transition =
      'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
    fakeCursor.style.top = `${btnRect.top + btnRect.height / 2 - 3}px`;

    await wait(650);
  }

  // ============================================
  // Phase 28: Grab icon, drag to drop zone → hand off
  // ============================================
  async function dragImageToCenter() {
    const imageBtn = document.querySelector('.editor__attach-btn');
    const btnRect = imageBtn.getBoundingClientRect();
    const mainRect = editorMain.getBoundingClientRect();

    // --- Grab hand SVG (replaces arrow cursor) ---
    const GRAB_SVG = '<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">'
      + '<path d="M7.5 9V5.5a1 1 0 0 1 2 0V9m0-4.5v-1a1 1 0 0 1 2 0V9m0-3.5a1 1 0 0 1 2 0V9'
      + 'm0 0v4.5a4 4 0 0 1-4 4h-1a4 4 0 0 1-4-4V8a1 1 0 0 1 2 0v1'
      + 'm0-2.5V5a1 1 0 0 1 2 0v4" stroke="white" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const origCursorSVG = fakeCursor.innerHTML;

    // 1. Change cursor to grab hand
    fakeCursor.innerHTML = GRAB_SVG;
    await wait(200);

    // 2. Pick up — create ghost icon over the button
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.style.width = '32px';
    ghost.style.height = '32px';
    ghost.innerHTML = imageBtn.querySelector('svg').outerHTML;
    ghost.style.left = `${btnRect.left + btnRect.width / 2 - 16}px`;
    ghost.style.top = `${btnRect.top + btnRect.height / 2 - 16}px`;
    ghost.style.transform = 'scale(1) rotate(0deg)';
    document.body.appendChild(ghost);
    ghost.offsetHeight; // reflow

    // Ghost appears, tilts, and scales up
    ghost.classList.add('drag-ghost--visible');
    ghost.style.transition = 'transform 0.25s ease';
    ghost.style.transform = 'scale(1.3) rotate(-5deg)';

    // Hide the original button icon — it's being "grabbed"
    imageBtn.style.transition = 'opacity 0.15s ease';
    imageBtn.style.opacity = '0';
    await wait(300);

    // 3. Drop zone appears in editor__main center
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';

    const dzIcon = document.createElement('div');
    dzIcon.className = 'drop-zone__icon';
    dzIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
      + '<rect x="3" y="3" width="18" height="18" rx="3"/>'
      + '<circle cx="8.5" cy="8.5" r="1.5"/>'
      + '<path d="M21 15l-5-5L5 21"/></svg>';

    const dzLabel = document.createElement('div');
    dzLabel.className = 'drop-zone__label';
    dzLabel.textContent = 'Drop to create';

    dropZone.appendChild(dzIcon);
    dropZone.appendChild(dzLabel);
    editorMain.appendChild(dropZone);
    dropZone.offsetHeight; // reflow
    dropZone.classList.add('drop-zone--visible');
    await wait(300);

    // 4. Drag ghost + cursor to center of drop zone
    const dropCenterX = mainRect.left + mainRect.width / 2;
    const dropCenterY = mainRect.top + mainRect.height / 2;

    // Animate cursor
    fakeCursor.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${dropCenterX - 10}px`;
    fakeCursor.style.top = `${dropCenterY - 10}px`;

    // Animate ghost
    ghost.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'transform 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    ghost.style.left = `${dropCenterX - 16}px`;
    ghost.style.top = `${dropCenterY - 16}px`;
    ghost.style.transform = 'scale(1.3) rotate(-5deg)';

    // Highlight drop zone as ghost approaches
    setTimeout(() => dropZone.classList.add('drop-zone--active'), 500);
    await wait(850);

    // 5. Drop — ghost shrinks and fades into the zone
    ghost.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    ghost.style.transform = 'scale(0.5) rotate(0deg)';
    ghost.style.opacity = '0';

    // Drop zone pulses
    dropZone.classList.add('drop-zone--pulse');
    await wait(300);

    // Clean up ghost
    ghost.remove();

    // Fade out drop zone
    dropZone.classList.remove('drop-zone--visible');
    dropZone.classList.remove('drop-zone--active');

    // Hide cursor and restore arrow SVG
    fakeCursor.classList.remove('fake-cursor--visible');
    await wait(300);
    fakeCursor.innerHTML = origCursorSVG;

    // Clean up drop zone
    dropZone.remove();

    // --- Hand off to image-unfold module ---
    // Icon stays hidden for the entire animation
    if (window.__imageUnfold && window.__imageUnfold.start) {
      await window.__imageUnfold.start();
    }

    // --- Drag icon back from center to the attach button ---
    const mainRect2 = editorMain.getBoundingClientRect();
    const centerX = mainRect2.left + mainRect2.width / 2;
    const centerY = mainRect2.top  + mainRect2.height / 2;
    const btnRect2 = imageBtn.getBoundingClientRect();

    // Show grab cursor at center (where the images were)
    fakeCursor.innerHTML = GRAB_SVG;
    fakeCursor.style.transition = 'none';
    fakeCursor.style.left = `${centerX - 10}px`;
    fakeCursor.style.top  = `${centerY - 10}px`;
    fakeCursor.classList.add('fake-cursor--visible');
    fakeCursor.offsetHeight;

    // Create ghost icon at center
    const ghost2 = document.createElement('div');
    ghost2.className = 'drag-ghost';
    ghost2.style.width  = '32px';
    ghost2.style.height = '32px';
    ghost2.innerHTML = imageBtn.querySelector('svg').outerHTML;
    ghost2.style.left = `${centerX - 16}px`;
    ghost2.style.top  = `${centerY - 16}px`;
    ghost2.style.transform = 'scale(1.3) rotate(-5deg)';
    document.body.appendChild(ghost2);
    ghost2.offsetHeight;
    ghost2.classList.add('drag-ghost--visible');

    await wait(400);

    // Drag cursor + ghost back to the attach button
    fakeCursor.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${btnRect2.left + btnRect2.width / 2 - 3}px`;
    fakeCursor.style.top  = `${btnRect2.top + btnRect2.height / 2 - 3}px`;

    ghost2.style.transition =
      'left 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'top 0.8s cubic-bezier(0.4, 0, 0.15, 1), ' +
      'transform 0.8s cubic-bezier(0.4, 0, 0.15, 1)';
    ghost2.style.left = `${btnRect2.left + btnRect2.width / 2 - 16}px`;
    ghost2.style.top  = `${btnRect2.top + btnRect2.height / 2 - 16}px`;
    ghost2.style.transform = 'scale(1) rotate(0deg)';

    await wait(850);

    // Release: ghost fades, real icon reappears
    ghost2.style.transition = 'opacity 0.2s ease';
    ghost2.style.opacity = '0';
    imageBtn.style.transition = 'opacity 0.2s ease';
    imageBtn.style.opacity = '1';
    await wait(250);

    ghost2.remove();

    // Switch cursor back to arrow and hide
    fakeCursor.innerHTML = origCursorSVG;
    fakeCursor.classList.remove('fake-cursor--visible');

    // Clean up
    imageBtn.style.transition = '';
    imageBtn.style.opacity = '';
  }

  // ============================================
  // Phase 29: Award Room — Final Summary Screen
  // ============================================
  // Placeholder stat data — swap in real values later
  const AWARD_STATS = [
    { value: 'Jan 12, 2023', label: 'Member Since',          color: 'purple',  isDate: true },
    { value: 847,            label: 'Conversations',          color: 'blue'    },
    { value: 20000,          label: 'Messages Sent',          color: 'white'   },
    { value: 42, suffix: 'days',  label: 'Longest Streak',   color: 'emerald' },
    { value: 73, suffix: 'times', label: 'Active After Midnight', color: 'amber' },
    { value: 24,             label: 'Topics Explored',        color: 'purple'  },
    { value: 211,            label: 'Images Generated',       color: 'blue'    },
    { value: 243,            label: 'Days Active',            color: 'emerald' },
  ];

  async function showAwardRoom() {
    const header = document.querySelector('.editor__header');
    const footer = document.querySelector('.editor__footer');
    const viewport = document.getElementById('viewport');

    // --- 1. Fade out header & footer (same pattern used throughout) ---
    if (header) {
      header.style.transition = 'opacity 0.5s ease';
      header.style.opacity = '0';
    }
    if (footer) {
      footer.style.transition = 'opacity 0.5s ease';
      footer.style.opacity = '0';
      footer.style.pointerEvents = 'none';
    }
    await wait(500);

    // Hide them from layout so the award room has full space
    if (header) header.style.display = 'none';
    if (footer) footer.style.display = 'none';

    await wait(200);

    // --- 2. Build the award room DOM ---
    const roomEl = document.createElement('div');
    roomEl.className = 'award-room';

    const inner = document.createElement('div');
    inner.className = 'award-room__inner';

    // Hero
    const hero = document.createElement('div');
    hero.className = 'award-room__hero';

    const glowEl = document.createElement('div');
    glowEl.className = 'award-room__glow';
    hero.appendChild(glowEl);

    const titleEl = document.createElement('h2');
    titleEl.className = 'award-room__title';
    titleEl.textContent = 'Your Year with ChatGPT';
    hero.appendChild(titleEl);

    const joinedEl = document.createElement('p');
    joinedEl.className = 'award-room__joined';
    joinedEl.textContent = 'Member since Jan 12, 2023';
    hero.appendChild(joinedEl);

    inner.appendChild(hero);

    // Stats grid
    const grid = document.createElement('div');
    grid.className = 'award-room__grid';

    const cardEls = [];
    const numberEls = [];

    AWARD_STATS.forEach((stat) => {
      const card = document.createElement('div');
      card.className = 'award-card';

      const number = document.createElement('div');
      number.className = `award-card__number award-card__number--${stat.color}`;
      if (stat.isDate) {
        number.textContent = stat.value;
        number.style.fontSize = 'clamp(18px, 4vw, 26px)';
        number.style.fontWeight = '700';
        number.style.letterSpacing = '-0.01em';
      } else {
        number.textContent = '0';
      }
      card.appendChild(number);

      if (stat.suffix && !stat.isDate) {
        const suf = document.createElement('span');
        suf.className = 'award-card__suffix';
        suf.textContent = ' ' + stat.suffix;
        number.appendChild(suf);
      }

      const label = document.createElement('div');
      label.className = 'award-card__label';
      label.textContent = stat.label;
      card.appendChild(label);

      grid.appendChild(card);
      cardEls.push(card);
      numberEls.push({ el: number, stat });
    });

    inner.appendChild(grid);

    // Download Video CTA
    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'award-room__cta-wrap';

    const btn = document.createElement('button');
    btn.className = 'award-room__download-btn';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>'
      + '<polyline points="7 10 12 15 17 10"/>'
      + '<line x1="12" y1="15" x2="12" y2="3"/>'
      + '</svg>'
      + 'Download Video';
    ctaWrap.appendChild(btn);

    const tagline = document.createElement('div');
    tagline.className = 'award-room__tagline';
    tagline.textContent = 'Share your ChatGPT story';
    ctaWrap.appendChild(tagline);

    inner.appendChild(ctaWrap);
    roomEl.appendChild(inner);
    viewport.appendChild(roomEl);

    // --- 3. Staggered reveal ---
    void roomEl.offsetWidth; // reflow so opacity:0 registers

    // Overlay fade in
    roomEl.style.transition = 'opacity 0.6s ease';
    roomEl.style.opacity = '1';
    await wait(600);

    // Glow
    glowEl.style.transition = 'opacity 0.8s ease';
    glowEl.style.opacity = '1';

    // Title
    titleEl.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    titleEl.style.opacity = '1';
    titleEl.style.transform = 'translateY(0)';
    await wait(300);

    // Joined date
    joinedEl.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
    joinedEl.style.opacity = '1';
    joinedEl.style.transform = 'translateY(0)';
    await wait(400);

    // Cards stagger in
    for (let i = 0; i < cardEls.length; i++) {
      const card = cardEls[i];
      const { el, stat } = numberEls[i];

      card.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
      card.style.opacity = '1';
      card.style.transform = 'scale(1) translateY(0)';

      // Count up numbers (skip date card)
      if (!stat.isDate) {
        const suffix = el.querySelector('.award-card__suffix');
        animateCount(el, stat.value, '', 600 + i * 50);
        if (suffix) {
          await wait(20);
          el.appendChild(suffix);
        }
      }

      await wait(120);
    }

    await wait(300);

    // Download button
    ctaWrap.style.transition = 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
    ctaWrap.style.opacity = '1';
    ctaWrap.style.transform = 'translateY(0)';
  }

  // ============================================
  // Master sequence
  // ============================================
  async function run() {
    await wait(1500);                           // Idle
    await typePrompt();                         // Type
    await wait(400);                            // Pause
    await moveCursorToSend();                   // Cursor → send
    await clickSend();                          // Click
    await sendMessage();                        // Zoom out + bubble
    const dots = await showThinkingDots();      // Thinking dots
    const resp = await streamAIResponse(dots);  // AI streams response
    await highlightResponse(resp);              // Wrap → grow → zoom
    // --- Old phases 7a-7g (extracted to image-phases-backup.js) ---
    // const { imageContainer, maxBtn } = await showImageGeneration();
    // await moveCursorToMaxBtn(maxBtn);
    // await clickMaxBtn(maxBtn);
    // await expandImage(imageContainer);
    // await hoverTopBars(imageContainer);
    // await collapseImage(imageContainer);

    // --- New: dot draws the activity line graph ---
    await dotDrawsGraph(resp);
    await cascadeMessages();                    // Ghost bubbles cascade
    await compressAndBlur();                    // Blur + compress
    await showHeroStat();                       // Hero stat: 20,000
    await morphToConversations();               // 20,000 → 847 conversations
    await transitionToSidebar();                // Scroll up, cursor → sidebar
    const sidebarItems = await openSidebar();   // Sidebar slides in
    const chartData = await groupConversations(sidebarItems); // Group into topics

    // // --- Growth insight loop ---
    await collapseBarChart(chartData);          // Phase 15: bars collapse
    await cursorToInput();                      // Phase 16a: cursor → input
    await typeNewPrompt(GROWTH_DATA.prompt);    // Phase 16b: type prompt
    await wait(200);
    await moveCursorToSend();                   // Cursor → send
    await clickSend();                          // Click send
    await sendNewMessage();                     // Zoom out + bubble
    const growthRefs = await showGrowthInsight(GROWTH_DATA); // Phase 17-18: message → graph → zoom

    // --- Phase 19: Graph transition ---
    await wait(2000);                                         // Let user absorb
    await transitionToNextChart(growthRefs, GROWTH_PHASE_2);  // Unwrite → morph → restream
    await wait(3000);                                         // Hold on final state

    // --- Phase 20: Bar chart → Pixar cube ---
    const heatmapOverlay = await deconstructBarChart(growthRefs); // Deconstruct → cube roll

    // --- Phase 21: Heatmap rain ---
    await wait(800);                                              // Let cube rest
    const heatmapRefs = await buildHeatmap(heatmapOverlay, growthRefs.graphContainer); // Cube → heatmap

    // --- Phase 22: Active days wave reveal ---
    const activeDaysResult = await revealActiveDays(heatmapRefs);

    // --- Phase 23: Longest streak ---
    const streakResult = await revealLongestStreak(heatmapRefs, activeDaysResult);

    // --- Phase 24: Busiest day ---
    const busiestResult = await revealBusiestDay(heatmapRefs, {
      activeDays: activeDaysResult,
      streak: streakResult,
    });

    // --- Phase 25: Launch busiest cell (returns the flying cell) ---
    const flyingCell = await launchBusiestCell(heatmapRefs, busiestResult);

    // --- Phase 26: Morph the cell into a word bubble ---
    await morphCellToWordBubble(flyingCell);

    // --- Phase 27-28: Cursor grabs image icon, drags to drop zone ---
    await moveCursorToImageBtn();
    await dragImageToCenter();

    // --- Phase 29: Award room — fade header/footer, reveal summary ---
    await showAwardRoom();
  }

  // Skip auto-run when loaded from a test harness
  // Set window.__editorTestMode = true BEFORE loading this script to prevent auto-run.
  if (!window.__editorTestMode) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run);
    } else {
      run();
    }
  }

  window.__editor = {
    run,
    // Exposed for test harnesses
    generateActivityData,
    buildHeatmap,
    revealActiveDays,
    revealLongestStreak,
    revealBusiestDay,
    launchBusiestCell,
    morphCellToWordBubble,
    showAwardRoom,
    wait,
    formatNumber,
    animateCounter,
  };
})();
