// ============================================
// Debug Panel (Bug 0)
// ============================================

(function () {
  const PANEL_ID = 'debugPanel';

  function ensurePanel() {
    let panel = document.getElementById(PANEL_ID);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'debug-panel';
    panel.style.display = 'none';
    panel.style.pointerEvents = 'none';
    panel.innerHTML = `
      <div class="debug-panel-header">
        <div class="debug-panel-title">Debug Dashboard</div>
        <div class="debug-panel-actions">
          <button class="debug-panel-btn" id="debugCopyBtn">Copy Debug Data</button>
          <button class="debug-panel-close" id="debugCloseBtn" aria-label="Close">×</button>
        </div>
      </div>
      <div class="debug-panel-content" id="debugPanelContent"></div>
    `;

    document.body.appendChild(panel);

    const closeBtn = panel.querySelector('#debugCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => toggleDebugPanel(false));
    }

    const copyBtn = panel.querySelector('#debugCopyBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', copyDebugData);
    }

    return panel;
  }

  function formatNumber(value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  }

  function formatPercent(value) {
    if (value === null || value === undefined) return '—';
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return '—';
    return `${num.toFixed(1)}%`;
  }

  function safeText(value) {
    if (value === null || value === undefined) return '—';
    const str = String(value);
    return str.replace(/[&<>"']/g, (ch) => {
      switch (ch) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return ch;
      }
    });
  }

  function getGlobal(name, fallback) {
    if (typeof window[name] !== 'undefined') return window[name];
    if (typeof globalThis !== 'undefined' && typeof globalThis[name] !== 'undefined') return globalThis[name];
    return fallback;
  }

  function buildTopicBreakdown(stats) {
    const topics = stats?.topics || [];
    const totalConvos = stats?.totalConversations || 0;

    if (!topics.length) {
      return `<div class="debug-row"><span class="debug-label">No topics detected</span><span class="debug-value">—</span></div>`;
    }

    return topics
      .map(([topic, count], idx) => {
        const pct = totalConvos > 0 ? (count / totalConvos) * 100 : 0;
        const isGeneral = idx === 0 && ['general', 'other'].includes(String(topic).toLowerCase());
        return `
          <div class="debug-list ${isGeneral ? 'debug-topic-danger' : ''}">
            <div class="debug-row">
              <span class="debug-label">${safeText(topic)}</span>
              <span class="debug-value">${formatNumber(count)} (${formatPercent(pct)})</span>
            </div>
            <div class="debug-topic-bar">
              <div class="debug-topic-bar-fill" style="width: ${Math.min(100, pct).toFixed(1)}%"></div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  function buildAchievementsSnapshot(stats, imageStats, heatmapData) {
    const heatmapStreak = heatmapData?.stats?.longestStreak;
    const heatmapActive = heatmapData?.stats?.activeDays;

    const firstDate = stats?.firstDate ?? stats?.firstMessage ?? stats?.firstConversationDate;

    return `
      <div class="debug-kv">
        <span class="debug-label">stats.enhanced.longestStreak</span>
        <span class="debug-value">${formatNumber(stats?.enhanced?.longestStreak)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">stats.streaks.longestStreak</span>
        <span class="debug-value">${formatNumber(stats?.streaks?.longestStreak)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">heatmapData.stats.longestStreak</span>
        <span class="debug-value">${formatNumber(heatmapStreak)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">stats.enhanced.totalActiveDays</span>
        <span class="debug-value">${formatNumber(stats?.enhanced?.totalActiveDays)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">stats.streaks.totalActiveDays</span>
        <span class="debug-value">${formatNumber(stats?.streaks?.totalActiveDays)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">heatmapData.stats.activeDays</span>
        <span class="debug-value">${formatNumber(heatmapActive)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">stats.firstDate</span>
        <span class="debug-value">${safeText(firstDate)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">imageStats.generated</span>
        <span class="debug-value">${formatNumber(imageStats?.generated)}</span>
      </div>
    `;
  }

  function buildAiInsightsSnapshot(aiInsights, stats) {
    return `
      <div class="debug-kv">
        <span class="debug-label">personality.title</span>
        <span class="debug-value">${safeText(aiInsights?.personality?.title || aiInsights?.personality)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">personality.subtitle</span>
        <span class="debug-value">${safeText(aiInsights?.personality?.subtitle)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">spiritAnimal</span>
        <span class="debug-value">${safeText(aiInsights?.spiritAnimal?.animal || aiInsights?.spiritAnimal)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">spiritAnimal.reason</span>
        <span class="debug-value">${safeText(aiInsights?.spiritAnimal?.reason)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">topObsession.topic</span>
        <span class="debug-value">${safeText(aiInsights?.topObsession?.topic || stats?.topics?.[0]?.[0])}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">oneLineRoast</span>
        <span class="debug-value">${safeText(aiInsights?.oneLineRoast || aiInsights?.roastPoint)}</span>
      </div>
      <div class="debug-kv">
        <span class="debug-label">compliment</span>
        <span class="debug-value">${safeText(aiInsights?.compliment || aiInsights?.complimentPoint)}</span>
      </div>
    `;
  }

  function buildAchievementResults(stats, imageStats) {
    if (typeof window.getAchievementDefinitions !== 'function') {
      return `<div class="debug-row"><span class="debug-label">Achievement definitions not loaded</span><span class="debug-value">—</span></div>`;
    }

    const definitions = window.getAchievementDefinitions(stats || {});
    return definitions
      .map((def) => {
        const currentValue = def.currentValue ?? 0;
        const tiers = Array.isArray(def.tiers) ? def.tiers.slice() : [];
        const ordered = def.isYearBased ? tiers.slice().sort((a, b) => a.threshold - b.threshold) : tiers;
        const tier = ordered.find((t) => (def.isYearBased ? currentValue <= t.threshold : currentValue >= t.threshold));
        const threshold = tier ? tier.threshold : ordered?.[0]?.threshold;
        const unlocked = !!tier;
        return `
          <div class="debug-kv">
            <span class="debug-label">${unlocked ? '✓' : '✗'} ${def.id}</span>
            <span class="debug-value">${formatNumber(currentValue)} / ${formatNumber(threshold)}</span>
          </div>
        `;
      })
      .join('');
  }

  function buildDebugData() {
    const stats = getGlobal('stats', null);
    const aiInsights = getGlobal('aiInsights', null);
    const imagePrompts = getGlobal('imagePrompts', []);
    const imageStats = getGlobal('imageStats', null);
    const heatmapData = getGlobal('heatmapData', null);
    const discoveredThemes = getGlobal('discoveredThemes', []);

    return {
      stats,
      aiInsights,
      imagePromptsCount: imagePrompts?.length || 0,
      imageStats,
      heatmapStats: heatmapData?.stats || null,
      discoveredThemes: (discoveredThemes || []).map((t) => ({
        name: t.name,
        messageCount: t.messageCount,
      })),
    };
  }

  function renderDebugPanel() {
    const panel = ensurePanel();
    const contentEl = panel.querySelector('#debugPanelContent');
    if (!contentEl) return;

    const stats = getGlobal('stats', null);
    const aiInsights = getGlobal('aiInsights', null);
    const imagePrompts = getGlobal('imagePrompts', []);
    const imageStats = getGlobal('imageStats', null);
    const heatmapData = getGlobal('heatmapData', null);

    contentEl.innerHTML = `
      <div class="debug-section" data-section="raw">
        <div class="debug-section-title">Raw Stats</div>
        <div class="debug-row"><span class="debug-label">Total Conversations</span><span class="debug-value">${formatNumber(stats?.totalConversations)}</span></div>
        <div class="debug-row"><span class="debug-label">Total Messages</span><span class="debug-value">${formatNumber(stats?.totalMessages)}</span></div>
        <div class="debug-row"><span class="debug-label">User Messages</span><span class="debug-value">${formatNumber(stats?.userMessages)}</span></div>
        <div class="debug-row"><span class="debug-label">Code Blocks</span><span class="debug-value">${formatNumber(stats?.codeBlocks)}</span></div>
        <div class="debug-row"><span class="debug-label">Images Detected</span><span class="debug-value">${formatNumber(stats?.images)}</span></div>
        <div class="debug-row"><span class="debug-label">Peak Hour</span><span class="debug-value">${safeText(stats?.peakHour)}</span></div>
      </div>

      <div class="debug-section" data-section="topics">
        <div class="debug-section-title">Topic Breakdown</div>
        ${buildTopicBreakdown(stats)}
      </div>

      <div class="debug-section" data-section="images">
        <div class="debug-section-title">Image Detection</div>
        <div class="debug-row"><span class="debug-label">imagePrompts.length</span><span class="debug-value">${formatNumber(imagePrompts?.length)}</span></div>
        <div class="debug-row"><span class="debug-label">imageStats</span><span class="debug-value">${safeText(imageStats ? JSON.stringify(imageStats) : '—')}</span></div>
      </div>

      <div class="debug-section" data-section="achievements-sources">
        <div class="debug-section-title">Achievement Data Sources</div>
        ${buildAchievementsSnapshot(stats, imageStats, heatmapData)}
      </div>

      <div class="debug-section" data-section="insights">
        <div class="debug-section-title">AI Insights</div>
        ${buildAiInsightsSnapshot(aiInsights, stats)}
      </div>

      <div class="debug-section" data-section="achievements-results">
        <div class="debug-section-title">Achievement Results</div>
        ${buildAchievementResults(stats, imageStats)}
      </div>
    `;
  }

  function copyDebugData() {
    const debugData = buildDebugData();
    const payload = JSON.stringify(debugData, null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(payload);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = payload;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  function toggleDebugPanel(forceState) {
    const panel = ensurePanel();
    const isOpen = panel.classList.contains('is-open');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : !isOpen;
    if (shouldOpen) {
      renderDebugPanel();
      panel.style.display = 'block';
      panel.style.pointerEvents = 'auto';
      requestAnimationFrame(() => {
        panel.classList.add('is-open');
      });
    } else {
      panel.classList.remove('is-open');
      panel.style.pointerEvents = 'none';
      panel.style.display = 'none';
    }
  }

  function focusDebugSection(sectionKey) {
    const panel = document.getElementById(PANEL_ID);
    if (!panel || !panel.classList.contains('is-open')) return;
    const contentEl = panel.querySelector('#debugPanelContent');
    if (!contentEl) return;
    const target = contentEl.querySelector(`[data-section="${sectionKey}"]`);
    contentEl.querySelectorAll('.debug-section.is-active').forEach((section) => {
      section.classList.remove('is-active');
    });
    if (target) {
      target.classList.add('is-active');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  window.toggleDebugPanel = toggleDebugPanel;
  window.refreshDebugPanel = renderDebugPanel;
  window.focusDebugSection = focusDebugSection;

  // Panel is created lazily on first toggle to avoid any UI interference.
})();
