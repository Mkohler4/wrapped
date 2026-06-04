/* ============================================
   Image Phases Backup (7a-7g)
   ============================================
   Extracted from editor.js — original image generation,
   expand, hover, and collapse phases.
   These are preserved here for reference and can be
   re-integrated if needed.
   ============================================ */

// NOTE: These functions originally lived inside the editor IIFE
// and relied on closures over: editor, chatMessages, fakeCursor,
// USAGE_HOURS, wait(), jitter(), fmtHour(), msgCountForHour(),
// buildUsageVisualization().

// ============================================
// Usage-time visualization (iOS Screen Time style)
// ============================================

function buildUsageVisualization() {
  const peak = USAGE_HOURS.indexOf(Math.max(...USAGE_HOURS));

  const el = document.createElement('div');
  el.className = 'chat-ai-image__viz';

  // Header — chart title
  const header = document.createElement('div');
  header.className = 'viz__header';
  const titleEl = document.createElement('span');
  titleEl.className = 'viz__title';
  titleEl.textContent = 'Activity by Hour';
  header.appendChild(titleEl);
  el.appendChild(header);

  // Bar chart — 24 bars
  const chart = document.createElement('div');
  chart.className = 'viz__chart';
  for (let i = 0; i < 24; i++) {
    const v = USAGE_HOURS[i];
    const bar = document.createElement('div');
    bar.className = 'viz__bar';
    bar.dataset.hour = i;
    if (i === peak) {
      bar.dataset.peak = 'true';  // Mark it; don't highlight yet
    }
    const compactH = `${Math.max(v * 70, 3)}%`;
    bar.dataset.target = `${Math.max(v * 100, 3)}%`;
    bar.dataset.compact = compactH;
    bar.dataset.opacity = i === peak ? 1 : (0.3 + v * 0.7);
    // Start at zero height — bars will grow in when revealed
    bar.style.height = '0%';
    bar.style.opacity = '0';
    bar.style.transition = 'none';
    chart.appendChild(bar);
  }
  el.appendChild(chart);

  // Axis labels — positioned to match the actual bar positions
  const axis = document.createElement('div');
  axis.className = 'viz__axis';
  const axisLabels = [
    { text: '12AM', hour: 0 },
    { text: '6AM',  hour: 6 },
    { text: '12PM', hour: 12 },
    { text: '6PM',  hour: 18 },
  ];
  for (const { text, hour } of axisLabels) {
    const sp = document.createElement('span');
    sp.textContent = text;
    // Position each label under the correct bar: hour/24 of the width
    sp.style.left = `${(hour / 24) * 100}%`;
    axis.appendChild(sp);
  }
  el.appendChild(axis);

  return el;
}

// ============================================
// Phase 7a: ChatGPT image generation UI
// ============================================

async function showImageGeneration() {
  // Zoom back from the response so user sees the full chat
  editor.classList.remove('editor--zoomed-response');
  await wait(600);

  // Create the wrapper for label + image card
  const wrap = document.createElement('div');
  wrap.className = 'chat-ai-image-wrap';

  // Step 1: "Getting started" with loading dot
  const label = document.createElement('div');
  label.className = 'chat-ai-image-label';
  label.textContent = 'Getting started';
  wrap.appendChild(label);

  const dot = document.createElement('span');
  dot.className = 'chat-ai-image-dot';
  wrap.appendChild(dot);

  chatMessages.appendChild(wrap);

  // Fade in
  await wait(50);
  wrap.classList.add('chat-ai-image-wrap--visible');
  await wait(1800);

  // Step 2: Cross-fade to "Creating image" with card
  dot.classList.add('chat-ai-image-dot--hidden');
  label.style.transition = 'opacity 0.25s ease';
  label.style.opacity = '0';
  await wait(300);
  dot.remove();
  label.textContent = 'Creating image. May take a moment.';
  label.style.opacity = '1';
  await wait(250);

  // Image card container (thumbnail shape)
  const imageContainer = document.createElement('div');
  imageContainer.className = 'chat-ai-image';

  // Expand button (bottom-right corner) — diagonal expand icon
  const maxBtn = document.createElement('button');
  maxBtn.className = 'chat-ai-image__max-btn';
  maxBtn.setAttribute('aria-label', 'Expand');
  maxBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8.5 1h4.5v4.5M5.5 13H1V8.5M13 1L8 6M1 13l5-5"/></svg>`;
  imageContainer.appendChild(maxBtn);

  // The chart visualization in compact mode
  const viz = buildUsageVisualization();
  viz.classList.add('chat-ai-image__viz--compact');
  imageContainer.appendChild(viz);

  wrap.appendChild(imageContainer);

  // Shimmer plays automatically via CSS while blurred...

  // After a beat, trigger the blur-to-sharp reveal
  await wait(1200);
  imageContainer.classList.add('chat-ai-image--revealed');

  // Stagger bars growing up from zero as the blur clears
  const bars = imageContainer.querySelectorAll('.viz__bar');
  bars.forEach((bar, i) => {
    setTimeout(() => {
      bar.style.transition = 'height 0.7s cubic-bezier(0.4, 0, 0.15, 1), opacity 0.5s ease';
      bar.style.height = bar.dataset.compact;
      bar.style.opacity = bar.dataset.opacity;
    }, i * 25); // 25ms stagger per bar
  });

  // Let the reveal + bar animation play
  await wait(1600);

  // Very subtle glow pulse to signal "done generating"
  imageContainer.classList.add('chat-ai-image--glow');
  await wait(800);
  imageContainer.classList.remove('chat-ai-image--glow');

  // Smoothly collapse the label — opacity fades first, then height shrinks
  label.style.transition = '';  // Clear inline; let CSS class transitions take over
  label.style.opacity = '';
  label.offsetHeight;           // Force reflow so the class transition fires cleanly
  label.classList.add('chat-ai-image-label--hidden');
  await wait(500);

  // Gentle pulse on expand button to draw attention
  maxBtn.classList.add('chat-ai-image__max-btn--pulse');
  await wait(700);
  maxBtn.classList.remove('chat-ai-image__max-btn--pulse');

  return { imageContainer, maxBtn };
}

