/* ============================================
   Phase 14: Group conversations into topics
   Sidebar stays visible; clones are "pulled out"
   one-by-one like dealing cards, then organized
   by topic. Sidebar closes afterward.
   ============================================ */
window.__editorPhases = window.__editorPhases || {};

window.__editorPhases.groupConversations = (() => {
  'use strict';

  const CFG   = window.__editorConfig;
  const H     = window.__editorHelpers;
  const STATE = window.__editorState;

  const { wait, animateCount } = H;
  const { TOPIC_COLORS, CATEGORY_MESSAGES, TOPIC_DETAILS } = CFG;

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

  return groupConversations;
})();
