/* ============================================
   Phase 14: Group conversations into topics
   Sidebar items get color-highlighted, then the
   sidebar closes.  Clones fly from the items'
   last positions into topic columns across the
   full-width main area, then morph into bar charts.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.groupConversations = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, animateCount } = H;
  const { TOPIC_COLORS, CATEGORY_MESSAGES, TOPIC_DETAILS } = CFG;
  const T = CFG.TIMINGS.PHASE_14;

  async function groupConversations(sidebarItems) {
    const { editor, editorMain } = STATE.dom;

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
      await wait(T.HIGHLIGHT_STAGGER);
    }

    // Hold so user can see the color grouping
    await wait(T.HIGHLIGHT_HOLD);

    // --- Step 2a: Create clones on top of the real items (while sidebar is visible) ---
    // Clones are position:fixed on <body>, so they won't move when the sidebar slides away.
    // They get an OPAQUE background (topic color composited over the sidebar's #171717)
    // so they look identical with or without the sidebar panel behind them.
    function opaqueOverSidebar(rgbaStr) {
      // Parse "rgba(r, g, b, a)" and composite over #171717 (23, 23, 23)
      const m = rgbaStr.match(/[\d.]+/g);
      if (!m || m.length < 4) return rgbaStr;
      const [r, g, b, a] = m.map(Number);
      const base = 23; // #171717
      const cr = Math.round(r * a + base * (1 - a));
      const cg = Math.round(g * a + base * (1 - a));
      const cb = Math.round(b * a + base * (1 - a));
      return `rgb(${cr}, ${cg}, ${cb})`;
    }

    const cloneData = [];   // { clone, topic }
    for (let i = 0; i < sidebarItems.length; i++) {
      const item  = sidebarItems[i];
      const topic = item.dataset.topic;
      const color = TOPIC_COLORS[topic];
      const rect  = item.getBoundingClientRect();

      const clone = document.createElement('div');
      clone.className = 'topic-clone';
      clone.textContent = item.textContent;
      clone.style.position = 'fixed';
      clone.style.left   = `${rect.left}px`;
      clone.style.top    = `${rect.top}px`;
      clone.style.width  = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      // Match sidebar__item typography so the swap is invisible
      clone.style.fontSize   = '13px';
      clone.style.fontWeight = '500';
      clone.style.padding    = '8px 10px';
      clone.style.borderRadius = '8px';
      clone.style.lineHeight = '1.3';
      clone.style.boxShadow  = 'none';
      clone.style.display    = 'flex';
      clone.style.alignItems = 'center';
      clone.style.boxSizing  = 'border-box';
      clone.style.overflow   = 'hidden';
      clone.style.whiteSpace = 'nowrap';
      clone.style.textOverflow = 'ellipsis';
      if (color) {
        clone.style.borderLeft = `3px solid ${color.text}`;
        clone.style.background = opaqueOverSidebar(color.bg);
        clone.style.color = 'rgba(255, 255, 255, 0.85)';
      }
      document.body.appendChild(clone);
      cloneData.push({ clone, topic });
    }

    // --- Step 2b: Hide real items, then slide the sidebar closed ---
    // Clones are now covering every item. Hide the originals so when the
    // sidebar panel slides left only the empty dark bar moves — the clones
    // (on document.body) stay exactly where they are.
    const sidebarList = document.getElementById('sidebar-list');
    sidebarList.style.visibility = 'hidden';

    // Normal slide-close — CSS transition handles the animation
    sidebar.classList.remove('editor__sidebar--open');
    editor.classList.remove('editor--sidebar-open');
    await wait(T.SIDEBAR_CLOSE_WAIT);

    // Restore visibility for future sidebar opens
    sidebarList.style.visibility = '';

    // --- Pre-compute topic layout ---
    // Sidebar overlays (no margin push), so mainRect is already full-width.
    const topicCounts = {};
    for (const item of sidebarItems) {
      const t = item.dataset.topic;
      topicCounts[t] = (topicCounts[t] || 0) + 1;
    }
    const rankedTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([topic], i) => ({ topic, rank: i + 1 }));

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

    // --- Step 2c: Fly clones to their target columns (staggered) ---
    for (let i = 0; i < cloneData.length; i++) {
      const { clone, topic } = cloneData[i];

      // Force reflow so the clone animates from its current position
      clone.offsetHeight;

      const target  = topicTargets[topic];
      const targetX = target.centerX - (colWidth - 16) / 2;
      const targetY = target.startY + 24 + target.nextSlot * 30;
      target.nextSlot++;

      clone.style.transition = 'left 0.7s cubic-bezier(0.4, 0, 0.15, 1), top 0.7s cubic-bezier(0.4, 0, 0.15, 1), width 0.7s ease, height 0.7s ease';
      clone.style.left   = `${targetX}px`;
      clone.style.top    = `${targetY}px`;
      clone.style.width  = `${colWidth - 16}px`;
      clone.style.height = '24px';

      allClones.push({ clone, topic });

      // Stagger — like dealing cards
      await wait(T.CLONE_FLY_STAGGER);
    }

    // Wait for the last clone's flight to finish
    await wait(T.CLONE_FLY_SETTLE);

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
      await wait(T.LABEL_STAGGER);
      lbl.classList.add('topic-column-label--visible');
    }

    // Hold so user can read the grouped view
    await wait(T.GROUPED_HOLD);

    // --- Step 6a: Merge clones into one bar per topic ---
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

    await wait(T.MERGE_SETTLE);

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

    await wait(T.MERGE_CLEANUP_WAIT);

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

    await wait(T.REPOSITION_SETTLE);

    // --- Step 6c: Grow bars proportionally (staggered) ---
    for (let i = 0; i < topicBars.length; i++) {
      const { bar, topic } = topicBars[i];
      const count = topicCounts[topic];
      const barWidth = (count / maxCount) * chartMaxWidth;

      bar.style.transition = 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'; // overshoot easing
      bar.style.width = `${barWidth}px`;

      await wait(T.BAR_GROW_STAGGER);
    }

    // Wait for the last bar to finish growing
    await wait(T.BAR_GROW_SETTLE);

    // --- Step 6d: Reveal labels around each bar ---
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
      await wait(T.LABEL_REVEAL_PRE);
      rankEl.classList.add('topic-bar__rank--visible');
      nameEl.classList.add('topic-bar__name--visible');
      msgEl.classList.add('topic-bar__messages--visible');
      animateCount(msgEl, messages, ' messages', T.COUNT_UP_DURATION);

      await wait(T.LABEL_REVEAL_POST);
    }

    // --- Step 6e: Subline ---
    await wait(T.SUBLINE_PRE_DELAY);
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
    await wait(T.SUBLINE_SETTLE);
    subline.classList.add('topic-bar__subline--visible');

    // Hold on the category bar chart
    await wait(T.CATEGORY_HOLD);

    // --- Step 6f: Morph bars from categories → specific topics ---

    // 6f-i: Fade out current labels
    for (const el of barLabelEls) {
      el.style.transition = 'opacity 0.3s ease';
      el.style.opacity = '0';
    }
    await wait(T.LABELS_FADE_OUT);

    // Remove old labels from DOM (but keep array reference for new ones)
    for (const el of barLabelEls) el.remove();
    barLabelEls.length = 0;

    // 6f-ii: Shrink bars to thin lines
    for (const { bar } of topicBars) {
      bar.style.transition = 'width 0.4s cubic-bezier(0.4, 0, 0.15, 1)';
      bar.style.width = '4px';
    }
    await wait(T.BARS_SHRINK);

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
    await wait(T.BARS_REPOSITION);

    // 6f-iv: Grow bars to new proportional widths (staggered)
    for (let i = 0; i < sortedTopics.length; i++) {
      const { bar } = topicBars[i];
      const topic = sortedTopics[i];
      const barWidth = (topic.messages / maxMessages) * topicChartMaxWidth;

      bar.style.transition = 'width 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)';
      bar.style.width = `${barWidth}px`;

      await wait(T.TOPIC_BAR_GROW_STAGGER);
    }

    // Wait for last bar to finish growing
    await wait(T.TOPIC_BAR_GROW_SETTLE);

    // 6f-v: Reveal new topic labels + message counts
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
      await wait(T.TOPIC_LABEL_PRE);
      rankEl.classList.add('topic-bar__rank--visible');
      nameEl.classList.add('topic-bar__name--visible');
      msgEl.classList.add('topic-bar__messages--visible');
      animateCount(msgEl, topic.messages, ' messages', T.COUNT_UP_DURATION);

      await wait(T.TOPIC_LABEL_POST);
    }

    // 6f-vi: New subline for topics
    await wait(T.TOPIC_SUBLINE_PRE);
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
    await wait(T.TOPIC_SUBLINE_SETTLE);
    topicSubline.classList.add('topic-bar__subline--visible');

    // Hold on the topic bar chart
    await wait(T.TOPIC_HOLD);

    // Return references for the next phase to collapse
    return { topicBars, barLabelEls, topicCounts, chartRect: editorMain.getBoundingClientRect() };
  }

  return groupConversations;
})();