// ============================================
// Phase 7c: Fake cursor moves to maximize button
// ============================================
async function moveCursorToMaxBtn(maxBtn) {
  const btnRect = maxBtn.getBoundingClientRect();

  // Show the fake cursor at the image area (left side)
  const imgRect = maxBtn.closest('.chat-ai-image').getBoundingClientRect();
  fakeCursor.style.left = `${imgRect.left + imgRect.width * 0.5}px`;
  fakeCursor.style.top = `${imgRect.top + imgRect.height * 0.5}px`;
  fakeCursor.style.transition = 'none';
  fakeCursor.classList.add('fake-cursor--visible');
  fakeCursor.offsetHeight;

  // Animate to the maximize button centre
  fakeCursor.style.transition = 'left 0.6s cubic-bezier(0.4, 0, 0.15, 1), top 0.6s cubic-bezier(0.4, 0, 0.15, 1)';
  fakeCursor.style.left = `${btnRect.left + btnRect.width / 2 - 3}px`;
  fakeCursor.style.top = `${btnRect.top + btnRect.height / 2 - 3}px`;

  await wait(650);
}

// ============================================
// Phase 7d: Click the maximize button
// ============================================
async function clickMaxBtn(maxBtn) {
  // Press effect
  maxBtn.classList.add('chat-ai-image__max-btn--pressed');
  await wait(120);
  maxBtn.classList.remove('chat-ai-image__max-btn--pressed');
  await wait(100);

  // Hide the fake cursor
  fakeCursor.classList.remove('fake-cursor--visible');
  await wait(150);
}

// ============================================
// Phase 7e: Image expands in-place (inline card)
// ============================================
// The .chat-ai-image element stays in the DOM and grows
// from the pill shape into a contained card with the chart.

async function expandImage(imageEl) {
  // 1. Switch from compact to full layout (header/axis appear)
  const viz = imageEl.querySelector('.chat-ai-image__viz');
  if (viz) viz.classList.remove('chat-ai-image__viz--compact');

  // 2. Add expanded class — CSS transitions handle the growth
  imageEl.classList.add('chat-ai-image--expanded');

  // 3. Stagger bars to full heights after card starts growing
  const bars = imageEl.querySelectorAll('.viz__bar');
  setTimeout(() => {
    bars.forEach((bar, i) => {
      setTimeout(() => {
        bar.style.height = bar.dataset.target;
        bar.style.opacity = bar.dataset.opacity;
      }, i * 25);
    });
  }, 400);

  await wait(1200); // let card grow + bars animate
}

// ============================================
// Phase 7g: Image collapses back to pill
// ============================================
async function collapseImage(imageEl) {
  // Remove any tooltips, hover highlights, and badge
  imageEl.querySelectorAll('.viz__tooltip').forEach(t => t.remove());
  imageEl.querySelectorAll('.viz__bar--hovered').forEach(b => b.classList.remove('viz__bar--hovered'));
  imageEl.querySelectorAll('.viz__most-active').forEach(b => b.remove());
  const header = imageEl.querySelector('.viz__header');
  if (header) { header.style.transition = ''; header.style.opacity = ''; }

  // Reset bars to their compact heights
  const bars = imageEl.querySelectorAll('.viz__bar');
  bars.forEach(bar => {
    bar.style.height = bar.dataset.compact;
    bar.style.opacity = bar.dataset.opacity;
  });

  // Switch viz back to compact (hides header, shrinks padding)
  const viz = imageEl.querySelector('.chat-ai-image__viz');
  if (viz) viz.classList.add('chat-ai-image__viz--compact');

  // Remove expanded class — CSS transitions shrink it back
  imageEl.classList.remove('chat-ai-image--expanded');

  await wait(800); // match the 0.7s CSS transition
}

// ============================================
// Phase 7f: Cursor hovers over top 3 bars
// ============================================
async function hoverTopBars(imageEl) {
  // Find top 3 hours by value (sorted left-to-right by index)
  const indexed = USAGE_HOURS.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v);
  const top3 = indexed.slice(0, 3).sort((a, b) => a.i - b.i);
  const peakHourIdx = indexed[0].i;

  const bars = imageEl.querySelectorAll('.viz__bar');
  const chart = imageEl.querySelector('.viz__chart');
  if (!chart || bars.length === 0) return;

  // Show the fake cursor near the left side of the chart
  const chartRect = chart.getBoundingClientRect();
  fakeCursor.style.transition = 'none';
  fakeCursor.style.left = `${chartRect.left + chartRect.width * 0.2}px`;
  fakeCursor.style.top = `${chartRect.top + chartRect.height * 0.4}px`;
  fakeCursor.classList.add('fake-cursor--visible');
  fakeCursor.offsetHeight;
  await wait(250);

  let prevTooltip = null;
  let prevBar = null;

  for (let idx = 0; idx < top3.length; idx++) {
    const { i: hourIdx } = top3[idx];
    const bar = bars[hourIdx];
    if (!bar) continue;

    const barRect = bar.getBoundingClientRect();

    // Position cursor tip right at the top edge of the bar — natural hover
    fakeCursor.style.transition = 'left 0.55s cubic-bezier(0.4, 0, 0.15, 1), top 0.55s cubic-bezier(0.4, 0, 0.15, 1)';
    fakeCursor.style.left = `${barRect.left + barRect.width / 2 - 3}px`;
    fakeCursor.style.top = `${barRect.top - 3}px`;

    await wait(600);

    // Unhighlight previous bar (but if it's the peak, promote to peak styling)
    if (prevBar) {
      prevBar.classList.remove('viz__bar--hovered');
      if (prevBar.dataset.peak === 'true') {
        prevBar.classList.add('viz__bar--peak');
      }
    }
    bar.classList.add('viz__bar--hovered');
    prevBar = bar;

    // Fade out previous tooltip
    if (prevTooltip) {
      prevTooltip.classList.remove('viz__tooltip--visible');
      const old = prevTooltip;
      setTimeout(() => old.remove(), 300);
    }

    // Create tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'viz__tooltip';
    const hourSpan = document.createElement('span');
    hourSpan.className = 'viz__tooltip-hour';
    hourSpan.textContent = fmtHour(hourIdx);
    const countSpan = document.createElement('span');
    countSpan.className = 'viz__tooltip-count';
    countSpan.textContent = `${msgCountForHour(hourIdx).toLocaleString()} messages`;
    tooltip.appendChild(hourSpan);
    tooltip.appendChild(countSpan);
    bar.appendChild(tooltip);

    tooltip.offsetHeight;
    tooltip.classList.add('viz__tooltip--visible');
    prevTooltip = tooltip;

    // Hold on each bar — generous pause so user can read
    await wait(2000);
  }

  // Extra hold on the final (peak) tooltip
  await wait(1500);

  // Promote final bar to peak styling if applicable
  if (prevBar) {
    prevBar.classList.remove('viz__bar--hovered');
    if (prevBar.dataset.peak === 'true') {
      prevBar.classList.add('viz__bar--peak');
    }
  }

  // Hide cursor
  fakeCursor.classList.remove('fake-cursor--visible');
  await wait(400);

  // Cross-fade: hide chart title, show "Most Active Hour" badge in its place
  const viz = imageEl.querySelector('.chat-ai-image__viz');
  const header = imageEl.querySelector('.viz__header');
  if (header) {
    header.style.transition = 'opacity 0.3s ease';
    header.style.opacity = '0';
  }
  await wait(300);

  const badge = document.createElement('div');
  badge.className = 'viz__most-active';
  const badgeLabel = document.createElement('span');
  badgeLabel.className = 'viz__most-active-label';
  badgeLabel.textContent = 'Most active';
  const badgeHour = document.createElement('span');
  badgeHour.className = 'viz__most-active-hour';
  badgeHour.textContent = fmtHour(peakHourIdx);
  badge.appendChild(badgeLabel);
  badge.appendChild(badgeHour);
  viz.appendChild(badge);

  badge.offsetHeight;
  badge.classList.add('viz__most-active--visible');

  // Hold so user can take it in
  await wait(1800);
}
